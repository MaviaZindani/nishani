import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMyBranch } from '../../context/MyBranchContext.jsx';
import AdminTour from './AdminTour.jsx';
import OpenBranchPrompt from './OpenBranchPrompt.jsx';

// Orchestrates the post-login admin flow:
//   - First sign-in (any role)                     → spotlight tour
//   - Returning Order Handler with closed branch   → "Open your branch?" prompt
//   - Anything else                                → nothing
//
// The "seen the tour" flag is per-user in localStorage, so each admin
// only ever sees the tour once across all their devices/sessions.
export default function AdminOnboarding() {
  const { user } = useAuth();
  const { branch } = useMyBranch();
  const [mode, setMode] = useState(null); // 'tour' | 'check-branch' | 'open-branch' | null

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(`nishani_overview_seen_${user.id}`) === '1';
    setMode(seen ? 'check-branch' : 'tour');
  }, [user]);

  // After the tour ends (or for returning users), decide whether to nudge
  // an Order Handler to open their branch.
  useEffect(() => {
    if (mode !== 'check-branch') return;
    if (user?.role !== 'ORDER_HANDLER') {
      setMode(null);
      return;
    }
    if (branch === null) return; // still loading
    setMode(branch && !branch.isOpen ? 'open-branch' : null);
  }, [mode, user, branch]);

  function finishTour() {
    if (user) localStorage.setItem(`nishani_overview_seen_${user.id}`, '1');
    setMode('check-branch');
  }

  if (mode === 'tour') return <AdminTour onFinish={finishTour} />;
  if (mode === 'open-branch') return <OpenBranchPrompt onClose={() => setMode(null)} />;
  return null;
}
