import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container section empty">
      <div className="notfound-art">🍦</div>
      <h1 className="section-title">Page not found</h1>
      <p>The page you’re looking for has melted away.</p>
      <Link to="/" className="btn">Back to home</Link>
    </div>
  );
}
