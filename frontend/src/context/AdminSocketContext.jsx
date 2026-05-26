import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { createOrderSocket } from '../lib/socket.js';
import { money } from '../lib/format.js';

// One shared socket connection for the whole admin portal.
// Live order events arrive here site-wide — so an admin viewing the
// Dashboard, Reports, etc. still gets a toast + audio ping the moment a
// new order is placed in their branch.
const SocketContext = createContext({ socket: null });
export const useAdminSocket = () => useContext(SocketContext);

// Tiny WebAudio "ping" — no asset required. Browsers block audio until
// the user has interacted with the page; by the time an admin reaches
// /admin they've already clicked Sign in, so this plays cleanly.
let audioCtx = null;
function playPing() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.start(t);
    osc.stop(t + 0.45);
  } catch {
    /* autoplay blocked — silently ignore */
  }
}

const TOAST_TTL = 9000;

export function AdminSocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return undefined;
    }
    const s = createOrderSocket();
    setSocket(s);

    const onNew = (order) => {
      playPing();
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, order }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), TOAST_TTL);
    };
    s.on('order:new', onNew);

    return () => {
      s.off('order:new', onNew);
      s.disconnect();
    };
  }, [user]);

  const dismiss = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
      {/* Mount the toast container only when there are toasts to show —
         no empty fixed-position element ever exists in the DOM. */}
      {toasts.length > 0 && (
      <div className="toast-stack" aria-live="polite">
        {toasts.map(({ id, order }) => (
          <Link
            key={id}
            to="/admin/orders"
            className="toast"
            onClick={() => dismiss(id)}
          >
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss(id);
              }}
            >
              ×
            </button>
            <div className="toast-title">🛎 New order — {order.orderNumber}</div>
            <div className="toast-body">
              {order.customerName} · {order.areaName || '—'}
            </div>
            <div className="toast-foot">
              {money(order.total)} ·{' '}
              {order.items?.reduce((s, i) => s + i.quantity, 0) || 0} item(s)
              {order.branch?.name && <span className="toast-branch"> · {order.branch.name}</span>}
            </div>
          </Link>
        ))}
      </div>
      )}
    </SocketContext.Provider>
  );
}
