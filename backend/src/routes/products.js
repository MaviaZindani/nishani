const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, fileUrl } = require('../middleware/upload');
const { makeUniqueSlug, asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();

// Adding / editing / deleting products: Product Managers and Super Admin.
const MANAGE = [ROLES.SUPER_ADMIN, ROLES.PRODUCT_MANAGER];
// Marking a product out of stock: also allowed for Order Handlers.
const STOCK = [ROLES.SUPER_ADMIN, ROLES.PRODUCT_MANAGER, ROLES.ORDER_HANDLER];

// One main image + up to 8 cover/gallery images per request.
const productUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'coverImages', maxCount: 8 },
]);

// Form fields arrive as strings via multipart; normalise to boolean.
const toBool = (v) => v === true || v === 'true' || v === '1' || v === 'on';

// GET /api/products — storefront listing (visible products only).
// Query: ?category=<slug> &search=<text> &featured=1
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, search, featured } = req.query;
    const where = { isActive: true };
    if (category) where.category = { slug: category };
    if (featured === '1') where.featured = true;
    if (search) where.name = { contains: String(search) };
    const products = await prisma.product.findMany({
      where,
      include: { category: true, images: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  })
);

// GET /api/products/admin/all — every product, including hidden (any admin).
router.get(
  '/admin/all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true, images: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  })
);

// GET /api/products/admin/:id — single product by id, for the edit form (any admin).
router.get(
  '/admin/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true, images: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  })
);

// GET /api/products/:slug — single product by slug.
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { category: true, images: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  })
);

// POST /api/products — create with image + cover images.
router.post(
  '/',
  requireRole(...MANAGE),
  productUpload,
  asyncHandler(async (req, res) => {
    const { name, description, price, categoryId, inStock, isActive, featured } = req.body;
    if (!name || price === undefined || !categoryId) {
      return res.status(400).json({ error: 'Name, price and category are required' });
    }
    const covers = (req.files?.coverImages || []).map(fileUrl);
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: await makeUniqueSlug('product', name),
        description: description || '',
        price: Number(price),
        image: req.files?.image?.[0] ? fileUrl(req.files.image[0]) : null,
        categoryId: Number(categoryId),
        inStock: inStock === undefined ? true : toBool(inStock),
        isActive: isActive === undefined ? true : toBool(isActive),
        featured: toBool(featured),
        images: { create: covers.map((url) => ({ url })) },
      },
      include: { category: true, images: true },
    });
    res.status(201).json(product);
  })
);

// PUT /api/products/:id — update fields; new uploads are appended.
router.put(
  '/:id',
  requireRole(...MANAGE),
  productUpload,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { name, description, price, categoryId, inStock, isActive, featured } = req.body;
    const data = {};
    if (name !== undefined) {
      data.name = name.trim();
      data.slug = await makeUniqueSlug('product', name, id);
    }
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = Number(price);
    if (categoryId !== undefined) data.categoryId = Number(categoryId);
    if (inStock !== undefined) data.inStock = toBool(inStock);
    if (isActive !== undefined) data.isActive = toBool(isActive);
    if (featured !== undefined) data.featured = toBool(featured);
    if (req.files?.image?.[0]) data.image = fileUrl(req.files.image[0]);

    const newCovers = (req.files?.coverImages || []).map(fileUrl);
    if (newCovers.length) data.images = { create: newCovers.map((url) => ({ url })) };

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, images: true },
    });
    res.json(product);
  })
);

// PATCH /api/products/:id/stock — toggle / set out-of-stock flag.
router.patch(
  '/:id/stock',
  requireRole(...STOCK),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const inStock =
      req.body.inStock === undefined ? !product.inStock : toBool(req.body.inStock);
    res.json(await prisma.product.update({ where: { id }, data: { inStock } }));
  })
);

// DELETE /api/products/:id/images/:imageId — remove one cover image.
router.delete(
  '/:id/images/:imageId',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    await prisma.productImage.delete({ where: { id: Number(req.params.imageId) } });
    res.json({ ok: true });
  })
);

// DELETE /api/products/:id — remove the product. Past order items keep
// their snapshot (productId is set to null), so history is preserved.
router.delete(
  '/:id',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  })
);

module.exports = router;
