import React from 'react';
import { Calendar, MessageSquare, Tag as TagIcon, CheckSquare } from 'lucide-react';
import { Task } from '../../types/index.js';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onQuickStatusChange?: (status: Task['status']) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onQuickStatusChange }) => {
  const isOverdue =
    task.due_date &&
    task.status !== 'DONE' &&
    new Date(task.due_date) < new Date(new Date().toISOString().split('T')[0]);

  return (
    <div className="task-card" onClick={onClick}>
      {/* Top bar: Priority & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className={`badge badge-${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>
        {onQuickStatusChange && (
          <select
            value={task.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onQuickStatusChange(e.target.value as Task['status']);
            }}
            style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="DONE">DONE</option>
          </select>
        )}
      </div>

      {/* Title */}
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>
        {task.title}
      </div>

      {/* Description Snippet */}
      {task.description && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 10,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
          }}
        >
          {task.description}
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {task.tags.map((t) => (
            <span
              key={t.id}
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <TagIcon size={10} />
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer Info: Due date, comments, assignee */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {task.due_date && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: isOverdue ? '#dc2626' : 'inherit',
                fontWeight: isOverdue ? 600 : 'normal',
              }}
            >
              <Calendar size={12} />
              {task.due_date}
            </span>
          )}
          {task.comments_count !== undefined && task.comments_count > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={12} />
              {task.comments_count}
            </span>
          )}
          {task.subtasks_count !== undefined && task.subtasks_count > 0 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: task.completed_subtasks_count === task.subtasks_count ? '#16a34a' : 'inherit',
                fontWeight: task.completed_subtasks_count === task.subtasks_count ? 600 : 'normal',
              }}
              title={`${task.completed_subtasks_count || 0} of ${task.subtasks_count} subtasks completed`}
            >
              <CheckSquare size={12} />
              {task.completed_subtasks_count || 0}/{task.subtasks_count}
            </span>
          )}
        </div>

        {task.assignee ? (
          <div
            title={`Assigned to ${task.assignee.name}`}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {task.assignee.name.charAt(0)}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Unassigned</span>
        )}
      </div>
    </div>
  );
};
