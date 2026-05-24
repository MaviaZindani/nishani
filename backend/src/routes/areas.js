const express = require('express');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();

// Delivery zones relate to order fulfilment: Order Handlers and Super Admin.
const MANAGE = [ROLES.SUPER_ADMIN, ROLES.ORDER_HANDLER];

// GET /api/areas — delivery zones for the checkout dropdown.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const areas = await prisma.deliveryArea.findMany({
      where: req.query.all === '1' ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(areas);
  })
);

// POST /api/areas — create a delivery zone.
router.post(
  '/',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    const { name, charge, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'Area name is required' });
    const area = await prisma.deliveryArea.create({
      data: {
        name: name.trim(),
        charge: Number(charge) || 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(area);
  })
);

// PUT /api/areas/:id — update a delivery zone.
router.put(
  '/:id',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    const { name, charge, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (charge !== undefined) data.charge = Number(charge) || 0;
    if (isActive !== undefined) data.isActive = !!isActive;
    res.json(await prisma.deliveryArea.update({ where: { id: Number(req.params.id) }, data }));
  })
);

// DELETE /api/areas/:id — past orders keep their area name snapshot.
router.delete(
  '/:id',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    await prisma.deliveryArea.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  })
);

module.exports = router;
