import React, { useState, useEffect } from 'react';
import { Modal } from '../Common/Modal';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { CommentSection } from './CommentSection';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Task, TaskPriority, TaskStatus, ActivityEvent, UpdateTaskDto, Subtask } from '../../types';
import { Tag as TagIcon, Trash2, Activity, MessageSquare, CheckSquare, Plus } from 'lucide-react';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (updated: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const { addToast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>('');
  const [isAddingSubtask, setIsAddingSubtask] = useState<boolean>(false);

  // Form states for inline editing
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!taskId || !isOpen) {
      setTask(null);
      setSubtasks([]);
      return;
    }

    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const data = await api.tasks.get(taskId);
        setTask(data);
        setSubtasks(data.subtasks || []);
        setTitle(data.title);
        setDescription(data.description || '');
        setStatus(data.status);
        setPriority(data.priority);
        setAssigneeId(data.assignee_id || '');
        setDueDate(data.due_date || '');

        // Fetch task activity & project members
        const [act, mems] = await Promise.all([
          api.activity.list({ taskId }),
          api.projects.listMembers(data.project_id).catch(() => []),
        ]);
        setActivity(act);
        setMembers(mems);
      } catch (err: any) {
        addToast('error', 'Failed to load task details.');
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [taskId, isOpen, addToast, onClose]);

  const handleUpdate = async (field: UpdateTaskDto) => {
    if (!task) return;
    try {
      const updated = await api.tasks.update(task.id, field);
      setTask(updated);
      onTaskUpdated(updated);
      addToast('success', 'Task updated.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update task.');
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      await api.tasks.delete(task.id);
      addToast('info', 'Task deleted.');
      onTaskDeleted(task.id);
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete task.');
    }
  };

  const handleAddSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!task || !newSubtaskTitle.trim() || isAddingSubtask) return;
    setIsAddingSubtask(true);
    try {
      const created = await api.tasks.addSubtask(task.id, { title: newSubtaskTitle.trim() });
      const nextSubtasks = [...subtasks, created];
      setSubtasks(nextSubtasks);
      setNewSubtaskTitle('');
      const completedCount = nextSubtasks.filter((s) => s.is_completed === 1).length;
      const updatedTask: Task = {
        ...task,
        subtasks: nextSubtasks,
        subtasks_count: nextSubtasks.length,
        completed_subtasks_count: completedCount,
      };
      setTask(updatedTask);
      onTaskUpdated(updatedTask);
      addToast('success', 'Subtask added.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to add subtask.');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: number) => {
    if (!task) return;
    try {
      const nextCompleted = currentCompleted === 1 ? false : true;
      const updated = await api.tasks.updateSubtask(task.id, subtaskId, { is_completed: nextCompleted });
      const nextSubtasks = subtasks.map((s) => (s.id === subtaskId ? updated : s));
      setSubtasks(nextSubtasks);
      const completedCount = nextSubtasks.filter((s) => s.is_completed === 1).length;
      const updatedTask: Task = {
        ...task,
        subtasks: nextSubtasks,
        subtasks_count: nextSubtasks.length,
        completed_subtasks_count: completedCount,
      };
      setTask(updatedTask);
      onTaskUpdated(updatedTask);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update subtask.');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task) return;
    try {
      await api.tasks.deleteSubtask(task.id, subtaskId);
      const nextSubtasks = subtasks.filter((s) => s.id !== subtaskId);
      setSubtasks(nextSubtasks);
      const completedCount = nextSubtasks.filter((s) => s.is_completed === 1).length;
      const updatedTask: Task = {
        ...task,
        subtasks: nextSubtasks,
        subtasks_count: nextSubtasks.length,
        completed_subtasks_count: completedCount,
      };
      setTask(updatedTask);
      onTaskUpdated(updatedTask);
      addToast('info', 'Subtask removed.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete subtask.');
    }
  };

  if (!isOpen) return null;
  if (isLoading && !task) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Task Details" maxWidth="640px">
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading task details...</div>
      </Modal>
    );
  }
  if (!task) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Task Details" maxWidth="640px">
        {/* Title Input */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== task.title) {
                handleUpdate({ title: title.trim() });
              }
            }}
            style={{
              fontSize: 18,
              fontWeight: 700,
              width: '100%',
              border: 'none',
              outline: 'none',
              padding: '4px 0',
              borderBottom: '2px solid transparent',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => (e.target.style.borderBottomColor = 'var(--primary)')}
          />
        </div>

        {/* Status / Priority / Assignee / Due Date Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            backgroundColor: '#f8fafc',
            padding: 14,
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid var(--border-color)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>STATUS</div>
            <select
              value={status}
              onChange={(e) => {
                const next = e.target.value as TaskStatus;
                setStatus(next);
                handleUpdate({ status: next });
              }}
              className="form-input"
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="DONE">DONE</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>PRIORITY</div>
            <select
              value={priority}
              onChange={(e) => {
                const next = e.target.value as TaskPriority;
                setPriority(next);
                handleUpdate({ priority: next });
              }}
              className="form-input"
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>ASSIGNEE</div>
            <select
              value={assigneeId}
              onChange={(e) => {
                const next = e.target.value;
                setAssigneeId(next);
                handleUpdate({ assignee_id: next || null });
              }}
              className="form-input"
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name || m.user_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>DUE DATE</div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                handleUpdate({ due_date: e.target.value || null });
              }}
              className="form-input"
              style={{ fontSize: 12, padding: '4px 8px' }}
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>DESCRIPTION</div>
          <textarea
            rows={3}
            placeholder="Add a detailed description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (task.description || '')) {
                handleUpdate({ description });
              }
            }}
            className="form-input"
            style={{ fontSize: 13, resize: 'vertical' }}
          />
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>TAGS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {task.tags && task.tags.length > 0 ? (
              task.tags.map((t) => (
                <span
                  key={t.id}
                  style={{
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <TagIcon size={12} />
                  {t.name}
                </span>
              ))
            ) : (
              <span style={{ fontSize: 12, color: '#94a3b8' }}>No tags assigned</span>
            )}
          </div>
        </div>

        {/* Subtasks / Checklist */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              <CheckSquare size={14} />
              SUBTASKS & CHECKLIST
            </div>
            {subtasks.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                {subtasks.filter((s) => s.is_completed === 1).length} of {subtasks.length} completed
              </span>
            )}
          </div>

          {/* Progress bar */}
          {subtasks.length > 0 && (
            <div
              style={{
                width: '100%',
                height: 6,
                backgroundColor: '#e2e8f0',
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round((subtasks.filter((s) => s.is_completed === 1).length / subtasks.length) * 100)}%`,
                  backgroundColor: '#22c55e',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          )}

          {/* Subtask items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {subtasks.map((st) => (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: st.is_completed ? '#f8fafc' : '#ffffff',
                  border: '1px solid #e2e8f0',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    flex: 1,
                    fontSize: 13,
                    color: st.is_completed ? '#94a3b8' : 'var(--text-primary)',
                    textDecoration: st.is_completed ? 'line-through' : 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={st.is_completed === 1}
                    onChange={() => handleToggleSubtask(st.id, st.is_completed)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{st.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteSubtask(st.id)}
                  title="Delete subtask"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Subtask Form */}
          <form
            onSubmit={handleAddSubtask}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder="Add a new subtask checklist item..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="form-input"
              style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
            />
            <button
              type="submit"
              disabled={!newSubtaskTitle.trim() || isAddingSubtask}
              className="btn btn-secondary"
              style={{
                fontSize: 12,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: !newSubtaskTitle.trim() || isAddingSubtask ? 'not-allowed' : 'pointer',
              }}
            >
              <Plus size={13} />
              Add
            </button>
          </form>
        </div>

        {/* Tabs: Comments vs Activity */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => setActiveTab('comments')}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === 'comments' ? 'var(--primary)' : '#64748b',
              borderBottom: activeTab === 'comments' ? '2px solid var(--primary)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <MessageSquare size={14} />
            Comments
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === 'activity' ? 'var(--primary)' : '#64748b',
              borderBottom: activeTab === 'activity' ? '2px solid var(--primary)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Activity size={14} />
            Activity
          </button>
        </div>

        {activeTab === 'comments' ? (
          <CommentSection taskId={task.id} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activity.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>No activity logged yet.</div>
            ) : (
              activity.map((a) => (
                <div key={a.id} style={{ fontSize: 12, display: 'flex', gap: 10, padding: '6px 0' }}>
                  <span style={{ color: '#94a3b8', minWidth: 60 }}>
                    {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{a.description}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Delete Action Footer */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 16,
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-sm"
            style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Trash2 size={14} />
            Delete Task
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
      />
    </>
  );
};
