import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import ProductCard from '../../components/store/ProductCard.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import Loader from '../../components/Loader.jsx';

// Renders one promotional offer — video, image, or a title-only banner.
function OfferBanner({ offer }) {
  const inner =
    offer.mediaType === 'video' && offer.mediaUrl ? (
      <video src={offer.mediaUrl} autoPlay muted loop playsInline />
    ) : offer.mediaUrl ? (
      <img src={offer.mediaUrl} alt={offer.title} />
    ) : (
      <div className="offer-fallback">
        <span>{offer.title}</span>
      </div>
    );
  const card = <div className="offer-banner">{inner}</div>;
  return offer.linkUrl ? <a href={offer.linkUrl}>{card}</a> : card;
}

export default function Home() {
  const [params] = useSearchParams();
  const search = params.get('search') || '';

  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (search) {
      api
        .get('/products', { params: { search } })
        .then((r) => setResults(r.data))
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      api.get('/offers'),
      api.get('/categories'),
      api.get('/products', { params: { featured: 1 } }),
    ])
      .then(([o, c, f]) => {
        setOffers(o.data);
        setCategories(c.data);
        setFeatured(f.data);
      })
      .finally(() => setLoading(false));
  }, [search]);

  if (loading) return <Loader />;

  // --- Search results view ---
  if (search) {
    return (
      <div className="container section">
        <h1 className="section-title">Results for “{search}”</h1>
        {results.length === 0 ? (
          <p className="empty">No flavours matched your search.</p>
        ) : (
          <div className="product-grid">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Home view ---
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <p className="hero-kicker">Flavours of crave</p>
            <h1>A treat for your taste buds, delivered cold to your door.</h1>
            <p className="hero-sub">
              Hand-churned ice cream, kulfi and desserts. Order online — pay cash on delivery.
            </p>
            <Link to="/category/regular-flavour" className="btn btn-lg">
              Browse the menu
            </Link>
          </div>
          <div className="hero-art">🍨🍦🍧</div>
        </div>
      </section>

      {offers.length > 0 && (
        <section className="container section">
          <div className="offer-row">
            {offers.map((o) => (
              <OfferBanner key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      <section className="container section">
        <h2 className="section-title">Shop by category</h2>
        <div className="category-grid">
          {categories.map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} className="category-tile">
              <span className="category-tile-icon">🍦</span>
              <span className="category-tile-name">{c.name}</span>
              <span className="category-tile-count">{c._count?.products ?? 0} flavours</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section">
        <h2 className="section-title">Popular right now</h2>
        {featured.length === 0 ? (
          <p className="empty">No featured products yet.</p>
        ) : (
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
