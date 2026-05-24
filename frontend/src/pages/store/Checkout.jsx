import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import { useCart } from '../../context/CartContext.jsx';
import { money } from '../../lib/format.js';

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    areaId: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api.get('/areas').then((r) => setAreas(r.data)).catch(() => {});
  }, []);

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
      });
      clear();
      navigate(`/track/${data.orderNumber}`);
    } catch (err) {
      setError(apiError(err));
      setPlacing(false);
    }
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
          <label>
            Order notes (optional)
            <textarea value={form.notes} onChange={update('notes')} rows={2} />
          </label>

          <div className="payment-note">
            💵 Payment method: <strong>Cash on Delivery</strong>
          </div>
          <button className="btn btn-block" disabled={placing}>
            {placing ? 'Placing order…' : `Place order — ${money(total)}`}
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
        </aside>
      </div>
    </div>
  );
}
