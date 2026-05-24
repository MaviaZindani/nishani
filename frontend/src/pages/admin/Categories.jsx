import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';

// One editable category row.
function CategoryRow({ category, onSaved, onDeleted }) {
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(category.sortOrder);
  const [isActive, setIsActive] = useState(category.isActive);

  async function save() {
    try {
      const { data } = await api.put(`/categories/${category.id}`, { name, sortOrder, isActive });
      onSaved({ ...category, ...data });
    } catch (e) {
      alert(apiError(e));
    }
  }
  async function remove() {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await api.delete(`/categories/${category.id}`);
      onDeleted(category.id);
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
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </td>
      <td>{category._count?.products ?? 0}</td>
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

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState('');

  async function load() {
    const { data } = await api.get('/categories', { params: { all: 1 } });
    setCategories(data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function addCategory(e) {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      const { data } = await api.post('/categories', { name: newCat });
      setCategories((prev) => [...prev, { ...data, _count: { products: 0 } }]);
      setNewCat('');
    } catch (err) {
      alert(apiError(err));
    }
  }

  const upsert = (c) => setCategories((prev) => prev.map((x) => (x.id === c.id ? c : x)));
  const drop = (id) => setCategories((prev) => prev.filter((x) => x.id !== id));

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="admin-h1">Categories</h1>
      <p className="muted">Categories group the products shown across the storefront.</p>

      <div className="panel">
        <form className="inline-form" onSubmit={addCategory}>
          <input
            placeholder="New category name"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <button className="btn">+ Add category</button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="cell-narrow">Sort</th>
                <th>Products</th>
                <th>Status</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} onSaved={upsert} onDeleted={drop} />
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No categories yet.
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
