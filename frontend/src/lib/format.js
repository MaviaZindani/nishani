// Money is stored as plain numbers (PKR); format for display only.
export function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
}

export function dateTime(value) {
  return new Date(value).toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Tailwind-free status colours, keyed to the order lifecycle.
export const STATUS_META = {
  PENDING: { label: 'Pending', color: '#b8860b' },
  ACCEPTED: { label: 'Accepted', color: '#2563eb' },
  DISPATCHED: { label: 'Dispatched', color: '#7c3aed' },
  CLOSED: { label: 'Closed', color: '#16a34a' },
  CANCELLED: { label: 'Cancelled', color: '#dc2626' },
};
