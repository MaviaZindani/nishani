import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';

// One editable branch row.
function BranchRow({ branch, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: branch.name,
    city: branch.city || '',
    address: branch.address || '',
    phone: branch.phone || '',
    isActive: branch.isActive,
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
      <td>
        {branch._count?.admins ?? 0} / {branch._count?.areas ?? 0} / {branch._count?.orders ?? 0}
      </td>
      <td>
        <label className="check">
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
          Active
        </label>
      </td>
      <td className="cell-actions">
        <button className="btn btn-sm" onClick={save}>
          Save
        </button>
        <button className="btn btn-sm btn-danger" onClick={remove}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function AdminBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', city: '', address: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/branches', { params: { all: 1 } });
    setBranches(data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/branches', form);
      setBranches((prev) => [...prev, { ...data, _count: { admins: 0, areas: 0, orders: 0 } }]);
      setForm({ name: '', city: '', address: '', phone: '' });
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
        Each branch is a physical location. Order Handlers belong to one branch and only see
        orders routed to it. Delivery areas link customers to the right branch.
      </p>

      <form className="panel admin-form" onSubmit={create}>
        <h2 className="admin-h2">Add a branch</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            City
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
          <label>
            Address
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
        </div>
        <button className="btn" disabled={saving}>
          {saving ? 'Saving…' : '+ Create branch'}
        </button>
      </form>

      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Address</th>
              <th>Phone</th>
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
                <td colSpan={7} className="empty">
                  No branches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
