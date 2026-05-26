import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_OPTIONS } from '../../lib/roles.js';
import { dateTime } from '../../lib/format.js';

// One editable admin-account row.
function UserRow({ user, branches, currentId, onSaved, onDeleted }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [branchId, setBranchId] = useState(user.branchId || '');
  const [isActive, setIsActive] = useState(user.isActive);
  const isSelf = user.id === currentId;

  async function save() {
    try {
      const { data } = await api.put(`/users/${user.id}`, {
        name,
        role,
        isActive,
        branchId: branchId || null,
      });
      onSaved(data);
    } catch (e) {
      alert(apiError(e));
    }
  }
  async function resetPassword() {
    const pw = window.prompt(`Set a new password for ${user.email} (min 6 characters):`);
    if (!pw) return;
    try {
      await api.put(`/users/${user.id}`, { password: pw });
      alert('Password updated.');
    } catch (e) {
      alert(apiError(e));
    }
  }
  async function remove() {
    if (!window.confirm(`Delete the admin account "${user.email}"?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      onDeleted(user.id);
    } catch (e) {
      alert(apiError(e));
    }
  }

  return (
    <tr>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        {isSelf && <span className="muted"> (you)</span>}
      </td>
      <td>{user.email}</td>
      <td>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">— Global —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="check">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </td>
      <td className="muted">{dateTime(user.createdAt)}</td>
      <td className="cell-actions">
        <button className="btn btn-sm" onClick={save}>
          Save
        </button>
        <button className="btn btn-sm btn-outline" onClick={resetPassword}>
          Password
        </button>
        <button className="btn btn-sm btn-danger" onClick={remove} disabled={isSelf}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ORDER_HANDLER',
    branchId: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [u, b] = await Promise.all([api.get('/users'), api.get('/branches')]);
    setUsers(u.data);
    setBranches(b.data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/users', {
        ...form,
        branchId: form.branchId || null,
      });
      setUsers((prev) => [...prev, data]);
      setForm({ name: '', email: '', password: '', role: 'ORDER_HANDLER', branchId: '' });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const upsert = (u) => setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
  const drop = (id) => setUsers((prev) => prev.filter((x) => x.id !== id));

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="admin-h1">Admin Users</h1>
      <p className="muted">
        Order Handlers belong to a branch and only see orders routed to it. Super Admins and
        Product / Offer Managers stay global.
      </p>

      <form className="panel admin-form" onSubmit={create}>
        <h2 className="admin-h2">Add an admin user</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            Full name
            <input value={form.name} onChange={set('name')} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              minLength={6}
              required
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={set('role')}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Branch{' '}
            {form.role === 'ORDER_HANDLER' && (
              <span className="muted"> (required)</span>
            )}
            <select value={form.branchId} onChange={set('branchId')}>
              <option value="">— Global —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn" disabled={saving}>
          {saving ? 'Creating…' : '+ Create user'}
        </button>
      </form>

      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Created</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                branches={branches}
                currentId={me?.id}
                onSaved={upsert}
                onDeleted={drop}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
