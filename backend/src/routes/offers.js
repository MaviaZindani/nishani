const express = require('express');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');
const { upload, fileUrl } = require('../middleware/upload');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();

// Offers / promotions: Product/Offer Managers and Super Admin.
const MANAGE = [ROLES.SUPER_ADMIN, ROLES.PRODUCT_MANAGER];

const toBool = (v) => v === true || v === 'true' || v === '1' || v === 'on';
const VIDEO = /\.(mp4|webm|ogg|mov)$/i;

// GET /api/offers — active offers (?all=1 returns inactive too). Public.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const offers = await prisma.offer.findMany({
      where: req.query.all === '1' ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(offers);
  })
);

// POST /api/offers — create an offer banner with an image or video.
router.post(
  '/',
  requireRole(...MANAGE),
  upload.single('media'),
  asyncHandler(async (req, res) => {
    const { title, linkUrl, sortOrder, isActive } = req.body;
    if (!title) return res.status(400).json({ error: 'Offer title is required' });
    const media = req.file ? fileUrl(req.file) : null;
    const offer = await prisma.offer.create({
      data: {
        title: title.trim(),
        mediaUrl: media,
        mediaType: media && VIDEO.test(req.file.originalname) ? 'video' : 'image',
        linkUrl: linkUrl || null,
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive === undefined ? true : toBool(isActive),
      },
    });
    res.status(201).json(offer);
  })
);

// PUT /api/offers/:id — update; a new file replaces the media.
router.put(
  '/:id',
  requireRole(...MANAGE),
  upload.single('media'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { title, linkUrl, sortOrder, isActive } = req.body;
    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (linkUrl !== undefined) data.linkUrl = linkUrl || null;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) data.isActive = toBool(isActive);
    if (req.file) {
      data.mediaUrl = fileUrl(req.file);
      data.mediaType = VIDEO.test(req.file.originalname) ? 'video' : 'image';
    }
    res.json(await prisma.offer.update({ where: { id }, data }));
  })
);

// DELETE /api/offers/:id.
router.delete(
  '/:id',
  requireRole(...MANAGE),
  asyncHandler(async (req, res) => {
    await prisma.offer.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  })
);

module.exports = router;
