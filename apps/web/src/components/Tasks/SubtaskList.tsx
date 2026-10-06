import React, { useState } from 'react';
import { CheckSquare, Trash2, Plus } from 'lucide-react';
import { Subtask } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';

interface SubtaskListProps {
  taskId: string;
  subtasks?: Subtask[];
  onSubtasksChanged?: (updated: Subtask[]) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks = [], onSubtasksChanged }) => {
  const { addToast } = useToast();
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const completedCount = subtasks.filter((s) => s.is_completed === 1).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  const handleToggle = async (subtaskId: string, currentCompleted: number) => {
    try {
      const nextCompleted = currentCompleted === 1 ? false : true;
      const updated = await api.tasks.updateSubtask(taskId, subtaskId, { is_completed: nextCompleted });
      const nextList = subtasks.map((s) => (s.id === subtaskId ? updated : s));
      onSubtasksChanged?.(nextList);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to toggle subtask');
    }
  };

  const handleDelete = async (subtaskId: string) => {
    try {
      await api.tasks.deleteSubtask(taskId, subtaskId);
      const nextList = subtasks.filter((s) => s.id !== subtaskId);
      onSubtasksChanged?.(nextList);
      addToast('info', 'Subtask removed');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete subtask');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const created = await api.tasks.addSubtask(taskId, { title: newTitle.trim() });
      const nextList = [...subtasks, created];
      setNewTitle('');
      onSubtasksChanged?.(nextList);
      addToast('success', 'Subtask added');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create subtask');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
          <CheckSquare size={14} />
          SUBTASKS & CHECKLIST
        </div>
        {subtasks.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
            {completedCount} of {subtasks.length} completed ({progressPercent}%)
          </span>
        )}
      </div>

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
              width: `${progressPercent}%`,
              backgroundColor: '#22c55e',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      )}

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
                onChange={() => handleToggle(st.id, st.is_completed)}
                style={{ cursor: 'pointer' }}
              />
              <span>{st.title}</span>
            </label>
            <button
              type="button"
              onClick={() => handleDelete(st.id)}
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

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Add a new subtask checklist item..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="form-input"
          style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || isLoading}
          className="btn btn-secondary"
          style={{
            fontSize: 12,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: !newTitle.trim() || isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={13} />
          Add
        </button>
      </form>
    </div>
  );
};
