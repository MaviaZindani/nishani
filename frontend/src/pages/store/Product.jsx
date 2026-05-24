import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useCart } from '../../context/CartContext.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import Loader from '../../components/Loader.jsx';
import { money } from '../../lib/format.js';

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [active, setActive] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .get(`/products/${slug}`)
      .then((r) => {
        setProduct(r.data);
        setActive(r.data.image || r.data.images?.[0]?.url || null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader />;
  if (notFound || !product)
    return (
      <div className="container section empty">
        <p>This product could not be found.</p>
        <Link to="/" className="btn">Back to home</Link>
      </div>
    );

  const gallery = [product.image, ...product.images.map((i) => i.url)].filter(Boolean);
  const soldOut = !product.inStock;

  return (
    <div className="container section">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        {product.category && (
          <>
            {' / '}
            <Link to={`/category/${product.category.slug}`}>{product.category.name}</Link>
          </>
        )}
        {' / '}
        <span>{product.name}</span>
      </div>

      <div className="product-detail">
        <div className="product-gallery">
          <div className="product-gallery-main">
            <ProductImage src={active} alt={product.name} />
          </div>
          {gallery.length > 1 && (
            <div className="product-gallery-thumbs">
              {gallery.map((url) => (
                <button
                  key={url}
                  className={`thumb ${url === active ? 'thumb-active' : ''}`}
                  onClick={() => setActive(url)}
                >
                  <ProductImage src={url} alt={product.name} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          {product.category && (
            <span className="product-card-cat">{product.category.name}</span>
          )}
          <h1>{product.name}</h1>
          <div className="product-price">{money(product.price)}</div>
          <p className="product-desc">{product.description}</p>

          {soldOut ? (
            <p className="soldout-note">This flavour is currently out of stock.</p>
          ) : (
            <div className="product-actions">
              <div className="qty-control">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)}>+</button>
              </div>
              <button className="btn" onClick={() => addItem(product, qty)}>
                Add to cart
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  addItem(product, qty);
                  navigate('/cart');
                }}
              >
                Buy now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
