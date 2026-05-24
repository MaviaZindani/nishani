// The forward action available for an order at each status.
export const NEXT_ACTION = {
  PENDING: { status: 'ACCEPTED', label: 'Accept' },
  ACCEPTED: { status: 'DISPATCHED', label: 'Dispatch' },
  DISPATCHED: { status: 'CLOSED', label: 'Close order' },
};

// Statuses from which an order may still be cancelled.
export const CAN_CANCEL = ['PENDING', 'ACCEPTED', 'DISPATCHED'];

export const STATUS_TABS = ['ALL', 'PENDING', 'ACCEPTED', 'DISPATCHED', 'CLOSED', 'CANCELLED'];
