import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import { money, dateTime } from '../../lib/format.js';

// Live feed of new, unclaimed orders. A card appears the instant a
// customer checks out, and disappears from every order handler's screen
// the moment one handler picks it.
export default function IncomingOrders({ socket }) {
  const [incoming, setIncoming] = useState([]);
  const [picking, setPicking] = useState(null);
  const [notice, setNotice] = useState('');

  // Pending orders already waiting when the screen is opened.
  useEffect(() => {
    api
      .get('/orders', { params: { status: 'PENDING' } })
      .then((r) => setIncoming(r.data))
      .catch(() => {});
  }, []);

  // React to realtime order events.
  useEffect(() => {
    if (!socket) return undefined;

    const onNew = (order) =>
      setIncoming((prev) =>
        prev.some((o) => o.id === order.id) ? prev : [{ ...order, isNew: true }, ...prev]
      );
    const onClaimed = ({ orderId }) =>
      setIncoming((prev) => prev.filter((o) => o.id !== orderId));
    const onUpdated = (order) =>
      setIncoming((prev) =>
        order.status === 'PENDING' ? prev : prev.filter((o) => o.id !== order.id)
      );

    socket.on('order:new', onNew);
    socket.on('order:claimed', onClaimed);
    socket.on('order:updated', onUpdated);
    return () => {
      socket.off('order:new', onNew);
      socket.off('order:claimed', onClaimed);
      socket.off('order:updated', onUpdated);
    };
  }, [socket]);

  // Claim an order. The server broadcasts order:claimed, which removes
  // the card from this and every other handler's screen.
  async function pick(order) {
    setPicking(order.id);
    setNotice('');
    try {
      await api.patch(`/orders/${order.id}/claim`);
      setNotice(`✓ You picked order ${order.orderNumber} — find it under Accepted below.`);
    } catch (e) {
      setNotice(apiError(e));
      setIncoming((prev) => prev.filter((o) => o.id !== order.id));
    } finally {
      setPicking(null);
    }
  }

  return (
    <div className="panel incoming-panel">
      <div className="incoming-head">
        <span className="live-dot" />
        <h2 className="admin-h2">Incoming Orders — live</h2>
        {incoming.length > 0 && <span className="incoming-count">{incoming.length}</span>}
      </div>

      {notice && <div className="alert alert-info">{notice}</div>}

      {incoming.length === 0 ? (
        <p className="muted">
          No new orders waiting. Orders appear here the moment a customer checks out.
        </p>
      ) : (
        <div className="incoming-grid">
          {incoming.map((o) => (
            <div key={o.id} className={`order-card ${o.isNew ? 'order-card-new' : ''}`}>
              <div className="order-card-head">
                <strong>{o.orderNumber}</strong>
                <span className="price">{money(o.total)}</span>
              </div>
              <div className="order-card-body">
                <span>
                  {o.customerName} · {o.phone}
                </span>
                <span className="muted">
                  {o.areaName || 'No area'} ·{' '}
                  {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                </span>
                <span className="muted">{dateTime(o.createdAt)}</span>
              </div>
              <button
                className="btn btn-block"
                disabled={picking === o.id}
                onClick={() => pick(o)}
              >
                {picking === o.id ? 'Picking…' : '✋ Pick this order'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
