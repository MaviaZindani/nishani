import { useAuth } from '../../context/AuthContext.jsx';
import { can } from '../../lib/roles.js';
import Forbidden from './Forbidden.jsx';

// Route guard — renders children only if the signed-in admin's role
// may access `area`, otherwise shows the Forbidden page.
export default function RequireRole({ area, children }) {
  const { user } = useAuth();
  return can(user, area) ? children : <Forbidden />;
}
