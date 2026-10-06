import React, { useState, useEffect } from 'react';
import { Modal } from '../Common/Modal.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Project, ProjectMember, ProjectMemberRole } from '../../types/index.js';
import { UserPlus, Trash2 } from 'lucide-react';

interface ProjectMembersModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onMembersUpdated?: () => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  project,
  isOpen,
  onClose,
  onMembersUpdated,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<ProjectMemberRole>('MEMBER');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const fetchMembers = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const data = await api.projects.listMembers(project.id);
      setMembers(data);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load project members.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      fetchMembers();
    }
  }, [isOpen, project]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newEmail.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await api.projects.addMember(project.id, { email: newEmail.trim(), role: newRole });
      addToast('success', `Added ${newEmail.trim()} to project.`);
      setNewEmail('');
      await fetchMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to add member.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async (memberUserId: string, role: ProjectMemberRole) => {
    if (!project) return;
    try {
      await api.projects.updateMemberRole(project.id, memberUserId, role);
      addToast('success', 'Updated member role.');
      await fetchMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!project) return;
    try {
      await api.projects.removeMember(project.id, memberUserId);
      addToast('info', 'Member removed from project.');
      await fetchMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to remove member.');
    }
  };

  if (!isOpen || !project) return null;

  const isOwner = user?.id === project.owner_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Project Members — ${project.name}`}
      maxWidth="560px"
    >
      <div>
        {/* Add Member Form */}
        {isOwner && (
          <form onSubmit={handleAddMember} style={{ marginBottom: 20 }}>
            <label className="form-label">Add New Team Member</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="colleague@taskforge.io"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
                required
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as ProjectMemberRole)}
                className="form-input"
                style={{ width: 110 }}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={isAdding}
                className="btn btn-primary"
                style={{ flexShrink: 0 }}
              >
                <UserPlus size={14} />
                Add
              </button>
            </div>
          </form>
        )}

        {/* Member List */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
            CURRENT MEMBERS ({members.length})
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Loading members...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m) => {
                const isProjectOwner = m.user_id === project.owner_id;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#4f46e5',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {m.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {m.user?.name} {isProjectOwner && <span style={{ fontSize: 11, color: '#4f46e5' }}>(Owner)</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{m.user?.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isProjectOwner ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: 4,
                          }}
                        >
                          OWNER
                        </span>
                      ) : isOwner ? (
                        <>
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateRole(m.user_id, e.target.value as ProjectMemberRole)}
                            className="form-input"
                            style={{ fontSize: 11, padding: '3px 6px' }}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MEMBER">MEMBER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            title="Remove member"
                            style={{ padding: 4, color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            borderRadius: 4,
                          }}
                        >
                          {m.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
