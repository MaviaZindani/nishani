import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { apiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import { MyBranchProvider, useMyBranch } from '../../context/MyBranchContext.jsx';
import { can, ROLE_LABELS } from '../../lib/roles.js';
import AdminOnboarding from './AdminOnboarding.jsx';
import { useState } from 'react';

// Every nav item declares the access `area` it needs (see lib/roles.js).
// `tour` is the value of the `data-tour` attribute so react-joyride can
// spotlight individual links during the first-time tour.
const NAV = [
  { to: '/admin',            label: 'Dashboard',      icon: '📊', end: true, area: 'dashboard',  tour: 'nav-dashboard' },
  { to: '/admin/orders',     label: 'Orders',         icon: '📦',           area: 'orders',     tour: 'nav-orders' },
  { to: '/admin/products',   label: 'Products',       icon: '🍦',           area: 'products',   tour: 'nav-products' },
  { to: '/admin/categories', label: 'Categories',     icon: '🗂️',           area: 'categories', tour: 'nav-categories' },
  { to: '/admin/areas',      label: 'Delivery Areas', icon: '🛵',           area: 'areas',      tour: 'nav-areas' },
  { to: '/admin/branches',   label: 'Branches',       icon: '🏬',           area: 'branches',   tour: 'nav-branches' },
  { to: '/admin/offers',     label: 'Offers',         icon: '🎬',           area: 'offers',     tour: 'nav-offers' },
  { to: '/admin/reports',    label: 'Reports',        icon: '📈',           area: 'reports',    tour: 'nav-reports' },
  { to: '/admin/users',      label: 'Admin Users',    icon: '👥',           area: 'users',      tour: 'nav-users' },
];

// Order Handlers get a one-click toggle in the topbar so they can pause
// (or resume) new orders for their own branch without leaving the screen.
// State is held in MyBranchContext so the Onboarding prompt and this
// toggle never disagree about whether the branch is open.
function BranchToggle() {
  const { branch, setOpen } = useMyBranch();
  const [saving, setSaving] = useState(false);

  if (!branch) return null;

  async function toggle() {
    setSaving(true);
    try {
      await setOpen(!branch.isOpen);
    } catch (e) {
      alert(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      data-tour="branch-toggle"
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
  return (
    <MyBranchProvider>
      <AdminLayoutInner />
    </MyBranchProvider>
  );
}

function AdminLayoutInner() {
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
      <aside className="admin-sidebar" data-tour="sidebar">
        <Link to="/admin" className="admin-brand">
          <span className="logo-mark">🍦</span> Nishani
        </Link>
        <nav className="admin-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} data-tour={item.tour}>
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
            {isHandler && <BranchToggle />}
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

      {/* First-time tour and "open my branch?" prompt. */}
      <AdminOnboarding />
    </div>
  );
}
