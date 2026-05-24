import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { can, ROLE_LABELS } from '../../lib/roles.js';

// Every nav item declares the access `area` it needs (see lib/roles.js).
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true, area: 'dashboard' },
  { to: '/admin/orders', label: 'Orders', icon: '📦', area: 'orders' },
  { to: '/admin/products', label: 'Products', icon: '🍦', area: 'products' },
  { to: '/admin/categories', label: 'Categories', icon: '🗂️', area: 'categories' },
  { to: '/admin/areas', label: 'Delivery Areas', icon: '🛵', area: 'areas' },
  { to: '/admin/offers', label: 'Offers', icon: '🎬', area: 'offers' },
  { to: '/admin/reports', label: 'Reports', icon: '📈', area: 'reports' },
  { to: '/admin/users', label: 'Admin Users', icon: '👥', area: 'users' },
];

// Shell for the admin portal: role-filtered sidebar + top bar + content.
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/admin/login');
  }

  const items = NAV.filter((item) => can(user, item.area));

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
