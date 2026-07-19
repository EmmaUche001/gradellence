import { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { useToastStore } from '../../store/toastStore';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Password strength helper (same as RegisterPage)
function getStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8)          score++;
  if (/[A-Z]/.test(pwd))        score++;
  if (/[0-9]/.test(pwd))        score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: '',       color: 'bg-gray-200'    },
    { label: 'Weak',   color: 'bg-danger-500'  },
    { label: 'Fair',   color: 'bg-warning-500' },
    { label: 'Good',   color: 'bg-info-500'    },
    { label: 'Strong', color: 'bg-success-500' },
  ];
  return { score, ...map[score] };
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { addToast } = useToastStore();
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const strength = getStrength(newPwd);

  const reset = () => {
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    setError(''); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    setError('');

    if (!currentPwd.trim()) { setError('Current password is required.'); return; }
    if (newPwd.length < 8)  { setError('New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setError('New passwords do not match.'); return; }
    if (newPwd === currentPwd) { setError('New password must be different from your current password.'); return; }

    setSaving(true);
    try {
      const res = await authService.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      addToast('success', res.message || 'Password changed successfully.');
      handleClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error?.message || 'Failed to change password.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const eyeIcon = (show: boolean, toggle: () => void, label: string) => (
    <button type="button" onClick={toggle}
      className="text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
      aria-label={label}>
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      description="Keep your account secure by using a strong, unique password."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>Save Password</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
            <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <Input
          id="current-password"
          type={showCurrent ? 'text' : 'password'}
          label="Current Password"
          placeholder="••••••••"
          value={currentPwd}
          onChange={e => setCurrentPwd(e.target.value)}
          autoComplete="current-password"
          endIcon={eyeIcon(showCurrent, () => setShowCurrent(v => !v), showCurrent ? 'Hide' : 'Show')}
        />

        <div>
          <Input
            id="new-password"
            type={showNew ? 'text' : 'password'}
            label="New Password"
            placeholder="Min. 8 characters"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            autoComplete="new-password"
            endIcon={eyeIcon(showNew, () => setShowNew(v => !v), showNew ? 'Hide' : 'Show')}
          />
          {/* Strength bar */}
          {newPwd.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                      i <= strength.score ? strength.color : 'bg-gray-200'
                    }`} />
                ))}
              </div>
              {strength.label && (
                <p className="text-xs text-gray-500">
                  Strength: <span className="font-medium">{strength.label}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <Input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            label="Confirm New Password"
            placeholder="••••••••"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            autoComplete="new-password"
            endIcon={eyeIcon(showConfirm, () => setShowConfirm(v => !v), showConfirm ? 'Hide' : 'Show')}
          />
          {/* Match indicator */}
          {confirmPwd.length > 0 && newPwd.length > 0 && (
            <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${newPwd === confirmPwd ? 'text-success-600' : 'text-danger-600'}`}>
              <CheckCircle2 size={12} />
              <span>{newPwd === confirmPwd ? 'Passwords match' : 'Passwords do not match'}</span>
            </div>
          )}
        </div>

        {/* Security tip */}
        <p className="text-xs text-gray-400 leading-relaxed">
          Use at least 8 characters including uppercase, numbers and symbols.
          Changing your password will sign you out on other devices.
        </p>
      </div>
    </Modal>
  );
}
