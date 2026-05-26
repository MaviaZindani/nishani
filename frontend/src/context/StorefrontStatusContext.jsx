import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

// Whole-storefront "are we accepting orders right now?" flag.
// Polled every 30s so the banner appears/disappears within the minute
// of a Super Admin opening or closing branches.
const StorefrontStatusContext = createContext({
  acceptingOrders: true,
  openBranches: 0,
  totalBranches: 0,
  loading: true,
});

export const useStorefrontStatus = () => useContext(StorefrontStatusContext);

export function StorefrontStatusProvider({ children }) {
  const [status, setStatus] = useState({
    acceptingOrders: true,
    openBranches: 0,
    totalBranches: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const { data } = await api.get('/storefront/status');
        if (!cancelled) setStatus({ ...data, loading: false });
      } catch {
        // Fail open: don't lock customers out on a transient network blip.
        if (!cancelled) setStatus((s) => ({ ...s, loading: false }));
      }
    }
    refresh();
    const t = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <StorefrontStatusContext.Provider value={status}>
      {children}
    </StorefrontStatusContext.Provider>
  );
}
