const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { countOnlineHandlers } = require('../socket');
const { asyncHandler, makeUniqueSlug, ROLES } = require('../utils/helpers');

const router = express.Router();

// Enrich a branch with its current live handler count.
const withOnline = (b) => ({ ...b, onlineHandlers: countOnlineHandlers(b.id) });

// GET /api/branches — every signed-in admin can read (for dropdowns).
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const branches = await prisma.branch.findMany({
      where: req.query.all === '1' ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { admins: true, orders: true, areas: true } },
      },
    });
    res.json(branches.map(withOnline));
  })
);

// POST /api/branches — create a branch (Super Admin).
router.post(
  '/',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { name, city, address, phone, lat, lng, isActive, isOpen } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name is required' });
    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        slug: await makeUniqueSlug('branch', name),
        city: city || '',
        address: address || '',
        phone: phone || '',
        lat: lat != null && lat !== '' ? Number(lat) : null,
        lng: lng != null && lng !== '' ? Number(lng) : null,
        isActive: isActive !== false,
        isOpen: isOpen !== false,
      },
    });
    res.status(201).json(withOnline(branch));
  })
);

// PUT /api/branches/:id — update (Super Admin).
router.put(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name, city, address, phone, lat, lng, isActive, isOpen } = req.body;
    const data = {};
    if (name !== undefined) {
      data.name = name.trim();
      data.slug = await makeUniqueSlug('branch', name, id);
    }
    if (city !== undefined) data.city = city;
    if (address !== undefined) data.address = address;
    if (phone !== undefined) data.phone = phone;
    if (lat !== undefined) data.lat = lat == null || lat === '' ? null : Number(lat);
    if (lng !== undefined) data.lng = lng == null || lng === '' ? null : Number(lng);
    if (isActive !== undefined) data.isActive = !!isActive;
    if (isOpen !== undefined) data.isOpen = !!isOpen;
    const updated = await prisma.branch.update({ where: { id }, data });
    res.json(withOnline(updated));
  })
);

// PATCH /api/branches/:id/open — toggle the manual open/closed flag.
// Allowed for the Super Admin, or for an Order Handler if it's their own
// branch (so handlers can pause/resume from the admin topbar).
router.patch(
  '/:id/open',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { admin } = req;
    if (admin.role !== ROLES.SUPER_ADMIN) {
      if (admin.role !== ROLES.ORDER_HANDLER || admin.branchId !== id) {
        return res.status(403).json({ error: 'You may only toggle your own branch' });
      }
    }
    const { isOpen } = req.body;
    const updated = await prisma.branch.update({
      where: { id },
      data: { isOpen: !!isOpen },
    });
    res.json(withOnline(updated));
  })
);

// DELETE /api/branches/:id — blocked while anything still references it.
router.delete(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [admins, orders, areas] = await Promise.all([
      prisma.adminUser.count({ where: { branchId: id } }),
      prisma.order.count({ where: { branchId: id } }),
      prisma.deliveryArea.count({ where: { branchId: id } }),
    ]);
    if (admins + orders + areas > 0) {
      return res.status(400).json({
        error: `This branch is in use (${admins} admin(s), ${orders} order(s), ${areas} area(s)). Reassign them first.`,
      });
    }
    await prisma.branch.delete({ where: { id } });
    res.json({ ok: true });
  })
);

module.exports = router;
