import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';

// One editable delivery-area row.
function AreaRow({ area, onSaved, onDeleted }) {
  const [name, setName] = useState(area.name);
  const [charge, setCharge] = useState(area.charge);
  const [isActive, setIsActive] = useState(area.isActive);

  async function save() {
    try {
      const { data } = await api.put(`/areas/${area.id}`, { name, charge, isActive });
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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', charge: '' });

  async function load() {
    const { data } = await api.get('/areas', { params: { all: 1 } });
    setAreas(data);
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
      });
      setAreas((prev) => [...prev, data]);
      setForm({ name: '', charge: '' });
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
        The charge for the area a customer selects is added to their order total at checkout.
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
          <button className="btn">+ Add area</button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Area</th>
                <th className="cell-narrow">Charge (Rs.)</th>
                <th>Status</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <AreaRow key={a.id} area={a} onSaved={upsert} onDeleted={drop} />
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
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
