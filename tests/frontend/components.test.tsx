// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { StatCard } from '../../apps/web/src/components/Dashboard/StatCard.js';
import { EmptyState } from '../../apps/web/src/components/Common/EmptyState.js';
import { Modal } from '../../apps/web/src/components/Common/Modal.js';
import { TaskCard } from '../../apps/web/src/components/Tasks/TaskCard.js';
import { KanbanBoard } from '../../apps/web/src/components/Kanban/KanbanBoard.js';
import { CheckCircle, Inbox } from 'lucide-react';
import { Task } from '../../packages/shared/src/types.js';

describe('TaskForge Frontend Component Suite (Section 16 Specification)', () => {
  it('renders StatCard with correct label, value, and subtext', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(
      <StatCard
        label="Total Tasks"
        value={42}
        icon={CheckCircle}
        subtext="12 completed this week"
      />
    );

    // flush microtasks
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(container.textContent).toContain('Total Tasks');
        expect(container.textContent).toContain('42');
        expect(container.textContent).toContain('12 completed this week');
        resolve();
      }, 50);
    });
  });

  it('renders EmptyState and triggers onAction button callback', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onActionMock = vi.fn();

    root.render(
      <EmptyState
        title="No Tasks Found"
        description="Get started by creating your first task in this workspace."
        actionLabel="Create Task"
        onAction={onActionMock}
        icon={Inbox}
      />
    );

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(container.textContent).toContain('No Tasks Found');
        expect(container.textContent).toContain('Get started by creating your first task');

        const button = container.querySelector('button');
        expect(button).not.toBeNull();
        expect(button?.textContent).toBe('Create Task');

        button?.click();
        expect(onActionMock).toHaveBeenCalledTimes(1);
        resolve();
      }, 50);
    });
  });

  it('renders Modal when isOpen is true and triggers onClose', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onCloseMock = vi.fn();

    root.render(
      <Modal
        isOpen={true}
        onClose={onCloseMock}
        title="Test Modal Dialog"
        footer={<button id="modal-footer-btn">Submit</button>}
      >
        <div id="modal-content">Modal Body Content</div>
      </Modal>
    );

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(container.textContent).toContain('Test Modal Dialog');
        expect(container.textContent).toContain('Modal Body Content');
        expect(container.textContent).toContain('Submit');

        // Close button
        const closeBtn = container.querySelector('button');
        closeBtn?.click();
        expect(onCloseMock).toHaveBeenCalledTimes(1);
        resolve();
      }, 50);
    });
  });

  it('renders TaskCard with priority, status, and tags and calls onClick', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onClickMock = vi.fn();

    const mockTask: Task = {
      id: 'tsk_101',
      project_id: 'prj_01',
      title: 'Implement OAuth Authentication',
      description: 'Support Google and GitHub OAuth providers',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      creator_id: 'usr_1',
      assignee_id: 'usr_2',
      due_date: '2026-11-15',
      position: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [{ id: 'tg_1', project_id: 'prj_01', name: 'Auth', color: '#6366f1', created_at: '' }],
    };

    root.render(<TaskCard task={mockTask} onClick={onClickMock} />);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(container.textContent).toContain('Implement OAuth Authentication');
        expect(container.textContent).toContain('HIGH');
        expect(container.textContent).toContain('Auth');

        const card = container.firstElementChild as HTMLElement;
        card?.click();
        expect(onClickMock).toHaveBeenCalledTimes(1);
        resolve();
      }, 50);
    });
  });

  it('renders KanbanBoard and organizes tasks into correct columns', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onTaskClickMock = vi.fn();
    const onTaskMoveMock = vi.fn();

    const tasks: Task[] = [
      {
        id: 'tsk_1',
        project_id: 'prj_1',
        title: 'Task in TODO',
        description: null,
        status: 'TODO',
        priority: 'LOW',
        creator_id: 'usr_1',
        assignee_id: null,
        due_date: null,
        position: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'tsk_2',
        project_id: 'prj_1',
        title: 'Task in PROGRESS',
        description: null,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        creator_id: 'usr_1',
        assignee_id: null,
        due_date: null,
        position: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'tsk_3',
        project_id: 'prj_1',
        title: 'Task DONE',
        description: null,
        status: 'DONE',
        priority: 'URGENT',
        creator_id: 'usr_1',
        assignee_id: null,
        due_date: null,
        position: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    root.render(
      <KanbanBoard
        tasks={tasks}
        onTaskClick={onTaskClickMock}
        onTaskMove={onTaskMoveMock}
      />
    );

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(container.textContent).toContain('TODO');
        expect(container.textContent).toContain('IN PROGRESS');
        expect(container.textContent).toContain('BLOCKED');
        expect(container.textContent).toContain('DONE');
        expect(container.textContent).toContain('Task in TODO');
        expect(container.textContent).toContain('Task in PROGRESS');
        expect(container.textContent).toContain('Task DONE');
        resolve();
      }, 50);
    });
  });
});
