import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import ProductImage from '../ProductImage.jsx';
import { money } from '../../lib/format.js';

// Storefront product tile — image, price, and add-to-cart.
export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const soldOut = !product.inStock;

  return (
    <article className={`product-card ${soldOut ? 'is-soldout' : ''}`}>
      <Link to={`/product/${product.slug}`} className="product-card-media">
        <ProductImage src={product.image} alt={product.name} />
        {soldOut && <span className="badge badge-soldout">Out of stock</span>}
        {product.featured && !soldOut && <span className="badge badge-featured">Popular</span>}
      </Link>
      <div className="product-card-body">
        {product.category && <span className="product-card-cat">{product.category.name}</span>}
        <Link to={`/product/${product.slug}`} className="product-card-name">
          {product.name}
        </Link>
        <div className="product-card-foot">
          <span className="price">{money(product.price)}</span>
          <button
            className="btn btn-sm"
            disabled={soldOut}
            onClick={() => addItem(product)}
          >
            {soldOut ? 'Unavailable' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}
