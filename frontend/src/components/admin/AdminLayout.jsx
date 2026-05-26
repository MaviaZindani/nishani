import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import { can, ROLE_LABELS } from '../../lib/roles.js';

// Every nav item declares the access `area` it needs (see lib/roles.js).
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true, area: 'dashboard' },
  { to: '/admin/orders', label: 'Orders', icon: '📦', area: 'orders' },
  { to: '/admin/products', label: 'Products', icon: '🍦', area: 'products' },
  { to: '/admin/categories', label: 'Categories', icon: '🗂️', area: 'categories' },
  { to: '/admin/areas', label: 'Delivery Areas', icon: '🛵', area: 'areas' },
  { to: '/admin/branches', label: 'Branches', icon: '🏬', area: 'branches' },
  { to: '/admin/offers', label: 'Offers', icon: '🎬', area: 'offers' },
  { to: '/admin/reports', label: 'Reports', icon: '📈', area: 'reports' },
  { to: '/admin/users', label: 'Admin Users', icon: '👥', area: 'users' },
];

// Order Handlers get a one-click toggle in the topbar so they can pause
// (or resume) new orders for their own branch without leaving the screen.
function BranchToggle({ branchId }) {
  const [branch, setBranch] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    api
      .get('/branches', { params: { all: 1 } })
      .then((r) => setBranch(r.data.find((b) => b.id === branchId) || null))
      .catch(() => {});
  }, [branchId]);

  async function toggle() {
    if (!branch) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/branches/${branchId}/open`, {
        isOpen: !branch.isOpen,
      });
      setBranch((b) => ({ ...b, ...data }));
    } catch (e) {
      alert(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!branch) return null;
  return (
    <button
      type="button"
      className={`branch-toggle ${branch.isOpen ? 'is-open' : 'is-closed'}`}
      onClick={toggle}
      disabled={saving}
      title={branch.isOpen ? 'Click to stop accepting new orders' : 'Click to start accepting orders again'}
    >
      <span className="branch-toggle-dot" />
      {branch.name} · {branch.isOpen ? 'Open' : 'Closed'}
    </button>
  );
}

// Shell for the admin portal: role-filtered sidebar + top bar + content.
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/admin/login');
  }

  const items = NAV.filter((item) => can(user, item.area));
  const isHandler = user?.role === 'ORDER_HANDLER' && user?.branchId;

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-brand">
          <span className="logo-mark">🍦</span> Nishani
        </Link>
        <nav className="admin-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer" className="admin-viewsite">
          ↗ View storefront
        </a>
      </aside>

      <div className="admin-body">
        <header className="admin-topbar">
          <div className="admin-topbar-title">Admin Portal</div>
          <div className="admin-topbar-user">
            {isHandler && <BranchToggle branchId={user.branchId} />}
            <span className="role-badge">{ROLE_LABELS[user?.role] || 'Admin'}</span>
            <span>{user?.name || user?.email}</span>
            <button className="btn btn-sm btn-outline" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
