import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client';
import Loader from '../../components/Loader.jsx';

const BLANK = { title: '', linkUrl: '', sortOrder: 0 };

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [media, setMedia] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/offers', { params: { all: 1 } });
    setOffers(data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  // Create an offer banner from a title plus an optional image/video.
  async function create(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = new FormData();
      body.append('title', form.title);
      body.append('linkUrl', form.linkUrl);
      body.append('sortOrder', form.sortOrder);
      if (media) body.append('media', media);
      const { data } = await api.post('/offers', body);
      setOffers((prev) => [data, ...prev]);
      setForm(BLANK);
      setMedia(null);
      e.target.reset();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(offer) {
    const { data } = await api.put(`/offers/${offer.id}`, { isActive: !offer.isActive });
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? data : o)));
  }

  async function remove(offer) {
    if (!window.confirm(`Delete offer "${offer.title}"?`)) return;
    await api.delete(`/offers/${offer.id}`);
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
  }

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="admin-h1">Offers &amp; Promotions</h1>
      <p className="muted">
        Offers appear as banners on the storefront home page. Upload an image or a short video.
      </p>

      <form className="panel admin-form" onSubmit={create}>
        <h2 className="admin-h2">New offer</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label>
            Link URL (optional)
            <input
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="/category/kulfi"
            />
          </label>
          <label>
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </label>
        </div>
        <label>
          Image or video
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setMedia(e.target.files[0] || null)}
          />
        </label>
        <button className="btn" disabled={saving}>
          {saving ? 'Saving…' : '+ Create offer'}
        </button>
      </form>

      <div className="offer-admin-grid">
        {offers.map((offer) => (
          <div className={`panel offer-admin-card ${offer.isActive ? '' : 'is-off'}`} key={offer.id}>
            <div className="offer-admin-media">
              {offer.mediaType === 'video' && offer.mediaUrl ? (
                <video src={offer.mediaUrl} muted loop />
              ) : offer.mediaUrl ? (
                <img src={offer.mediaUrl} alt={offer.title} />
              ) : (
                <div className="offer-fallback">
                  <span>{offer.title}</span>
                </div>
              )}
            </div>
            <div className="offer-admin-body">
              <strong>{offer.title}</strong>
              <span className="tag tag-grey">{offer.mediaType}</span>
              <div className="cell-actions">
                <button className="btn btn-sm btn-outline" onClick={() => toggleActive(offer)}>
                  {offer.isActive ? 'Active' : 'Hidden'}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(offer)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {offers.length === 0 && <p className="empty">No offers yet.</p>}
      </div>
    </div>
  );
}
