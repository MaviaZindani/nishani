const prisma = require('../lib/prisma');
const { countOnlineHandlers } = require('../socket');
const { haversineKm } = require('./eta');

// Returns true if a branch can take new orders right now: it must be
// enabled, manually-marked open, AND have at least one Order Handler
// currently connected via Socket.IO.
function isOperational(branch) {
  if (!branch) return false;
  if (!branch.isActive || !branch.isOpen) return false;
  return countOnlineHandlers(branch.id) > 0;
}

// Decides which branch should fulfil an order. Prefers the home branch
// (area.branch); if it isn't operational, picks the nearest operational
// branch — using the customer's live coordinates when available,
// otherwise the home branch's coordinates as a reference point.
//
// Returns:
//   {
//     branch:      <Branch|null>,    // the chosen branch, or null if none available
//     area:        <DeliveryArea|null>,
//     homeBranch:  <Branch|null>,    // the area's own branch (for "redirected from" UI)
//     redirected:  <boolean>,        // true when not the home branch
//     reason:      'home' | 'home-closed' | 'no-handlers' | 'home-disabled'
//                  | 'no-handlers-anywhere' | 'no-home-branch' | 'area-not-found',
//   }
async function resolveBranchForOrder({ areaId, customerLat, customerLng }) {
  const area = areaId
    ? await prisma.deliveryArea.findUnique({
        where: { id: Number(areaId) },
        include: { branch: true },
      })
    : null;

  const homeBranch = area?.branch || null;

  if (areaId && !area) {
    return { branch: null, area: null, homeBranch: null, redirected: false, reason: 'area-not-found' };
  }

  if (isOperational(homeBranch)) {
    return { branch: homeBranch, area, homeBranch, redirected: false, reason: 'home' };
  }

  // Need an alternative.
  const candidates = await prisma.branch.findMany({
    where: { isActive: true, isOpen: true },
  });
  const operational = candidates.filter((b) => countOnlineHandlers(b.id) > 0);

  if (operational.length === 0) {
    return {
      branch: null,
      area,
      homeBranch,
      redirected: false,
      reason: !homeBranch
        ? 'no-home-branch'
        : !homeBranch.isActive
          ? 'home-disabled'
          : !homeBranch.isOpen
            ? 'home-closed'
            : 'no-handlers-anywhere',
    };
  }

  // Choose nearest operational branch. Prefer the customer's actual
  // coordinates; fall back to the home branch's coordinates.
  const refLat = customerLat ?? homeBranch?.lat;
  const refLng = customerLng ?? homeBranch?.lng;
  let chosen = operational[0];
  if (refLat != null && refLng != null) {
    const sortable = operational
      .filter((b) => b.lat != null && b.lng != null)
      .map((b) => ({ b, d: haversineKm(refLat, refLng, b.lat, b.lng) }))
      .sort((a, z) => a.d - z.d);
    if (sortable.length) chosen = sortable[0].b;
  }

  return {
    branch: chosen,
    area,
    homeBranch,
    redirected: true,
    reason: !homeBranch?.isOpen ? 'home-closed' : 'no-handlers',
  };
}

module.exports = { resolveBranchForOrder, isOperational };
