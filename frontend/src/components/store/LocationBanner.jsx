import { useGeoLocation } from '../../context/GeoLocationContext.jsx';

// Non-intrusive prompt asking the customer to share their location for
// accurate delivery times. Floats at the bottom-right, can be skipped,
// disappears for good once the user grants or dismisses it (or if the
// browser has already granted permission).
export default function LocationBanner() {
  const { coords, status, request, dismiss } = useGeoLocation();

  // Hide once we have coords or the user has opted out — never nag again.
  if (coords) return null;
  if (status === 'dismissed' || status === 'denied' || status === 'unsupported') return null;

  return (
    <div className="location-banner" role="dialog" aria-live="polite">
      <div className="location-banner-text">
        <strong>📍 See accurate delivery times</strong>
        <p className="muted">
          Share your location and we'll show the exact ETA for your address. You can also skip
          and enter your area manually.
        </p>
      </div>
      <div className="location-banner-actions">
        <button
          className="btn btn-sm"
          onClick={request}
          disabled={status === 'requesting'}
        >
          {status === 'requesting' ? 'Locating…' : 'Allow location'}
        </button>
        <button className="btn btn-sm btn-outline" onClick={dismiss}>
          Skip
        </button>
      </div>
    </div>
  );
}
