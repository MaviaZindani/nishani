const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { requireRole } = require('../middleware/auth');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();
const ALL_ROLES = Object.values(ROLES);

// Managing admin accounts is exclusive to the Super Admin.
router.use(requireRole(ROLES.SUPER_ADMIN));

// Never expose the password hash.
const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  isActive: u.isActive,
  branchId: u.branchId,
  branch: u.branch || null,
  createdAt: u.createdAt,
});

// GET /api/users — list every admin account.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      include: { branch: true },
    });
    res.json(users.map(publicUser));
  })
);

// POST /api/users — create an Order Handler / Product Manager / Super Admin.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, name, password, role, branchId } = req.body;
    if (!email || !name || !password || !role) {
      return res.status(400).json({ error: 'Email, name, password and role are required' });
    }
    if (!ALL_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Unknown role' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    // Order Handlers must belong to a branch; other roles may stay global.
    if (role === ROLES.ORDER_HANDLER && !branchId) {
      return res.status(400).json({ error: 'Order Handlers must be assigned to a branch' });
    }
    const user = await prisma.adminUser.create({
      data: {
        email: String(email).toLowerCase().trim(),
        name: name.trim(),
        role,
        branchId: branchId ? Number(branchId) : null,
        passwordHash: bcrypt.hashSync(password, 10),
      },
      include: { branch: true },
    });
    res.status(201).json(publicUser(user));
  })
);

// PUT /api/users/:id — update name, role, branch, active status or password.
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const { name, role, isActive, password, branchId } = req.body;
    if (role && !ALL_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Unknown role' });
    }

    // The system must always keep at least one active Super Admin.
    const wouldLoseSuper =
      target.role === ROLES.SUPER_ADMIN &&
      ((role && role !== ROLES.SUPER_ADMIN) || isActive === false);
    if (wouldLoseSuper) {
      const activeSupers = await prisma.adminUser.count({
        where: { role: ROLES.SUPER_ADMIN, isActive: true },
      });
      if (activeSupers <= 1) {
        return res
          .status(400)
          .json({ error: 'There must always be at least one active Super Admin' });
      }
    }

    // An Order Handler (new or existing) must have a branch.
    const effectiveRole = role !== undefined ? role : target.role;
    const effectiveBranch =
      branchId !== undefined ? (branchId ? Number(branchId) : null) : target.branchId;
    if (effectiveRole === ROLES.ORDER_HANDLER && !effectiveBranch) {
      return res.status(400).json({ error: 'Order Handlers must be assigned to a branch' });
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = !!isActive;
    if (branchId !== undefined) data.branchId = branchId ? Number(branchId) : null;
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      data.passwordHash = bcrypt.hashSync(password, 10);
    }
    const user = await prisma.adminUser.update({
      where: { id },
      data,
      include: { branch: true },
    });
    res.json(publicUser(user));
  })
);

// DELETE /api/users/:id — remove an admin account.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === ROLES.SUPER_ADMIN) {
      const supers = await prisma.adminUser.count({ where: { role: ROLES.SUPER_ADMIN } });
      if (supers <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last Super Admin' });
      }
    }
    await prisma.adminUser.delete({ where: { id } });
    res.json({ ok: true });
  })
);

module.exports = router;
