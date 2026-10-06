import { TaskPriority, TaskStatus } from './types.js';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  TODO: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  IN_PROGRESS: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  BLOCKED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  DONE: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
};

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  LOW: { bg: '#f3f4f6', text: '#6b7280' },
  MEDIUM: { bg: '#e0e7ff', text: '#4338ca' },
  HIGH: { bg: '#fef3c7', text: '#b45309' },
  URGENT: { bg: '#ffe4e6', text: '#e11d48' },
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
