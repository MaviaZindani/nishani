const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../utils/helpers');
const { isOperational } = require('../utils/routing');

const router = express.Router();

// GET /api/storefront/status — public, used by the storefront to decide
// whether to allow customers to proceed to checkout. A branch counts as
// "operational" only if it is enabled, manually marked open, AND has at
// least one Order Handler currently online.
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const branches = await prisma.branch.findMany({ where: { isActive: true } });
    const operational = branches.filter(isOperational);
    res.json({
      acceptingOrders: operational.length > 0,
      openBranches: operational.length,
      totalBranches: branches.length,
    });
  })
);

module.exports = router;
