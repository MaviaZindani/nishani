import { useState } from 'react';
import { apiError } from '../../api/client';
import { useMyBranch } from '../../context/MyBranchContext.jsx';

// Shown to a returning Order Handler when their branch is currently
// closed (auto-closed on their previous logout, or by the Super Admin).
// They can open it or dismiss and open later from the topbar toggle.
export default function OpenBranchPrompt({ onClose }) {
  const { branch, setOpen } = useMyBranch();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!branch) return null;

  async function openIt() {
    setSaving(true);
    setError('');
    try {
      await setOpen(true);
      onClose();
    } catch (e) {
      setError(apiError(e));
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Open your branch?</h2>
        <p>
          <strong>{branch.name}</strong> is currently closed — customers can't place orders for
          it right now.
        </p>
        <p className="muted">
          Open it now to start receiving live orders. You can close it any time from the
          toggle in the top-right.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>
            Stay closed for now
          </button>
          <button className="btn" onClick={openIt} disabled={saving}>
            {saving ? 'Opening…' : '🟢 Open my branch'}
          </button>
        </div>
      </div>
    </div>
  );
}
