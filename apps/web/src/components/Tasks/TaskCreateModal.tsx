import React, { useState } from 'react';
import { Modal } from '../Common/Modal.js';
import { useProject } from '../../context/ProjectContext.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Task, TaskPriority, TaskStatus } from '../../types/index.js';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  initialStatus?: TaskStatus;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  initialStatus = 'TODO',
}) => {
  const { activeProject, projects } = useProject();
  const { addToast } = useToast();

  const [projectId, setProjectId] = useState<string>(activeProject?.id || '');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync active project if changed
  React.useEffect(() => {
    if (activeProject) setProjectId(activeProject.id);
  }, [activeProject]);

  // Load project members when projectId changes
  React.useEffect(() => {
    if (!projectId) return;
    api.projects.listMembers(projectId)
      .then((m) => setMembers(m))
      .catch(() => setMembers([]));
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) {
      addToast('error', 'Title and project are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await api.tasks.create({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assignee_id: assigneeId || undefined,
        due_date: dueDate || undefined,
        tags,
      });

      addToast('success', `Task "${created.title}" created.`);
      onTaskCreated(created);
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setTagsInput('');
      setDueDate('');
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Project Selector */}
        <div className="form-group">
          <label className="form-label">Project *</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="form-input"
            required
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="form-group">
          <label className="form-label">Task Title *</label>
          <input
            type="text"
            placeholder="e.g., Integrate OAuth flow"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            rows={3}
            placeholder="Detailed task requirements and acceptance criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Status, Priority & Assignee Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="form-input"
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="DONE">DONE</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="form-input"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="form-input"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name || m.user_id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags & Due Date Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="Backend, Security, API"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
