const jwt = require('jsonwebtoken');

// Decodes and verifies the admin JWT from the Authorization header.
// Returns the payload, or null when missing/invalid.
function readToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Requires any signed-in admin. Attaches the payload to req.admin.
function requireAuth(req, res, next) {
  const admin = readToken(req);
  if (!admin) return res.status(401).json({ error: 'Authentication required' });
  req.admin = admin;
  next();
}

// Requires a signed-in admin whose role is one of `roles`.
// Usage: router.post('/', requireRole('SUPER_ADMIN', 'PRODUCT_MANAGER'), ...)
function requireRole(...roles) {
  return (req, res, next) => {
    const admin = readToken(req);
    if (!admin) return res.status(401).json({ error: 'Authentication required' });
    req.admin = admin;
    if (!roles.includes(admin.role)) {
      return res
        .status(403)
        .json({ error: 'Your role does not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
