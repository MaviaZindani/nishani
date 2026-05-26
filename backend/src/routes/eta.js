const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { etaForRoute, FALLBACK_MINUTES } = require('../utils/eta');
const { resolveBranchForOrder } = require('../utils/routing');

const router = express.Router();

// GET /api/eta?areaId=<id>&lat=<n>&lng=<n>     (lat/lng optional)
//
// Returns the estimated delivery time for a customer ordering to this area.
// Honours branch open/closed state and live handler presence — if the home
// branch isn't operational, the response describes the redirect.
//
// Response:
//   {
//     minutes:     number,
//     distanceKm:  number | null,
//     precision:   'live' | 'default',
//     branch:      { id, name } | null,    // the branch that will deliver
//     homeBranch:  { id, name, isOpen } | null,
//     available:   boolean,                 // false ⇒ no operational branches
//     redirected:  boolean,                 // true ⇒ not the home branch
//     reason:      string,
//   }
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { areaId, lat, lng } = req.query;
    if (!areaId) return res.status(400).json({ error: 'areaId is required' });

    const cLat = lat != null && lat !== '' ? Number(lat) : null;
    const cLng = lng != null && lng !== '' ? Number(lng) : null;

    const routing = await resolveBranchForOrder({
      areaId,
      customerLat: cLat,
      customerLng: cLng,
    });

    const homeBranchInfo = routing.homeBranch
      ? {
          id: routing.homeBranch.id,
          name: routing.homeBranch.name,
          isOpen: routing.homeBranch.isOpen,
        }
      : null;

    if (!routing.branch) {
      return res.json({
        minutes: FALLBACK_MINUTES,
        distanceKm: null,
        precision: 'default',
        branch: null,
        homeBranch: homeBranchInfo,
        available: false,
        redirected: false,
        reason: routing.reason,
      });
    }

    const branch = routing.branch;
    const branchInfo = { id: branch.id, name: branch.name };
    const haveCustomerCoords = cLat != null && cLng != null && !Number.isNaN(cLat);
    const haveBranchCoords = branch.lat != null && branch.lng != null;

    if (haveCustomerCoords && haveBranchCoords) {
      const { minutes, drivingKm } = etaForRoute(cLat, cLng, branch.lat, branch.lng);
      return res.json({
        minutes,
        distanceKm: drivingKm,
        precision: 'live',
        branch: branchInfo,
        homeBranch: homeBranchInfo,
        available: true,
        redirected: routing.redirected,
        reason: routing.reason,
      });
    }

    res.json({
      minutes: FALLBACK_MINUTES,
      distanceKm: null,
      precision: 'default',
      branch: branchInfo,
      homeBranch: homeBranchInfo,
      available: true,
      redirected: routing.redirected,
      reason: routing.reason,
    });
  })
);

module.exports = router;
