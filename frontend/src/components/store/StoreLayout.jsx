import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useCart } from '../../context/CartContext.jsx';
import { GeoLocationProvider } from '../../context/GeoLocationContext.jsx';
import {
  StorefrontStatusProvider,
  useStorefrontStatus,
} from '../../context/StorefrontStatusContext.jsx';
import LocationBanner from './LocationBanner.jsx';

// Site-wide "we're closed" notice. Renders at the top of every storefront
// page when no branch is currently operational (no online handlers + open).
function ClosedBanner() {
  const { acceptingOrders, loading } = useStorefrontStatus();
  if (loading || acceptingOrders) return null;
  return (
    <div className="closed-banner" role="status">
      🔒 We're currently closed — you can still browse, but new orders can't be placed
      right now. Please check back shortly.
    </div>
  );
}

// Shared chrome for every storefront page: promo bar, header, nav, footer.
export default function StoreLayout() {
  const [categories, setCategories] = useState([]);
  const [term, setTerm] = useState('');
  const { count } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  function onSearch(e) {
    e.preventDefault();
    navigate(term.trim() ? `/?search=${encodeURIComponent(term.trim())}` : '/');
  }

  return (
    <StorefrontStatusProvider>
    <GeoLocationProvider>
    <div className="store">
      <LocationBanner />
      <ClosedBanner />
      <div className="promo-bar">
        🚚 Delivery times may be extended due to a high volume of orders — thank you for your patience!
      </div>

      <header className="store-header">
        <div className="container store-header-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">🍦</span>
            <span className="logo-text">Nishani</span>
          </Link>

          <form className="search" onSubmit={onSearch}>
            <input
              type="search"
              placeholder="Search flavours…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <button type="submit" aria-label="Search">🔍</button>
          </form>

          <div className="store-header-actions">
            <Link to="/track" className="header-link">Track order</Link>
            <span style={{ margin: "0 80px" }}></span>
            <Link to="/cart" className="cart-link">
              🛒 Cart
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          </div>
        </div>

        <nav className="store-nav">
          <div className="container store-nav-inner">
            <NavLink to="/" end>Home</NavLink>
            {categories.map((c) => (
              <NavLink key={c.id} to={`/category/${c.slug}`}>
                {c.name}
              </NavLink>
            ))}
            <NavLink to="/blog">Blog</NavLink>
            <NavLink to="/faqs">FAQs</NavLink>
          </div>
        </nav>
      </header>

      <main className="store-main">
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="container store-footer-inner">
          <div>
            <div className="logo logo-light">
              <span className="logo-mark">🍦</span>
              <span className="logo-text">Nishani</span>
            </div>
            <p>Flavours of crave — a treat for your taste buds, delivered to your door.</p>
          </div>
          <div>
            <h4>Shop</h4>
            {categories.slice(0, 5).map((c) => (
              <Link key={c.id} to={`/category/${c.slug}`}>{c.name}</Link>
            ))}
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/faqs">FAQs</Link>
            <Link to="/track">Track your order</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/blog">Blog</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <a href="tel:02135213967">021-35213967</a>
            <Link to="/admin">Admin portal</Link>
          </div>
        </div>
        <div className="store-footer-base">
          © {new Date().getFullYear()} Nishani. All rights reserved.
        </div>
      </footer>
    </div>
    </GeoLocationProvider>
    </StorefrontStatusProvider>
  );
}
