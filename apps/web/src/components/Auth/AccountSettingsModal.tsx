import React, { useState } from 'react';
import { Modal } from '../Common/Modal.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Lock, Save } from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState<string>(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || '');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('error', 'Name is required.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      addToast('error', 'New passwords do not match.');
      return;
    }

    if (newPassword && !currentPassword) {
      addToast('error', 'Current password is required to change password.');
      return;
    }

    setIsSaving(true);
    try {
      await api.auth.updateProfile({
        name: name.trim(),
        avatar_url: avatarUrl.trim() || null,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });

      addToast('success', 'Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
      // Reload session
      window.location.reload();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Settings" maxWidth="480px">
      <form onSubmit={handleSubmit}>
        {/* Profile Details */}
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Email Address (Read-only)</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="form-input"
            style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Avatar URL (Optional)</label>
          <input
            type="url"
            placeholder="https://example.com/avatar.png"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Password Change Section */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} />
            Change Password
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Current Password</label>
            <input
              type="password"
              placeholder="Leave empty if not changing"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
