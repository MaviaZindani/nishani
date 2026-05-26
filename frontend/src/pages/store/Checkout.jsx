import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import { useCart } from '../../context/CartContext.jsx';
import { useGeoLocation } from '../../context/GeoLocationContext.jsx';
import { money } from '../../lib/format.js';

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

  // Customer location is captured site-wide (see GeoLocationContext / the
  // first-visit banner). At checkout we just consume it; no prompts here
  // unless the user explicitly clicks "Use my live location".
  const { coords, status, request } = useGeoLocation();

  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    areaId: '',
    notes: '',
  });
  const [eta, setEta] = useState(null);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api.get('/areas').then((r) => setAreas(r.data)).catch(() => {});
  }, []);

  // Whenever the area changes (or coords arrive from the global context),
  // refetch the live ETA so the number on screen stays honest.
  useEffect(() => {
    if (!form.areaId) {
      setEta(null);
      return;
    }
    const params = { areaId: form.areaId };
    if (coords) {
      params.lat = coords.lat;
      params.lng = coords.lng;
    }
    api
      .get('/eta', { params })
      .then((r) => setEta(r.data))
      .catch(() => setEta(null));
  }, [form.areaId, coords]);

  if (items.length === 0) {
    return (
      <div className="container section empty">
        <h1 className="section-title">Nothing to check out</h1>
        <Link to="/" className="btn">Browse flavours</Link>
      </div>
    );
  }

  const selectedArea = areas.find((a) => String(a.id) === String(form.areaId));
  const delivery = selectedArea ? selectedArea.charge : 0;
  const total = subtotal + delivery;
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function placeOrder(e) {
    e.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        ...form,
        areaId: form.areaId || null,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        lat: coords?.lat,
        lng: coords?.lng,
        estimatedMinutes: eta?.minutes,
      });
      clear();
      navigate(`/track/${data.orderNumber}`);
    } catch (err) {
      setError(apiError(err));
      setPlacing(false);
    }
  }

  // Footer of the ETA card — shows the current location state, but only
  // ever prompts on a user click. If the user has already granted, we show
  // a quiet confirmation; if denied/unsupported we don't pester them.
  function LocationFooter() {
    if (coords) return <span className="eta-using-loc">📍 Using your live location</span>;
    if (status === 'requesting') return <span className="muted">Locating…</span>;
    if (status === 'denied') {
      return (
        <span className="muted">
          Location was blocked in your browser — using the default time. You can re-enable it
          in site settings.
        </span>
      );
    }
    if (status === 'unsupported') {
      return <span className="muted">Your device doesn't support live location.</span>;
    }
    // idle | dismissed → offer the inline opt-in
    return (
      <button type="button" className="btn btn-sm btn-outline" onClick={request}>
        📍 Use my live location for an exact time
      </button>
    );
  }

  return (
    <div className="container section">
      <h1 className="section-title">Checkout</h1>
      <div className="cart-layout">
        <form className="checkout-form" onSubmit={placeOrder}>
          <h3>Delivery details</h3>
          {error && <div className="alert alert-error">{error}</div>}

          <label>
            Full name
            <input value={form.customerName} onChange={update('customerName')} required />
          </label>
          <label>
            Phone number
            <input value={form.phone} onChange={update('phone')} required />
          </label>
          <label>
            Delivery address
            <textarea value={form.address} onChange={update('address')} rows={3} required />
          </label>
          <label>
            Area
            <select value={form.areaId} onChange={update('areaId')} required>
              <option value="">Select your area…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {money(a.charge)} delivery
                </option>
              ))}
            </select>
          </label>

          {form.areaId && (
            <div className="eta-card">
              <div className="eta-main">
                <span className="eta-icon" aria-hidden>⏱</span>
                <div>
                  <strong>Estimated delivery: ~{eta?.minutes ?? '—'} min</strong>
                  {eta?.precision === 'live' && eta.distanceKm != null && (
                    <div className="muted">
                      {eta.distanceKm} km from {eta.branch?.name || 'your branch'}
                    </div>
                  )}
                  {eta?.precision === 'default' && eta?.available !== false && (
                    <div className="muted">
                      Default estimate — share your live location for a more accurate time.
                    </div>
                  )}
                </div>
              </div>
              {eta?.redirected && eta?.branch && (
                <div className="eta-notice eta-redirect">
                  {eta.homeBranch?.name || 'Your usual branch'} is currently closed — your
                  order will be delivered from <strong>{eta.branch.name}</strong>.
                </div>
              )}
              {eta && eta.available === false && (
                <div className="alert alert-error eta-notice">
                  No branches are open right now. Please try again in a few minutes.
                </div>
              )}
              <LocationFooter />
            </div>
          )}

          <label>
            Order notes (optional)
            <textarea value={form.notes} onChange={update('notes')} rows={2} />
          </label>

          <div className="payment-note">
            💵 Payment method: <strong>Cash on Delivery</strong>
          </div>
          <button
            className="btn btn-block"
            disabled={placing || (eta && eta.available === false)}
          >
            {placing
              ? 'Placing order…'
              : eta && eta.available === false
                ? 'All branches closed'
                : `Place order — ${money(total)}`}
          </button>
        </form>

        <aside className="cart-summary">
          <h3>Your order</h3>
          {items.map((i) => (
            <div className="summary-row" key={i.productId}>
              <span>
                {i.name} × {i.quantity}
              </span>
              <span>{money(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery{selectedArea ? ` (${selectedArea.name})` : ''}</span>
            <span>{money(delivery)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          {eta?.minutes && (
            <div className="summary-row muted">
              <span>Arrives in</span>
              <span>~{eta.minutes} min</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
