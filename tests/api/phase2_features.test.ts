import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Phase 2 Advanced Features Suite', () => {
  let app: any;
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let projectId: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    // User 1
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'lead@taskforge.dev',
      name: 'Tech Lead',
      password: 'password123',
    });
    user1Token = res1.body.token;
    user1Id = res1.body.user.id;

    // User 2
    const res2 = await request(app).post('/api/auth/register').send({
      email: 'external@taskforge.dev',
      name: 'External Dev',
      password: 'password123',
    });
    user2Token = res2.body.token;
    user2Id = res2.body.user.id;

    // Create a base project
    const pRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Phase 2 Architecture Project',
        description: 'Advanced features workspace',
        color: '#10b981',
      });
    projectId = pRes.body.id;
  });

  describe('System Metrics & Telemetry (/api/metrics)', () => {
    it('should return system metrics with valid process, memory, and database telemetry', async () => {
      const res = await request(app).get('/api/metrics');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.process).toBeDefined();
      expect(res.body.process.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(res.body.memory).toBeDefined();
      expect(res.body.memory.rss_bytes).toBeGreaterThan(0);
      expect(res.body.database).toBeDefined();
      expect(res.body.database.table_counts).toBeDefined();
      expect(res.body.database.table_counts.users).toBe(2);
      expect(res.body.database.table_counts.projects).toBe(1);
    });
  });

  describe('OpenAPI Documentation (/api/docs)', () => {
    it('should return valid OpenAPI 3.0 specification', async () => {
      const res = await request(app).get('/api/docs');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toBe('TaskForge API');
      expect(res.body.paths['/health']).toBeDefined();
      expect(res.body.paths['/metrics']).toBeDefined();
      expect(res.body.paths['/projects/import']).toBeDefined();
      expect(res.body.paths['/saved-filters']).toBeDefined();
    });
  });

  describe('Saved Filters API (/api/saved-filters)', () => {
    it('should create and list saved filter configurations for a project', async () => {
      // 1. Create saved filter
      const createRes = await request(app)
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'High Priority Bugs',
          project_id: projectId,
          filter_config: { priority: 'HIGH', status: 'IN_PROGRESS' },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toBeDefined();
      expect(createRes.body.name).toBe('High Priority Bugs');
      expect(createRes.body.filter_config).toEqual({ priority: 'HIGH', status: 'IN_PROGRESS' });

      // 2. List filters
      const listRes = await request(app)
        .get(`/api/saved-filters?projectId=${projectId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].name).toBe('High Priority Bugs');

      // 3. User 2 should not see User 1 filters
      const list2Res = await request(app)
        .get(`/api/saved-filters?projectId=${projectId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(list2Res.status).toBe(200);
      expect(list2Res.body.length).toBe(0);

      // 4. User 2 cannot delete User 1 filter
      const delForbidden = await request(app)
        .delete(`/api/saved-filters/${createRes.body.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(delForbidden.status).toBe(403);

      // 5. User 1 can delete their own filter
      const delOk = await request(app)
        .delete(`/api/saved-filters/${createRes.body.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(delOk.status).toBe(200);
    });
  });

  describe('Project Export & Import Engine', () => {
    it('should export project as JSON and CSV, and import successfully into a new workspace', async () => {
      // 1. Create tasks with tags
      const t1 = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          project_id: projectId,
          title: 'Implement Metrics Endpoint',
          description: 'Add system telemetry',
          priority: 'URGENT',
          status: 'IN_PROGRESS',
          tags: ['telemetry', 'backend'],
        });
      expect(t1.status).toBe(201);

      // Add a comment to task
      const c1 = await request(app)
        .post(`/api/tasks/${t1.body.id}/comments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Telemetry looks comprehensive!' });
      expect(c1.status).toBe(201);

      // 2. Export as JSON bundle
      const exportJsonRes = await request(app)
        .get(`/api/projects/${projectId}/export`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(exportJsonRes.status).toBe(200);
      expect(exportJsonRes.body.version).toBe('1.0');
      expect(exportJsonRes.body.project.name).toBe('Phase 2 Architecture Project');
      expect(exportJsonRes.body.tasks.length).toBe(1);
      expect(exportJsonRes.body.tasks[0].title).toBe('Implement Metrics Endpoint');
      expect(exportJsonRes.body.tasks[0].tags).toContain('backend');
      expect(exportJsonRes.body.tasks[0].comments.length).toBe(1);
      expect(exportJsonRes.body.tasks[0].comments[0].content).toBe('Telemetry looks comprehensive!');

      // 3. Export as CSV
      const exportCsvRes = await request(app)
        .get(`/api/projects/${projectId}/export/csv`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(exportCsvRes.status).toBe(200);
      expect(exportCsvRes.headers['content-type']).toContain('text/csv');
      expect(exportCsvRes.text).toContain('Implement Metrics Endpoint');
      expect(exportCsvRes.text).toContain('URGENT');

      // 4. Import the bundle as User 2 into their own new project
      const importRes = await request(app)
        .post('/api/projects/import')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(exportJsonRes.body);

      expect(importRes.status).toBe(201);
      expect(importRes.body.id).toBeDefined();
      expect(importRes.body.id).not.toBe(projectId); // Brand new ID
      expect(importRes.body.name).toBe('Phase 2 Architecture Project');
      expect(importRes.body.owner_id).toBe(user2Id);

      // Verify tasks in newly imported project
      const importedTasksRes = await request(app)
        .get(`/api/tasks?projectId=${importRes.body.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(importedTasksRes.status).toBe(200);
      expect(importedTasksRes.body.length).toBe(1);
      expect(importedTasksRes.body[0].title).toBe('Implement Metrics Endpoint');
      expect(importedTasksRes.body[0].priority).toBe('URGENT');
    });
  });
});
