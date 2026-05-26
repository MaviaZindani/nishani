// Estimated-delivery-time helpers. Kept dead simple — no external mapping
// service required. If you switch to a real routing API (Google Distance
// Matrix, Mapbox, etc.), replace the body of `etaForRoute` only.

// Calibration constants — tweak to match your real fulfilment.
const PREP_MIN = 15; // food prep + packing
const BUFFER_MIN = 5; // safety margin
const PER_KM_MIN = 2.5; // average city motorbike pace
const ROUTING_FACTOR = 1.4; // straight-line → real driving distance in dense cities

// Fallback when we can't compute a distance (no coords, no branch coords).
const FALLBACK_MINUTES = 45;

// Great-circle distance between two lat/lng points, in km.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Returns `{ minutes, drivingKm }` for a customer at (cLat, cLng) being
// delivered from a branch at (bLat, bLng).
function etaForRoute(cLat, cLng, bLat, bLng) {
  const straightKm = haversineKm(cLat, cLng, bLat, bLng);
  const drivingKm = +(straightKm * ROUTING_FACTOR).toFixed(1);
  const minutes = Math.round(PREP_MIN + straightKm * ROUTING_FACTOR * PER_KM_MIN + BUFFER_MIN);
  return { minutes, drivingKm };
}

module.exports = { haversineKm, etaForRoute, FALLBACK_MINUTES };
