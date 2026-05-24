import { Link } from 'react-router-dom';

// Shown when an admin opens a page their role cannot access.
export default function Forbidden() {
  return (
    <div className="forbidden">
      <div className="forbidden-art">🔒</div>
      <h1 className="admin-h1">Access restricted</h1>
      <p className="muted">Your role does not have permission to view this page.</p>
      <Link to="/admin" className="btn">
        Back to dashboard
      </Link>
    </div>
  );
}
