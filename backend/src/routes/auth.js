const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// POST /api/auth/login — exchange credentials for a 7-day JWT.
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await prisma.adminUser.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been disabled' });
    }
    // Role and branchId travel in the token so middleware can authorise
    // (and the socket server can pick the right branch room) without a DB hit.
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  })
);

// GET /api/auth/me — confirm the current session is still valid.
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.admin.id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
      branchId: req.admin.branchId,
    },
  });
});

module.exports = router;
