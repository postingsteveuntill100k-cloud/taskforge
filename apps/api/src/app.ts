import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { commentsRouter } from './routes/comments.js';
import { activityRouter } from './routes/activity.js';
import { dashboardRouter } from './routes/dashboard.js';
import { searchRouter } from './routes/search.js';
import { notificationsRouter } from './routes/notifications.js';
import { usersRouter } from './routes/users.js';
import { savedFiltersRouter } from './routes/savedFilters.js';
import { MetricsService } from './services/metricsService.js';
import { DocsService } from './services/docsService.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'TaskForge API',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // System & Database Metrics endpoint
  app.get('/api/metrics', (req, res) => {
    res.json(MetricsService.getSystemMetrics());
  });

  // OpenAPI Documentation endpoint
  app.get('/api/docs', (req, res) => {
    res.json(DocsService.getOpenApiSpec());
  });

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api', activityRouter); // to handle /api/projects/:id/audit-export if it was requested specifically on /api
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/saved-filters', savedFiltersRouter);

  // Static files for production web client
  const clientDistPath = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.url.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Error handler
  app.use(errorHandler);

  return app;
}
