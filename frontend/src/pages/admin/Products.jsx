import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { money } from '../../lib/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { can } from '../../lib/roles.js';

export default function AdminProducts() {
  const { user } = useAuth();
  // Order Handlers see the list and may toggle stock, but cannot add/edit/delete.
  const canEdit = can(user, 'productEdit');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/products/admin/all');
      setProducts(data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Mark a product in/out of stock without leaving the list.
  async function toggleStock(product) {
    try {
      const { data } = await api.patch(`/products/${product.id}/stock`);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, inStock: data.inStock } : p))
      );
    } catch (e) {
      alert(apiError(e));
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) {
      alert(apiError(e));
    }
  }

  if (loading) return <Loader />;

  return (
    <div>
      <div className="admin-pagehead">
        <h1 className="admin-h1">Products</h1>
        {canEdit && (
          <Link to="/admin/products/new" className="btn">
            + Add product
          </Link>
        )}
      </div>
      {!canEdit && (
        <p className="muted">
          As an Order Handler you can mark products in or out of stock. Adding and editing
          products is done by a Product / Offer Manager.
        </p>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Visible</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="cell-product">
                    <ProductImage src={p.image} alt={p.name} className="cell-thumb" />
                    <span>{p.name}</span>
                  </div>
                </td>
                <td>{p.category?.name || '—'}</td>
                <td>{money(p.price)}</td>
                <td>
                  <button
                    className={`pill-toggle ${p.inStock ? 'on' : 'off'}`}
                    onClick={() => toggleStock(p)}
                  >
                    {p.inStock ? 'In stock' : 'Out of stock'}
                  </button>
                </td>
                <td>
                  <span className={p.isActive ? 'tag tag-green' : 'tag tag-grey'}>
                    {p.isActive ? 'Live' : 'Hidden'}
                  </span>
                </td>
                <td className="cell-actions">
                  {canEdit && (
                    <>
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="btn btn-sm btn-outline"
                      >
                        Edit
                      </Link>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
