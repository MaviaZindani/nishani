const express = require('express');
const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();

// Income is recognised when an order is CLOSED (delivered & paid, since
// payment is Cash on Delivery). updatedAt marks the moment it closed.
const sum = (rows) => rows.reduce((acc, r) => acc + r.total, 0);
const monthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// GET /api/reports/summary — dashboard numbers (any admin).
// Income figures are included only for the Super Admin.
router.get(
  '/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, pending, accepted, dispatched, closed, cancelled, products, categories] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'ACCEPTED' } }),
        prisma.order.count({ where: { status: 'DISPATCHED' } }),
        prisma.order.count({ where: { status: 'CLOSED' } }),
        prisma.order.count({ where: { status: 'CANCELLED' } }),
        prisma.product.count(),
        prisma.category.count(),
      ]);

    const payload = {
      orders: { total, pending, accepted, dispatched, closed, cancelled },
      catalog: { products, categories },
    };

    if (req.admin.role === ROLES.SUPER_ADMIN) {
      const lifetime = await prisma.order.findMany({
        where: { status: 'CLOSED' },
        select: { total: true, updatedAt: true },
      });
      payload.income = {
        today: sum(lifetime.filter((o) => o.updatedAt >= dayStart)),
        month: sum(lifetime.filter((o) => o.updatedAt >= monthStart)),
        lifetime: sum(lifetime),
      };
    }
    res.json(payload);
  })
);

// GET /api/reports/monthly — income grouped by month (Super Admin only).
router.get(
  '/monthly',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { status: 'CLOSED' },
      select: { total: true, updatedAt: true },
    });
    const buckets = {};
    for (const o of orders) {
      const key = monthKey(new Date(o.updatedAt));
      if (!buckets[key]) buckets[key] = { month: key, orders: 0, income: 0 };
      buckets[key].orders += 1;
      buckets[key].income += o.total;
    }
    res.json(Object.values(buckets).sort((a, b) => b.month.localeCompare(a.month)));
  })
);

// GET /api/reports/orders/export — download orders as .xlsx (Super Admin only).
// Query: ?status=<STATUS|ALL> &from=<date> &to=<date>
router.get(
  '/orders/export',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { status, from, to } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Nishani';
    const ws = wb.addWorksheet('Orders');
    ws.columns = [
      { header: 'Order #', key: 'orderNumber', width: 18 },
      { header: 'Date', key: 'date', width: 22 },
      { header: 'Customer', key: 'customer', width: 22 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Area', key: 'area', width: 18 },
      { header: 'Address', key: 'address', width: 34 },
      { header: 'Items', key: 'items', width: 44 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Delivery', key: 'delivery', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const o of orders) {
      ws.addRow({
        orderNumber: o.orderNumber,
        date: new Date(o.createdAt).toLocaleString(),
        customer: o.customerName,
        phone: o.phone,
        area: o.areaName || '-',
        address: o.address,
        items: o.items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
        subtotal: o.subtotal,
        delivery: o.deliveryCharge,
        total: o.total,
        status: o.status,
      });
    }
    ws.addRow({});
    const totalRow = ws.addRow({ address: 'TOTAL', total: orders.reduce((s, o) => s + o.total, 0) });
    totalRow.font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nishani-orders-${Date.now()}.xlsx"`
    );
    await wb.xlsx.write(res);
    res.end();
  })
);

module.exports = router;
