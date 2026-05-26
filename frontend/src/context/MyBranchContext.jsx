import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext.jsx';

// One source of truth for the signed-in Order Handler's own branch.
// Shared by the topbar toggle, the "Open your branch?" onboarding prompt,
// and anywhere else that needs to display or change the branch's status.
const MyBranchContext = createContext({
  branch: null,
  refresh: () => {},
  setOpen: async () => {},
});

export const useMyBranch = () => useContext(MyBranchContext);

export function MyBranchProvider({ children }) {
  const { user } = useAuth();
  const [branch, setBranch] = useState(null);

  const refresh = useCallback(async () => {
    if (user?.role !== 'ORDER_HANDLER' || !user?.branchId) {
      setBranch(null);
      return;
    }
    try {
      const { data } = await api.get('/branches', { params: { all: 1 } });
      setBranch(data.find((b) => b.id === user.branchId) || null);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function setOpen(isOpen) {
    if (!branch) return null;
    const { data } = await api.patch(`/branches/${branch.id}/open`, { isOpen });
    setBranch((b) => (b ? { ...b, ...data } : b));
    return data;
  }

  return (
    <MyBranchContext.Provider value={{ branch, refresh, setOpen }}>
      {children}
    </MyBranchContext.Provider>
  );
}
