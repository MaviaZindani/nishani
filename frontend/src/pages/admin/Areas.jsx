import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';

// One editable delivery-area row.
function AreaRow({ area, branches, onSaved, onDeleted }) {
  const [name, setName] = useState(area.name);
  const [charge, setCharge] = useState(area.charge);
  const [branchId, setBranchId] = useState(area.branchId || '');
  const [isActive, setIsActive] = useState(area.isActive);

  async function save() {
    try {
      const { data } = await api.put(`/areas/${area.id}`, {
        name,
        charge,
        isActive,
        branchId: branchId || null,
      });
      onSaved(data);
    } catch (e) {
      alert(apiError(e));
    }
  }
  async function remove() {
    if (!window.confirm(`Delete area "${area.name}"?`)) return;
    try {
      await api.delete(`/areas/${area.id}`);
      onDeleted(area.id);
    } catch (e) {
      alert(apiError(e));
    }
  }

  return (
    <tr>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="cell-narrow">
        <input type="number" value={charge} onChange={(e) => setCharge(Number(e.target.value))} />
      </td>
      <td>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">— Unassigned —</option>
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

export default function AdminAreas() {
  const [areas, setAreas] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', charge: '', branchId: '' });

  async function load() {
    const [a, b] = await Promise.all([
      api.get('/areas', { params: { all: 1 } }),
      api.get('/branches'),
    ]);
    setAreas(a.data);
    setBranches(b.data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function addArea(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const { data } = await api.post('/areas', {
        name: form.name,
        charge: Number(form.charge) || 0,
        branchId: form.branchId || null,
      });
      setAreas((prev) => [...prev, data]);
      setForm({ name: '', charge: '', branchId: '' });
    } catch (err) {
      alert(apiError(err));
    }
  }

  const upsert = (a) => setAreas((prev) => prev.map((x) => (x.id === a.id ? a : x)));
  const drop = (id) => setAreas((prev) => prev.filter((x) => x.id !== id));

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="admin-h1">Delivery Areas</h1>
      <p className="muted">
        Each area belongs to one branch — that branch fulfils every order placed in this area.
      </p>

      <div className="panel">
        <form className="inline-form" onSubmit={addArea}>
          <input
            placeholder="Area name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="number"
            placeholder="Delivery charge (Rs.)"
            value={form.charge}
            onChange={(e) => setForm({ ...form, charge: e.target.value })}
          />
          <select
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
          >
            <option value="">— Choose branch —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="btn">+ Add area</button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Area</th>
                <th className="cell-narrow">Charge (Rs.)</th>
                <th>Branch</th>
                <th>Status</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <AreaRow
                  key={a.id}
                  area={a}
                  branches={branches}
                  onSaved={upsert}
                  onDeleted={drop}
                />
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No delivery areas yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
