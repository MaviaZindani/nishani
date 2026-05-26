import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';
import { money, dateTime, STATUS_META } from '../../lib/format.js';

// Customer-facing lifecycle: the steps an order passes through.
const STEPS = ['PENDING', 'ACCEPTED', 'DISPATCHED', 'CLOSED'];
const STEP_LABEL = {
  PENDING: 'Order placed',
  ACCEPTED: 'Accepted',
  DISPATCHED: 'Out for delivery',
  CLOSED: 'Delivered',
};

export default function OrderTrack() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [term, setTerm] = useState(orderNumber || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderNumber) {
      setOrder(null);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/orders/track/${orderNumber}`)
      .then((r) => setOrder(r.data))
      .catch((err) => {
        setError(apiError(err));
        setOrder(null);
      })
      .finally(() => setLoading(false));
  }, [orderNumber]);

  function submit(e) {
    e.preventDefault();
    if (term.trim()) navigate(`/track/${term.trim()}`);
  }

  const cancelled = order?.status === 'CANCELLED';
  const currentStep = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div className="container section">
      <h1 className="section-title">Track your order</h1>

      <form className="track-form" onSubmit={submit}>
        <input
          placeholder="Enter your order number (e.g. NSH-XXXXXXX)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn">Track</button>
      </form>

      {loading && <Loader />}
      {error && <div className="alert alert-error">{error}</div>}

      {order && (
        <div className="track-result">
          <div className="track-head">
            <div>
              <h2>{order.orderNumber}</h2>
              <p className="muted">Placed {dateTime(order.createdAt)}</p>
            </div>
            <span
              className="status-pill"
              style={{ background: STATUS_META[order.status]?.color }}
            >
              {STATUS_META[order.status]?.label || order.status}
            </span>
          </div>

          {cancelled ? (
            <div className="alert alert-error">This order was cancelled.</div>
          ) : (
            <>
              {order.estimatedMinutes && order.status !== 'CLOSED' && (
                <div className="eta-banner">
                  ⏱ Estimated delivery: <strong>~{order.estimatedMinutes} minutes</strong>
                </div>
              )}
              <ol className="track-steps">
                {STEPS.map((step, i) => (
                  <li key={step} className={i <= currentStep ? 'done' : ''}>
                    <span className="track-dot" />
                    {STEP_LABEL[step]}
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="track-items">
            {order.items.map((it) => (
              <div className="summary-row" key={it.id}>
                <span>
                  {it.productName} × {it.quantity}
                </span>
                <span>{money(it.price * it.quantity)}</span>
              </div>
            ))}
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery{order.areaName ? ` (${order.areaName})` : ''}</span>
              <span>{money(order.deliveryCharge)}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </div>

          <p className="muted">
            Delivering to {order.customerName}, {order.address}
          </p>
        </div>
      )}
    </div>
  );
}
