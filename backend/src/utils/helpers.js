const prisma = require('../lib/prisma');

// "Vanilla Crunch!" -> "vanilla-crunch"
function slugify(str) {
  return (
    String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'item'
  );
}

// Returns a slug that is unique for the given model, appending -1, -2, ...
// when needed. Pass currentId when updating so a row keeps its own slug.
async function makeUniqueSlug(model, name, currentId = null) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await prisma[model].findUnique({ where: { slug } });
    if (!existing || existing.id === currentId) return slug;
    slug = `${base}-${n++}`;
  }
}

// Human-friendly, collision-resistant order code, e.g. "NSH-LXK3F2ABC".
function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `NSH-${ts}${rand}`;
}

// Admin roles for role-based access control.
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORDER_HANDLER: 'ORDER_HANDLER',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
};

const ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'DISPATCHED', 'CLOSED', 'CANCELLED'];

// Which statuses an order may move to from its current status.
const STATUS_FLOW = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

// Wraps an async route so thrown errors reach the Express error handler.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  slugify,
  makeUniqueSlug,
  generateOrderNumber,
  ROLES,
  ORDER_STATUSES,
  STATUS_FLOW,
  asyncHandler,
};
