import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';
import { money, dateTime, STATUS_META } from '../../lib/format.js';
import { NEXT_ACTION, CAN_CANCEL } from '../../lib/orders.js';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((r) => setOrder(r.data))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [id]);

  async function changeStatus(newStatus) {
    if (newStatus === 'CANCELLED' && !window.confirm('Cancel this order?')) return;
    try {
      const { data } = await api.patch(`/orders/${id}/status`, { status: newStatus });
      setOrder((o) => ({ ...o, status: data.status }));
    } catch (e) {
      alert(apiError(e));
    }
  }

  if (loading) return <Loader />;
  if (error || !order)
    return (
      <div>
        <div className="alert alert-error">{error || 'Order not found'}</div>
        <Link to="/admin/orders" className="btn btn-outline">
          Back to orders
        </Link>
      </div>
    );

  const next = NEXT_ACTION[order.status];

  return (
    <div>
      <div className="admin-pagehead">
        <h1 className="admin-h1">{order.orderNumber}</h1>
        <Link to="/admin/orders" className="btn btn-outline btn-sm">
          ← All orders
        </Link>
      </div>

      <div className="panel order-statusbar">
        <span className="status-pill" style={{ background: STATUS_META[order.status]?.color }}>
          {STATUS_META[order.status]?.label}
        </span>
        <span className="muted">Placed {dateTime(order.createdAt)}</span>
        <div className="order-statusbar-actions">
          {next && (
            <button className="btn btn-sm" onClick={() => changeStatus(next.status)}>
              {next.label}
            </button>
          )}
          {CAN_CANCEL.includes(order.status) && (
            <button className="btn btn-sm btn-danger" onClick={() => changeStatus('CANCELLED')}>
              Cancel order
            </button>
          )}
        </div>
      </div>

      <div className="order-detail-grid">
        <div className="panel">
          <h2 className="admin-h2">Items</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.productName}</td>
                  <td>{money(it.price)}</td>
                  <td>{it.quantity}</td>
                  <td>{money(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="order-totals">
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
        </div>

        <div className="panel">
          <h2 className="admin-h2">Customer</h2>
          <dl className="detail-list">
            <dt>Name</dt>
            <dd>{order.customerName}</dd>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${order.phone}`}>{order.phone}</a>
            </dd>
            <dt>Area</dt>
            <dd>{order.areaName || '—'}</dd>
            <dt>Address</dt>
            <dd>{order.address}</dd>
            {order.notes && (
              <>
                <dt>Notes</dt>
                <dd>{order.notes}</dd>
              </>
            )}
            <dt>Payment</dt>
            <dd>Cash on Delivery</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
