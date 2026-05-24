// Admin roles — must match backend src/utils/helpers.js ROLES.
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORDER_HANDLER: 'ORDER_HANDLER',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
};

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ORDER_HANDLER: 'Order Handler',
  PRODUCT_MANAGER: 'Product / Offer Manager',
};

// Roles a Super Admin can assign when creating accounts.
export const ROLE_OPTIONS = [
  { value: 'ORDER_HANDLER', label: 'Order Handler' },
  { value: 'PRODUCT_MANAGER', label: 'Product / Offer Manager' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

// Which roles may access each admin area. Mirrors the backend route guards.
export const ACCESS = {
  dashboard: ['SUPER_ADMIN', 'ORDER_HANDLER', 'PRODUCT_MANAGER'],
  orders: ['SUPER_ADMIN', 'ORDER_HANDLER'],
  products: ['SUPER_ADMIN', 'ORDER_HANDLER', 'PRODUCT_MANAGER'], // list view
  productEdit: ['SUPER_ADMIN', 'PRODUCT_MANAGER'], // add / edit / delete
  categories: ['SUPER_ADMIN', 'PRODUCT_MANAGER'],
  areas: ['SUPER_ADMIN', 'ORDER_HANDLER'],
  offers: ['SUPER_ADMIN', 'PRODUCT_MANAGER'],
  reports: ['SUPER_ADMIN'],
  users: ['SUPER_ADMIN'],
};

// True when `user` (with a `.role`) may access `area`.
export const can = (user, area) => !!user && (ACCESS[area] || []).includes(user.role);
