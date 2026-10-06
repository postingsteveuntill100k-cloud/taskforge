import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { useToast } from '../context/ToastContext';
import { Task, TaskPriority, TaskStatus, Tag } from '../types';
import { TaskDetailModal } from '../components/Tasks/TaskDetailModal';
import { TaskCreateModal } from '../components/Tasks/TaskCreateModal';
import { EmptyState } from '../components/Common/EmptyState';
import { Search, Plus, Calendar, ArrowUpDown, FileSpreadsheet, Bookmark, X } from 'lucide-react';

interface TasksPageProps {
  initialSearchQuery?: string;
}

export const TasksPage: React.FC<TasksPageProps> = ({ initialSearchQuery = '' }) => {
  const { activeProject } = useProject();
  const { addToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState<string>(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('updated_at');

  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [newFilterName, setNewFilterName] = useState<string>('');
  const [isSavingFilter, setIsSavingFilter] = useState<boolean>(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // Sync external search query
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearch(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const fetchSavedFilters = useCallback(async () => {
    if (!activeProject) return;
    try {
      const filters = await api.savedFilters.list(activeProject.id);
      setSavedFilters(filters);
    } catch {
      // ignore
    }
  }, [activeProject]);

  useEffect(() => {
    fetchSavedFilters();
  }, [fetchSavedFilters]);

  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newFilterName.trim()) return;
    try {
      await api.savedFilters.create({
        name: newFilterName.trim(),
        project_id: activeProject.id,
        filter_config: {
          search: search.trim() || undefined,
          status: statusFilter,
          priority: priorityFilter,
          sortBy,
        },
      });
      addToast('success', `Saved filter "${newFilterName.trim()}".`);
      setNewFilterName('');
      setIsSavingFilter(false);
      fetchSavedFilters();
    } catch {
      addToast('error', 'Failed to save filter.');
    }
  };

  const handleApplyFilter = (f: any) => {
    const cfg = f.filter_config || {};
    if (cfg.search !== undefined) setSearch(cfg.search);
    if (cfg.status !== undefined) setStatusFilter(cfg.status);
    if (cfg.priority !== undefined) setPriorityFilter(cfg.priority);
    if (cfg.sortBy !== undefined) setSortBy(cfg.sortBy);
    addToast('info', `Applied filter "${f.name}".`);
  };

  const handleDeleteFilter = async (e: React.MouseEvent, filterId: string) => {
    e.stopPropagation();
    try {
      await api.savedFilters.delete(filterId);
      addToast('success', 'Filter deleted.');
      fetchSavedFilters();
    } catch {
      addToast('error', 'Failed to delete filter.');
    }
  };

  const handleExportCsv = async () => {
    if (!activeProject) return;
    try {
      const csv = await api.projects.exportCsv(activeProject.id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-tasks.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Exported tasks to CSV.');
    } catch {
      addToast('error', 'Failed to export CSV.');
    }
  };

  const fetchTasks = useCallback(async () => {
    if (!activeProject) return;
    try {
      const list = await api.tasks.list({
        projectId: activeProject.id,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as TaskStatus) : undefined,
        priority: priorityFilter !== 'ALL' ? (priorityFilter as TaskPriority) : undefined,
        sort: sortBy,
      });
      setTasks(list);
    } catch {
      addToast('error', 'Failed to load task list.');
    }
  }, [activeProject, search, statusFilter, priorityFilter, sortBy, addToast]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, 200);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  return (
    <div>
      {/* Search and Filters Toolbar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, flex: 1 }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', minWidth: 220, flex: 1 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Filter tasks by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: 'auto', fontSize: 13 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="DONE">DONE</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-input"
            style={{ width: 'auto', fontSize: 13 }}
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={14} color="#64748b" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input"
              style={{ width: 'auto', fontSize: 13 }}
            >
              <option value="updated_at">Recently Updated</option>
              <option value="priority">Priority</option>
              <option value="due_date">Due Date</option>
              <option value="created_at">Created Date</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} title="Export Tasks CSV">
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsSavingFilter(!isSavingFilter)}
            title="Save Current Filter"
          >
            <Bookmark size={14} />
            Save Filter
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      {/* Save Filter Bar */}
      {isSavingFilter && (
        <form
          onSubmit={handleSaveFilter}
          className="card"
          style={{
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
          }}
        >
          <Bookmark size={16} color="#4f46e5" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#3730a3' }}>Name your filter view:</span>
          <input
            type="text"
            placeholder="e.g. High Priority In Progress..."
            value={newFilterName}
            onChange={(e) => setNewFilterName(e.target.value)}
            className="form-input"
            style={{ flex: 1, fontSize: 13, backgroundColor: '#fff' }}
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Save
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsSavingFilter(false)}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Saved Filters Chips */}
      {savedFilters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Saved Views:</span>
          {savedFilters.map((f) => (
            <div
              key={f.id}
              onClick={() => handleApplyFilter(f)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                backgroundColor: '#f1f5f9',
                fontSize: 12,
                cursor: 'pointer',
                border: '1px solid #e2e8f0',
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            >
              <span style={{ fontWeight: 500, color: '#334155' }}>{f.name}</span>
              <button
                onClick={(e) => handleDeleteFilter(e, f.id)}
                title="Delete filter view"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tasks Table */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filters.'
              : 'Create your first task in this project to get started.'
          }
          actionLabel="Create Task"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: 12 }}>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>TASK</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>PRIORITY</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>ASSIGNEE</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>DUE DATE</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsDetailOpen(true);
                  }}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.description}
                      </div>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {task.tags.map((t: Tag) => (
                          <span key={t.id} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, backgroundColor: '#f1f5f9', color: '#475569' }}>
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {task.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {task.assignee.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', color: task.due_date ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {task.due_date ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} />
                        {task.due_date}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <TaskDetailModal
        taskId={selectedTask?.id || null}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
        onTaskDeleted={(deletedId) => {
          setTasks((prev) => prev.filter((t) => t.id !== deletedId));
        }}
      />

      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTaskCreated={(created) => {
          setTasks((prev) => [created, ...prev]);
        }}
      />
    </div>
  );
};
