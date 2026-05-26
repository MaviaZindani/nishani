import { createContext, useContext, useEffect, useState } from 'react';

// Site-wide customer location. Captured once at first visit, then reused
// across pages (cart, checkout, ETA card) without prompting again.
//
// Storage:
//   localStorage.nishani_location           → { lat, lng, timestamp }
//   localStorage.nishani_location_dismissed → '1' if the user clicked Skip
//
// status one of: 'idle' | 'requesting' | 'granted' | 'denied' |
//                'unsupported' | 'dismissed'

const FRESH_FOR_MS = 24 * 60 * 60 * 1000; // remember coords for 24 hours
const ACCEPT_CACHED_FOR_MS = 5 * 60 * 1000; // ok to reuse a 5-minute-old fix

const GeoLocationContext = createContext({
  coords: null,
  status: 'idle',
  request: () => {},
  dismiss: () => {},
  clear: () => {},
});

export const useGeoLocation = () => useContext(GeoLocationContext);

function readStoredCoords() {
  try {
    const raw = localStorage.getItem('nishani_location');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > FRESH_FOR_MS) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

export function GeoLocationProvider({ children }) {
  const [coords, setCoords] = useState(readStoredCoords);
  const [status, setStatus] = useState(coords ? 'granted' : 'idle');

  // On first mount, if the customer has already granted browser permission,
  // get their coordinates silently — no prompt is shown to the user.
  useEffect(() => {
    if (coords) return; // already have them in localStorage
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (navigator.permissions?.query) {
          const p = await navigator.permissions.query({ name: 'geolocation' });
          if (cancelled) return;
          if (p.state === 'granted') {
            // Browser will not prompt — pull coords straight away.
            navigator.geolocation.getCurrentPosition(
              (pos) => persist(pos.coords.latitude, pos.coords.longitude, 'granted'),
              (err) => setStatus(err.code === 1 ? 'denied' : 'idle'),
              { enableHighAccuracy: true, timeout: 8000, maximumAge: ACCEPT_CACHED_FOR_MS }
            );
            return;
          }
          if (p.state === 'denied') {
            setStatus('denied');
            return;
          }
        }
        // 'prompt' state (or no Permissions API): respect any prior Skip.
        if (localStorage.getItem('nishani_location_dismissed') === '1') {
          setStatus('dismissed');
        }
      } catch {
        // Permissions API failed — leave status idle so the banner can prompt.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(lat, lng, nextStatus = 'granted') {
    setCoords({ lat, lng });
    setStatus(nextStatus);
    try {
      localStorage.setItem(
        'nishani_location',
        JSON.stringify({ lat, lng, timestamp: Date.now() })
      );
      // Clear any prior "Skip" once the user opts in.
      localStorage.removeItem('nishani_location_dismissed');
    } catch {
      /* private mode etc. — fine */
    }
  }

  // Called from a user-initiated click. May trigger the browser prompt.
  function request() {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => persist(pos.coords.latitude, pos.coords.longitude, 'granted'),
      (err) => setStatus(err.code === 1 ? 'denied' : 'idle'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function dismiss() {
    try {
      localStorage.setItem('nishani_location_dismissed', '1');
    } catch {
      /* ignore */
    }
    setStatus('dismissed');
  }

  function clear() {
    try {
      localStorage.removeItem('nishani_location');
      localStorage.removeItem('nishani_location_dismissed');
    } catch {
      /* ignore */
    }
    setCoords(null);
    setStatus('idle');
  }

  return (
    <GeoLocationContext.Provider value={{ coords, status, request, dismiss, clear }}>
      {children}
    </GeoLocationContext.Provider>
  );
}
