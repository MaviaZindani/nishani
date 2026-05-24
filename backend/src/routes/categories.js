const express = require('express');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');
const { makeUniqueSlug, asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();

// Categories belong to the catalogue: Product Managers and Super Admin.
const MANAGE = [ROLES.SUPER_ADMIN, ROLES.PRODUCT_MANAGER];

// GET /api/categories — active categories (?all=1 returns hidden ones too).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: req.query.all === '1' ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    res.json(categories);
  })
);

// POST /api/categories — create.
router.post(
  '/',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    const { name, sortOrder, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: await makeUniqueSlug('category', name),
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(category);
  })
);

// PUT /api/categories/:id — update.
router.put(
  '/:id',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name, sortOrder, isActive } = req.body;
    const data = {};
    if (name !== undefined) {
      data.name = name.trim();
      data.slug = await makeUniqueSlug('category', name, id);
    }
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) data.isActive = !!isActive;
    const category = await prisma.category.update({ where: { id }, data });
    res.json(category);
  })
);

// DELETE /api/categories/:id — blocked while products still reference it.
router.delete(
  '/:id',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.status(400).json({
        error: `Move or delete the ${productCount} product(s) in this category first`,
      });
    }
    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  })
);

module.exports = router;
