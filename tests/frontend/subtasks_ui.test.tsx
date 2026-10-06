// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { TaskCard } from '../../apps/web/src/components/Tasks/TaskCard.js';
import { TaskDetailModal } from '../../apps/web/src/components/Tasks/TaskDetailModal.js';
import { api } from '../../apps/web/src/services/api.js';
import { Task } from '../../packages/shared/src/types.js';

const mockAddToast = vi.fn();
vi.mock('../../apps/web/src/context/ToastContext.js', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('../../apps/web/src/context/AuthContext.js', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Tester', email: 'tester@example.com' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../apps/web/src/context/ProjectContext.js', () => ({
  useProject: () => ({
    projects: [],
    activeProject: null,
    isLoading: false,
    setActiveProject: vi.fn(),
    refreshProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  }),
}));

describe('TaskForge Subtasks Frontend Components Suite', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  it('renders subtask progress badge on TaskCard when subtasks_count > 0', async () => {
    const task: Task = {
      id: 'task-100',
      project_id: 'proj-1',
      title: 'Implement Authentication',
      description: 'JWT Auth flow',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      creator_id: 'user-1',
      assignee_id: null,
      due_date: '2026-12-31',
      position: 1,
      created_at: '2026-10-06T00:00:00Z',
      updated_at: '2026-10-06T00:00:00Z',
      subtasks_count: 5,
      completed_subtasks_count: 2,
    };

    const root = createRoot(container);
    root.render(<TaskCard task={task} onClick={vi.fn()} />);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(container.textContent).toContain('Implement Authentication');
    expect(container.textContent).toContain('2/5');
  });

  it('does not render subtask badge on TaskCard when subtasks_count is 0 or undefined', async () => {
    const task: Task = {
      id: 'task-101',
      project_id: 'proj-1',
      title: 'Simple Task Without Subtasks',
      description: null,
      status: 'TODO',
      priority: 'LOW',
      creator_id: 'user-1',
      assignee_id: null,
      due_date: null,
      position: 2,
      created_at: '2026-10-06T00:00:00Z',
      updated_at: '2026-10-06T00:00:00Z',
      subtasks_count: 0,
      completed_subtasks_count: 0,
    };

    const root = createRoot(container);
    root.render(<TaskCard task={task} onClick={vi.fn()} />);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(container.textContent).toContain('Simple Task Without Subtasks');
    expect(container.textContent).not.toContain('0/0');
  });

  it('renders Subtasks checklist section in TaskDetailModal and displays subtask items', async () => {
    const mockTask: Task = {
      id: 'task-200',
      project_id: 'proj-1',
      title: 'Detailed Task with Checklist',
      description: 'A task with checklist items',
      status: 'TODO',
      priority: 'MEDIUM',
      creator_id: 'user-1',
      assignee_id: null,
      due_date: null,
      position: 1,
      created_at: '2026-10-06T00:00:00Z',
      updated_at: '2026-10-06T00:00:00Z',
      subtasks_count: 2,
      completed_subtasks_count: 1,
      subtasks: [
        {
          id: 'sub-1',
          task_id: 'task-200',
          title: 'First checklist step',
          is_completed: 1,
          position: 1,
          created_at: '2026-10-06T00:00:00Z',
          updated_at: '2026-10-06T00:00:00Z',
        },
        {
          id: 'sub-2',
          task_id: 'task-200',
          title: 'Second checklist step',
          is_completed: 0,
          position: 2,
          created_at: '2026-10-06T00:00:00Z',
          updated_at: '2026-10-06T00:00:00Z',
        },
      ],
    };

    vi.spyOn(api.tasks, 'get').mockResolvedValue(mockTask);
    vi.spyOn(api.activity, 'list').mockResolvedValue([]);
    vi.spyOn(api.projects, 'listMembers').mockResolvedValue([]);

    const root = createRoot(container);
    root.render(
      <TaskDetailModal
        taskId="task-200"
        isOpen={true}
        onClose={vi.fn()}
        onTaskUpdated={vi.fn()}
        onTaskDeleted={vi.fn()}
      />
    );

    // Wait for async fetch
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(container.textContent).toContain('SUBTASKS & CHECKLIST');
    expect(container.textContent).toContain('1 of 2 completed');
    expect(container.textContent).toContain('First checklist step');
    expect(container.textContent).toContain('Second checklist step');
  });
});
