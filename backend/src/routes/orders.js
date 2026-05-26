const express = require('express');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');
const { emitToBranch } = require('../socket');
const { resolveBranchForOrder } = require('../utils/routing');
const {
  asyncHandler,
  generateOrderNumber,
  ORDER_STATUSES,
  STATUS_FLOW,
  ROLES,
} = require('../utils/helpers');

const router = express.Router();

// Processing orders: Order Handlers and Super Admin.
const HANDLE = [ROLES.SUPER_ADMIN, ROLES.ORDER_HANDLER];

// True when this admin may act on this order. Super Admin acts on any order;
// an Order Handler may act only on orders routed to their own branch.
function sameBranch(admin, order) {
  return admin.role === ROLES.SUPER_ADMIN || admin.branchId === order.branchId;
}

// POST /api/orders — place a Cash-on-Delivery order (public/customer).
// Body: { customerName, phone, address, areaId?, notes?, items: [{productId, quantity}] }
// Prices are taken from the database, never trusted from the client.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      customerName,
      phone,
      address,
      areaId,
      notes,
      items,
      lat,
      lng,
      estimatedMinutes,
    } = req.body;
    if (!customerName || !phone || !address) {
      return res.status(400).json({ error: 'Name, phone and address are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    const ids = items.map((i) => Number(i.productId));
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const lineItems = [];
    for (const item of items) {
      const product = byId.get(Number(item.productId));
      if (!product) {
        return res.status(400).json({ error: 'A product in your cart is no longer available' });
      }
      if (!product.inStock) {
        return res.status(400).json({ error: `${product.name} is out of stock` });
      }
      const quantity = Math.max(1, Number(item.quantity) || 1);
      subtotal += product.price * quantity;
      lineItems.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
      });
    }

    // Decide which branch will fulfil this order. The home branch (the
    // area's branch) is preferred, but if it's manually closed or has no
    // Order Handler online, the order is transparently re-routed to the
    // nearest operational branch.
    const routing = await resolveBranchForOrder({
      areaId,
      customerLat: lat != null && lat !== '' ? Number(lat) : null,
      customerLng: lng != null && lng !== '' ? Number(lng) : null,
    });
    if (!routing.branch) {
      return res.status(503).json({
        error: 'No branches are currently open and online. Please try again in a few minutes.',
      });
    }
    const area = routing.area;
    const resolvedAreaId = area ? area.id : null;
    const deliveryCharge = area ? area.charge : 0;
    const areaName = area ? area.name : '';
    const branchId = routing.branch.id;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName: customerName.trim(),
        phone: String(phone).trim(),
        address: address.trim(),
        areaId: resolvedAreaId,
        areaName,
        branchId,
        notes: notes || '',
        subtotal,
        deliveryCharge,
        total: subtotal + deliveryCharge,
        status: 'PENDING',
        // Snapshots of the live location + ETA the customer agreed to.
        customerLat: lat != null && lat !== '' ? Number(lat) : null,
        customerLng: lng != null && lng !== '' ? Number(lng) : null,
        estimatedMinutes:
          estimatedMinutes != null && estimatedMinutes !== ''
            ? Number(estimatedMinutes)
            : null,
        items: { create: lineItems },
      },
      include: { items: true, branch: true },
    });

    // Live: this order drops onto this branch's handlers + every Super Admin.
    emitToBranch(branchId, 'order:new', order);
    res.status(201).json(order);
  })
);

// GET /api/orders/track/:orderNumber — customer order tracking (public).
router.get(
  '/track/:orderNumber',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber.trim() },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'No order found with that number' });
    res.json(order);
  })
);

// GET /api/orders — order list for the admin portal.
// Handlers see only their own branch; Super Admin sees everything.
// Query: ?status=<STATUS|ALL> &search=<text>
router.get(
  '/',
  requireRole(...HANDLE),
  asyncHandler(async (req, res) => {
    const { status, search } = req.query;
    const where = {};
    if (req.admin.role !== ROLES.SUPER_ADMIN) {
      // -1 deliberately matches no rows when a handler has no branch yet.
      where.branchId = req.admin.branchId ?? -1;
    }
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: String(search) } },
        { customerName: { contains: String(search) } },
        { phone: { contains: String(search) } },
      ];
    }
    const orders = await prisma.order.findMany({
      where,
      include: { items: true, branch: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  })
);

// GET /api/orders/:id — full order detail.
router.get(
  '/:id',
  requireRole(...HANDLE),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true, branch: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!sameBranch(req.admin, order)) {
      return res.status(403).json({ error: 'This order belongs to another branch' });
    }
    res.json(order);
  })
);

// PATCH /api/orders/:id/claim — "pick" an incoming order. Atomic: only the
// first handler in the matching branch to claim a still-PENDING order wins.
router.patch(
  '/:id/claim',
  requireRole(...HANDLE),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!sameBranch(req.admin, order)) {
      return res.status(403).json({ error: 'This order belongs to another branch' });
    }

    const result = await prisma.order.updateMany({
      where: { id, status: 'PENDING', claimedById: null },
      data: {
        status: 'ACCEPTED',
        claimedById: req.admin.id,
        claimedByName: req.admin.name,
      },
    });

    if (result.count === 0) {
      const current = await prisma.order.findUnique({ where: { id } });
      return res.status(409).json({
        error: `This order was already picked by ${current?.claimedByName || 'another handler'}`,
      });
    }

    const updated = await prisma.order.findUnique({
      where: { id },
      include: { items: true, branch: true },
    });
    emitToBranch(order.branchId, 'order:claimed', {
      orderId: id,
      claimedById: req.admin.id,
      claimedByName: req.admin.name,
      order: updated,
    });
    res.json(updated);
  })
);

// PATCH /api/orders/:id/status — accept / dispatch / close / cancel.
router.patch(
  '/:id/status',
  requireRole(...HANDLE),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Unknown order status' });
    }
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!sameBranch(req.admin, order)) {
      return res.status(403).json({ error: 'This order belongs to another branch' });
    }

    const allowed = STATUS_FLOW[order.status] || [];
    if (status !== order.status && !allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `An order that is ${order.status} cannot be moved to ${status}` });
    }

    const data = { status };
    // Accepting an unclaimed order also assigns it to this handler.
    if (status === 'ACCEPTED' && !order.claimedById) {
      data.claimedById = req.admin.id;
      data.claimedByName = req.admin.name;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data,
      include: { items: true, branch: true },
    });
    emitToBranch(order.branchId, 'order:updated', updated);
    res.json(updated);
  })
);

module.exports = router;
