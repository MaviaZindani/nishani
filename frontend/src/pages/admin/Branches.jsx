import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';

// One editable branch row. Lat/lng + isOpen + isActive all editable.
function BranchRow({ branch, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: branch.name,
    city: branch.city || '',
    address: branch.address || '',
    phone: branch.phone || '',
    lat: branch.lat ?? '',
    lng: branch.lng ?? '',
    isActive: branch.isActive,
    isOpen: branch.isOpen,
  });
  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save() {
    try {
      const { data } = await api.put(`/branches/${branch.id}`, form);
      onSaved({ ...branch, ...data });
    } catch (e) {
      alert(apiError(e));
    }
  }
  async function remove() {
    if (!window.confirm(`Delete "${branch.name}"?`)) return;
    try {
      await api.delete(`/branches/${branch.id}`);
      onDeleted(branch.id);
    } catch (e) {
      alert(apiError(e));
    }
  }

  // Effective live status: only Active + manually Open + has at least one
  // Order Handler online right now. Mirrors backend `isOperational(branch)`.
  const operational = branch.isActive && branch.isOpen && (branch.onlineHandlers ?? 0) > 0;

  return (
    <tr>
      <td>
        <input value={form.name} onChange={set('name')} />
      </td>
      <td>
        <input value={form.city} onChange={set('city')} placeholder="City" />
      </td>
      <td>
        <input value={form.address} onChange={set('address')} placeholder="Street address" />
      </td>
      <td>
        <input value={form.phone} onChange={set('phone')} placeholder="Phone" />
      </td>
      <td className="cell-coords">
        <input type="number" step="any" value={form.lat} onChange={set('lat')} placeholder="lat" />
        <input type="number" step="any" value={form.lng} onChange={set('lng')} placeholder="lng" />
      </td>
      <td>
        {branch._count?.admins ?? 0} / {branch._count?.areas ?? 0} / {branch._count?.orders ?? 0}
      </td>
      <td>
        <div className="branch-flags">
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            Enabled
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isOpen} onChange={set('isOpen')} />
            Accepting
          </label>
        </div>
        <div className="branch-live">
          <span className={`live-pill ${operational ? 'live-on' : 'live-off'}`}>
            {operational ? '🟢 Operational' : '🔴 Closed'}
          </span>
          <span className="muted">
            {branch.onlineHandlers ?? 0} handler{(branch.onlineHandlers ?? 0) === 1 ? '' : 's'} online
          </span>
        </div>
      </td>
      <td className="cell-actions">
        <button className="btn btn-sm" onClick={save}>Save</button>
        <button className="btn btn-sm btn-danger" onClick={remove}>Delete</button>
      </td>
    </tr>
  );
}

export default function AdminBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    lat: '',
    lng: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  async function load() {
    const { data } = await api.get('/branches', { params: { all: 1 } });
    setBranches(data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
    // Refresh live handler counts every 8s so the "operational" pill stays current.
    const t = setInterval(() => load().catch(() => {}), 8000);
    return () => clearInterval(t);
  }, []);

  function useMyLocation() {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function create(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/branches', form);
      setBranches((prev) => [...prev, { ...data, _count: { admins: 0, areas: 0, orders: 0 } }]);
      setForm({ name: '', city: '', address: '', phone: '', lat: '', lng: '' });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const upsert = (b) => setBranches((prev) => prev.map((x) => (x.id === b.id ? b : x)));
  const drop = (id) => setBranches((prev) => prev.filter((x) => x.id !== id));

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="admin-h1">Branches</h1>
      <p className="muted">
        A branch can take new orders only when it's <strong>Enabled</strong>,
        <strong> Accepting</strong>, and has at least one Order Handler online.
        When a branch can't fulfil an order, the system automatically redirects it to the
        nearest operational branch.
      </p>

      <form className="panel admin-form" onSubmit={create}>
        <h2 className="admin-h2">Add a branch</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            City
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label>
            Address
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Latitude
            <input type="number" step="any" value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="24.8607" />
          </label>
          <label>
            Longitude
            <input type="number" step="any" value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="67.0011" />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn" disabled={saving}>
            {saving ? 'Saving…' : '+ Create branch'}
          </button>
          <button type="button" className="btn btn-outline" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : '📍 Use my current location'}
          </button>
        </div>
      </form>

      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Coords (lat / lng)</th>
              <th>Admins / Areas / Orders</th>
              <th>Status</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <BranchRow key={b.id} branch={b} onSaved={upsert} onDeleted={drop} />
            ))}
            {branches.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">No branches yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
