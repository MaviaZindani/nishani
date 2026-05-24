const express = require('express');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');
const { emitOrders } = require('../socket');
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

// POST /api/orders — place a Cash-on-Delivery order (public/customer).
// Body: { customerName, phone, address, areaId?, notes?, items: [{productId, quantity}] }
// Prices are taken from the database, never trusted from the client.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { customerName, phone, address, areaId, notes, items } = req.body;
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

    // Resolve the delivery area. An unknown id is ignored rather than
    // written onto the order, which would violate the foreign key.
    let deliveryCharge = 0;
    let areaName = '';
    let resolvedAreaId = null;
    if (areaId) {
      const area = await prisma.deliveryArea.findUnique({ where: { id: Number(areaId) } });
      if (area) {
        resolvedAreaId = area.id;
        deliveryCharge = area.charge;
        areaName = area.name;
      }
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName: customerName.trim(),
        phone: String(phone).trim(),
        address: address.trim(),
        areaId: resolvedAreaId,
        areaName,
        notes: notes || '',
        subtotal,
        deliveryCharge,
        total: subtotal + deliveryCharge,
        status: 'PENDING',
        items: { create: lineItems },
      },
      include: { items: true },
    });

    // Live: the new order "drops" onto every order handler's screen.
    emitOrders('order:new', order);
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
// Query: ?status=<STATUS|ALL> &search=<text>
router.get(
  '/',
  requireRole(...HANDLE),
  asyncHandler(async (req, res) => {
    const { status, search } = req.query;
    const where = {};
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
      include: { items: true },
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
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  })
);

// PATCH /api/orders/:id/claim — "pick" an incoming order.
// The conditional updateMany makes this atomic: only the first handler
// to claim a still-PENDING, unclaimed order wins.
router.patch(
  '/:id/claim',
  requireRole(...HANDLE),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const result = await prisma.order.updateMany({
      where: { id, status: 'PENDING', claimedById: null },
      data: {
        status: 'ACCEPTED',
        claimedById: req.admin.id,
        claimedByName: req.admin.name,
      },
    });

    if (result.count === 0) {
      // Lost the race — another handler already picked it.
      const current = await prisma.order.findUnique({ where: { id } });
      return res.status(409).json({
        error: `This order was already picked by ${current?.claimedByName || 'another handler'}`,
      });
    }

    const updated = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    // Live: the card disappears from every order handler's screen.
    emitOrders('order:claimed', {
      orderId: id,
      claimedById: req.admin.id,
      claimedByName: req.admin.name,
      order: updated,
    });
    res.json(updated);
  })
);

// PATCH /api/orders/:id/status — advance an order through its lifecycle.
// Accept (PENDING->ACCEPTED), dispatch (ACCEPTED->DISPATCHED),
// close (DISPATCHED->CLOSED) or cancel.
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
      include: { items: true },
    });
    // Live: keep every order handler's screen in sync.
    emitOrders('order:updated', updated);
    res.json(updated);
  })
);

module.exports = router;
