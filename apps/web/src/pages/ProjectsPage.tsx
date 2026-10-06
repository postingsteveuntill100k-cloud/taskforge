import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { ProjectCreateModal } from '../components/Projects/ProjectCreateModal';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import { Plus, Archive, Trash2, CheckCircle2, Users, Layers } from 'lucide-react';
import { Project } from '../types';

interface ProjectsPageProps {
  onSelectProject: (project: Project) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject }) => {
  const { user } = useAuth();
  const { projects, activeProject, updateProject, deleteProject } = useProject();
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleToggleArchive = async (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    await updateProject(p.id, { is_archived: !p.is_archived });
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Projects</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Manage and switch between active workspaces and archived archives.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
          <Plus size={14} />
          Create Project
        </button>
      </div>

      {/* Projects Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {projects.map((p: Project) => {
          const isSelected = activeProject?.id === p.id;
          const isOwner = user?.id === p.owner_id;

          return (
            <div
              key={p.id}
              onClick={() => onSelectProject(p)}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'var(--shadow-sm)',
                opacity: p.is_archived ? 0.75 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      backgroundColor: p.color || '#4f46e5',
                    }}
                  />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.name}
                  </h3>
                </div>

                {isSelected && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CheckCircle2 size={12} /> Active
                  </span>
                )}
              </div>

              {p.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.4 }}>
                  {p.description}
                </p>
              )}

              {/* Stats Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', gap: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Layers size={13} />
                    {p.task_count ?? 0} tasks
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={13} />
                    {p.member_count ?? 1} members
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleArchive(e, p)}
                    title={p.is_archived ? 'Unarchive project' : 'Archive project'}
                    style={{ padding: 4, color: p.is_archived ? '#16a34a' : '#64748b' }}
                  >
                    <Archive size={14} />
                  </button>

                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(p);
                      }}
                      title="Delete project"
                      style={{ padding: 4, color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ProjectCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) deleteProject(projectToDelete.id);
        }}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? All associated tasks and comments will be permanently erased.`}
        confirmLabel="Delete Project"
      />
    </div>
  );
};
