import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Loader from '../../components/Loader.jsx';
import { money } from '../../lib/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { can, ROLE_LABELS } from '../../lib/roles.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/reports/summary').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <Loader />;

  // The API only includes `income` for the Super Admin.
  const { orders, catalog, income } = data;
  const showOrders = can(user, 'orders');
  const showCatalog = can(user, 'products');

  // Quick links tailored to what the current role may do.
  const quickLinks = [
    can(user, 'orders') && {
      to: '/admin/orders',
      title: 'Manage orders',
      desc: 'Accept, dispatch and close customer orders',
    },
    can(user, 'productEdit') && {
      to: '/admin/products',
      title: 'Manage products',
      desc: 'Add, edit and remove products',
    },
    can(user, 'offers') && {
      to: '/admin/offers',
      title: 'Offers & promotions',
      desc: 'Create offer images and videos',
    },
    can(user, 'areas') && {
      to: '/admin/areas',
      title: 'Delivery areas',
      desc: 'Manage delivery zones and charges',
    },
    can(user, 'reports') && {
      to: '/admin/reports',
      title: 'Reports & Excel export',
      desc: 'Monthly income and downloadable order sheets',
    },
    can(user, 'users') && {
      to: '/admin/users',
      title: 'Admin users',
      desc: 'Create and manage admin accounts',
    },
  ].filter(Boolean);

  return (
    <div>
      <h1 className="admin-h1">Dashboard</h1>
      <p className="muted dash-greeting">
        Welcome back, {user?.name} — signed in as {ROLE_LABELS[user?.role]}.
      </p>

      <div className="stat-grid">
        {income && (
          <>
            <div className="stat-card stat-accent" data-tour="dashboard-income">
              <span className="stat-label">Income this month</span>
              <span className="stat-value">{money(income.month)}</span>
              <span className="stat-foot">Today: {money(income.today)}</span>
            </div>
            <div className="stat-card" data-tour="dashboard-lifetime">
              <span className="stat-label">Lifetime income</span>
              <span className="stat-value">{money(income.lifetime)}</span>
              <span className="stat-foot">From delivered orders</span>
            </div>
          </>
        )}
        {showOrders && (
          <>
            <div className="stat-card" data-tour="dashboard-pending">
              <span className="stat-label">Pending orders</span>
              <span className="stat-value">{orders.pending}</span>
              <span className="stat-foot">Awaiting acceptance</span>
            </div>
            <div className="stat-card" data-tour="dashboard-total">
              <span className="stat-label">Total orders</span>
              <span className="stat-value">{orders.total}</span>
              <span className="stat-foot">{orders.closed} delivered</span>
            </div>
          </>
        )}
        {showCatalog && (
          <div className="stat-card" data-tour="dashboard-catalog">
            <span className="stat-label">Catalogue</span>
            <span className="stat-value">{catalog.products}</span>
            <span className="stat-foot">products in {catalog.categories} categories</span>
          </div>
        )}
      </div>

      {showOrders && (
        <div className="panel">
          <h2 className="admin-h2">Orders by status</h2>
          <div className="status-tiles">
            {[
              ['PENDING', 'Pending', orders.pending],
              ['ACCEPTED', 'Accepted', orders.accepted],
              ['DISPATCHED', 'Dispatched', orders.dispatched],
              ['CLOSED', 'Closed', orders.closed],
              ['CANCELLED', 'Cancelled', orders.cancelled],
            ].map(([status, label, count]) => (
              <Link key={status} to={`/admin/orders?status=${status}`} className="status-tile">
                <span className="status-tile-count">{count}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="dash-cards">
        {quickLinks.map((q) => (
          <Link key={q.to} to={q.to} className="panel dash-link">
            <h3>{q.title}</h3>
            <p className="muted">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
