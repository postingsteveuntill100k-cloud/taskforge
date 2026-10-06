import React from 'react';
import {
  LayoutDashboard,
  KanbanSquare,
  ListTodo,
  FolderKanban,
  Activity,
  PlusCircle,
  LogOut,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useProject } from '../../context/ProjectContext.js';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreateTask: () => void;
  onOpenCreateProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreateTask,
  onOpenCreateProject,
}) => {
  const { user, logout } = useAuth();
  const { projects, activeProject, setActiveProject } = useProject();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban Board', icon: KanbanSquare },
    { id: 'tasks', label: 'Task List', icon: ListTodo },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'activity', label: 'Activity Timeline', icon: Activity },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Layers size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            TaskForge
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Autonomous SaaS</div>
        </div>
      </div>

      {/* Project Selector */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
          Active Project
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                onOpenCreateProject();
              } else {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) setActiveProject(found);
              }
            }}
            style={{
              width: '100%',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '8px 28px 8px 12px',
              fontSize: 13,
              appearance: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="__new__">+ New Project...</option>
          </select>
          <ChevronDown
            size={14}
            style={{ position: 'absolute', right: 10, top: 11, pointerEvents: 'none', color: '#94a3b8' }}
          />
        </div>
      </div>

      {/* Action CTA */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <button
          onClick={onOpenCreateTask}
          className="btn btn-primary"
          style={{ width: '100%', fontSize: 13 }}
        >
          <PlusCircle size={16} />
          Create Task
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', padding: '0 24px 6px', letterSpacing: '0.05em' }}>
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ width: 'calc(100% - 24px)' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User profile & logout */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#090d16',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 13,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          style={{ color: '#94a3b8', padding: 6, borderRadius: 6, transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
