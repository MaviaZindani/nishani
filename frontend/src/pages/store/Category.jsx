import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import ProductCard from '../../components/store/ProductCard.jsx';
import Loader from '../../components/Loader.jsx';

export default function Category() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/products', { params: { category: slug } }),
      api.get('/categories'),
    ])
      .then(([p, c]) => {
        setProducts(p.data);
        setCategories(c.data);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const current = categories.find((c) => c.slug === slug);

  if (loading) return <Loader />;

  return (
    <div className="container section">
      <h1 className="section-title">{current ? current.name : 'Flavours'}</h1>

      <div className="chip-row">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/category/${c.slug}`}
            className={`chip ${c.slug === slug ? 'chip-active' : ''}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="empty">No products in this category yet.</p>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
