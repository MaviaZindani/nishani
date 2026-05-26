import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useStorefrontStatus } from '../../context/StorefrontStatusContext.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { money } from '../../lib/format.js';

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, clear } = useCart();
  const { acceptingOrders, loading: statusLoading } = useStorefrontStatus();

  if (items.length === 0) {
    return (
      <div className="container section empty">
        <h1 className="section-title">Your cart is empty</h1>
        <p>Add a few flavours to get started.</p>
        <Link to="/" className="btn">Browse flavours</Link>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1 className="section-title">Your cart</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => (
            <div className="cart-item" key={item.productId}>
              <Link to={`/product/${item.slug}`} className="cart-item-media">
                <ProductImage src={item.image} alt={item.name} />
              </Link>
              <div className="cart-item-info">
                <Link to={`/product/${item.slug}`} className="cart-item-name">
                  {item.name}
                </Link>
                <span className="price">{money(item.price)}</span>
              </div>
              <div className="qty-control">
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
              </div>
              <div className="cart-item-total">{money(item.price * item.quantity)}</div>
              <button
                className="link-danger"
                onClick={() => removeItem(item.productId)}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <button className="link-danger cart-clear" onClick={clear}>
            Clear cart
          </button>
        </div>

        <aside className="cart-summary">
          <h3>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="summary-row muted">
            <span>Delivery</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{money(subtotal)}</span>
          </div>
          {acceptingOrders || statusLoading ? (
            <Link to="/checkout" className="btn btn-block">
              Proceed to checkout
            </Link>
          ) : (
            <>
              <button type="button" className="btn btn-block" disabled>
                🔒 Currently closed
              </button>
              <p className="muted cart-closed-note">
                All branches are closed right now. Your cart is saved — please try again
                shortly.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
