import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';
import ProductImage from '../../components/ProductImage.jsx';

const BLANK = {
  name: '',
  categoryId: '',
  price: '',
  description: '',
  inStock: true,
  isActive: true,
  featured: false,
};

// Add / edit a product — handles the main image and multiple cover images.
export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  const [existing, setExisting] = useState(null); // existing product on edit
  const [imageFile, setImageFile] = useState(null);
  const [coverFiles, setCoverFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const cats = await api.get('/categories', { params: { all: 1 } });
      setCategories(cats.data);
      if (isEdit) {
        const { data } = await api.get(`/products/admin/${id}`);
        setExisting(data);
        setForm({
          name: data.name,
          categoryId: String(data.categoryId),
          price: String(data.price),
          description: data.description || '',
          inStock: data.inStock,
          isActive: data.isActive,
          featured: data.featured,
        });
      }
      setLoading(false);
    }
    load().catch((e) => {
      setError(apiError(e));
      setLoading(false);
    });
  }, [id, isEdit]);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function removeCover(imageId) {
    if (!window.confirm('Remove this cover image?')) return;
    await api.delete(`/products/${id}/images/${imageId}`);
    setExisting({ ...existing, images: existing.images.filter((i) => i.id !== imageId) });
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = new FormData();
      body.append('name', form.name);
      body.append('categoryId', form.categoryId);
      body.append('price', form.price);
      body.append('description', form.description);
      body.append('inStock', form.inStock);
      body.append('isActive', form.isActive);
      body.append('featured', form.featured);
      if (imageFile) body.append('image', imageFile);
      coverFiles.forEach((f) => body.append('coverImages', f));

      if (isEdit) await api.put(`/products/${id}`, body);
      else await api.post('/products', body);
      navigate('/admin/products');
    } catch (err) {
      setError(apiError(err));
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="admin-h1">{isEdit ? 'Edit product' : 'Add product'}</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="panel admin-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Product name
            <input value={form.name} onChange={set('name')} required />
          </label>
          <label>
            Category
            <select value={form.categoryId} onChange={set('categoryId')} required>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Price (Rs.)
            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={set('price')}
              required
            />
          </label>
        </div>

        <label>
          Description
          <textarea value={form.description} onChange={set('description')} rows={4} />
        </label>

        <div className="form-grid">
          <label>
            Main image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0] || null)}
            />
          </label>
          <label>
            Cover / gallery images (multiple)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setCoverFiles([...e.target.files])}
            />
          </label>
        </div>

        {isEdit && existing && (
          <div className="image-strip">
            {existing.image && (
              <div className="image-strip-item">
                <ProductImage src={existing.image} alt="" className="cell-thumb" />
                <span className="muted">Current main</span>
              </div>
            )}
            {existing.images.map((img) => (
              <div className="image-strip-item" key={img.id}>
                <ProductImage src={img.url} alt="" className="cell-thumb" />
                <button type="button" className="link-danger" onClick={() => removeCover(img.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="form-checks">
          <label className="check">
            <input type="checkbox" checked={form.inStock} onChange={set('inStock')} />
            In stock
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            Visible on storefront
          </label>
          <label className="check">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} />
            Featured / popular
          </label>
        </div>

        <div className="form-actions">
          <button className="btn" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/admin/products')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
