import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { useToast } from '../context/ToastContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { KanbanBoard } from '../components/Kanban/KanbanBoard';
import { TaskDetailModal } from '../components/Tasks/TaskDetailModal';
import { TaskCreateModal } from '../components/Tasks/TaskCreateModal';
import { Plus, Filter } from 'lucide-react';

export const KanbanPage: React.FC = () => {
  const { activeProject } = useProject();
  const { addToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskStatus>('TODO');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const fetchTasks = useCallback(async () => {
    if (!activeProject) return;
    try {
      const data = await api.tasks.list({
        projectId: activeProject.id,
        priority: priorityFilter !== 'ALL' ? (priorityFilter as TaskPriority) : undefined,
      });
      setTasks(data);
    } catch (err: any) {
      addToast('error', 'Failed to load project tasks.');
    }
  }, [activeProject, priorityFilter, addToast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.tasks.update(taskId, { status: newStatus });
      addToast('success', `Moved task to ${newStatus}`);
    } catch (err: any) {
      addToast('error', 'Failed to update task status.');
      fetchTasks(); // Rollback
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleOpenCreate = (status?: TaskStatus) => {
    setCreateInitialStatus(status || 'TODO');
    setIsCreateOpen(true);
  };

  return (
    <div>
      {/* Top Filter and Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
            <Filter size={14} />
            <span>Priority:</span>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: '#fff',
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => handleOpenCreate()}>
          <Plus size={14} />
          New Task
        </button>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onStatusChange={handleStatusChange}
        onOpenCreateTask={handleOpenCreate}
      />

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
        initialStatus={createInitialStatus}
        onTaskCreated={(newTask) => {
          setTasks((prev) => [...prev, newTask]);
        }}
      />
    </div>
  );
};
