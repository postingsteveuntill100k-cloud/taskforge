import React from 'react';
import { Task, TaskStatus } from '../../types/index.js';
import { TaskCard } from '../Tasks/TaskCard.js';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onOpenCreateTask: (status?: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
  onOpenCreateTask,
}) => {
  const columns: Array<{ id: TaskStatus; label: string; color: string }> = [
    { id: 'TODO', label: 'TO DO', color: '#64748b' },
    { id: 'IN_PROGRESS', label: 'IN PROGRESS', color: '#0284c7' },
    { id: 'BLOCKED', label: 'BLOCKED', color: '#dc2626' },
    { id: 'DONE', label: 'DONE', color: '#16a34a' },
  ];

  return (
    <div className="kanban-board">
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div key={col.id} className="kanban-col">
            {/* Header */}
            <div className="kanban-col-header" style={{ borderTop: `3px solid ${col.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: col.color }}>{col.label}</span>
                <span
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>
              <button
                onClick={() => onOpenCreateTask(col.id)}
                title={`Add task to ${col.label}`}
                style={{ padding: 4, borderRadius: 4, color: '#64748b' }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Cards stream */}
            <div className="kanban-col-cards">
              {columnTasks.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    border: '1px dashed #cbd5e1',
                    borderRadius: 6,
                  }}
                >
                  No tasks in {col.label}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    onQuickStatusChange={(nextStatus) => onStatusChange(task.id, nextStatus)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
