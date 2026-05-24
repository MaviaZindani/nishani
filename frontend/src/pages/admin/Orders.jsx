import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';
import IncomingOrders from '../../components/admin/IncomingOrders.jsx';
import { createOrderSocket } from '../../lib/socket.js';
import { money, dateTime, STATUS_META } from '../../lib/format.js';
import { NEXT_ACTION, CAN_CANCEL, STATUS_TABS } from '../../lib/orders.js';

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'ALL';

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  // Bumped by realtime events to refresh the table below.
  const [tick, setTick] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', { params: { status, search } });
      setOrders(data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tick]);

  // One realtime connection drives the whole Orders screen.
  useEffect(() => {
    const s = createOrderSocket();
    setSocket(s);
    const bump = () => setTick((t) => t + 1);
    s.on('order:new', bump);
    s.on('order:claimed', bump);
    s.on('order:updated', bump);
    return () => s.disconnect();
  }, []);

  // Accept / dispatch / close / cancel an order.
  async function changeStatus(order, newStatus) {
    if (newStatus === 'CANCELLED' && !window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    try {
      await api.patch(`/orders/${order.id}/status`, { status: newStatus });
      setTick((t) => t + 1);
    } catch (e) {
      alert(apiError(e));
    }
  }

  return (
    <div>
      <h1 className="admin-h1">Orders</h1>

      {/* Realtime feed of new, unclaimed orders */}
      <IncomingOrders socket={socket} />

      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${status === tab ? 'tab-active' : ''}`}
            onClick={() => setParams(tab === 'ALL' ? {} : { status: tab })}
          >
            {tab === 'ALL' ? 'All' : STATUS_META[tab]?.label}
          </button>
        ))}
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search order #, name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn">Search</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <Loader />
      ) : (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Placed</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const next = NEXT_ACTION[o.status];
                return (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`} className="link-strong">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {o.customerName}
                      <div className="muted">{o.phone}</div>
                    </td>
                    <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <span
                        className="status-pill"
                        style={{ background: STATUS_META[o.status]?.color }}
                      >
                        {STATUS_META[o.status]?.label}
                      </span>
                      {o.claimedByName && (
                        <div className="claimed-by">picked by {o.claimedByName}</div>
                      )}
                    </td>
                    <td className="muted">{dateTime(o.createdAt)}</td>
                    <td className="cell-actions">
                      {next && (
                        <button
                          className="btn btn-sm"
                          onClick={() => changeStatus(o, next.status)}
                        >
                          {next.label}
                        </button>
                      )}
                      {CAN_CANCEL.includes(o.status) && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => changeStatus(o, 'CANCELLED')}
                        >
                          Cancel
                        </button>
                      )}
                      <Link to={`/admin/orders/${o.id}`} className="btn btn-sm btn-outline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No orders to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
