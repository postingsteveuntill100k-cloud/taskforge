import { Router, Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const projectsRouter = Router();

projectsRouter.use(authMiddleware);

projectsRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const projects = ProjectService.listProjects(req.user!.id);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const project = ProjectService.createProject(req.user!.id, req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.get('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const project = ProjectService.getProject(req.params.id as string, req.user!.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.patch('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const project = ProjectService.updateProject(req.params.id as string, req.user!.id, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    ProjectService.deleteProject(req.params.id as string, req.user!.id);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    next(err);
  }
});
