import { Router, Response } from 'express';
import { TaskService } from '../services/taskService.js';
import { CommentService } from '../services/commentService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { TaskPriority, TaskStatus } from '@taskforge/shared';

export const tasksRouter = Router();

tasksRouter.use(authMiddleware);

tasksRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { projectId, status, priority, assigneeId, tag, search, sort } = req.query;
    const tasks = TaskService.listTasks(req.user!.id, {
      projectId: projectId as string,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      assigneeId: assigneeId as string,
      tag: tag as string,
      search: search as string,
      sort: sort as string,
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const task = TaskService.createTask(req.user!.id, req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/reorder', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      res.status(400).json({ error: 'Updates must be an array of task status/positions.' });
      return;
    }
    TaskService.reorderTasks(req.user!.id, updates);
    res.json({ message: 'Tasks reordered successfully.' });
  } catch (err) {
    next(err);
  }
});

tasksRouter.get('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const task = TaskService.getTask(req.params.id as string, req.user!.id);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const task = TaskService.updateTask(req.params.id as string, req.user!.id, req.body);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    TaskService.deleteTask(req.params.id as string, req.user!.id);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Nested comment endpoints
tasksRouter.get('/:id/comments', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const comments = CommentService.listComments(req.params.id as string, req.user!.id);
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/:id/comments', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const comment = CommentService.createComment(req.params.id as string, req.user!.id, req.body);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// Nested subtask endpoints
tasksRouter.get('/:id/subtasks', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const subtasks = TaskService.getSubtasks(req.params.id as string, req.user!.id);
    res.json(subtasks);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/:id/subtasks', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const subtask = TaskService.createSubtask(req.params.id as string, req.user!.id, req.body);
    res.status(201).json(subtask);
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch('/:id/subtasks/:subtaskId', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const subtask = TaskService.updateSubtask(req.params.id as string, req.params.subtaskId as string, req.user!.id, req.body);
    res.json(subtask);
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete('/:id/subtasks/:subtaskId', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    TaskService.deleteSubtask(req.params.id as string, req.params.subtaskId as string, req.user!.id);
    res.json({ message: 'Subtask deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

