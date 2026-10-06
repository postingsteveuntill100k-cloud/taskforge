import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Search API (/api/search)', () => {
  let app: any;
  let token: string;
  let projectId: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    const u = await request(app).post('/api/auth/register').send({
      email: 'searcher@example.com',
      name: 'Search Tester',
      password: 'password123',
    });
    token = u.body.token;

    const p = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({
      name: 'Searchable Platform',
      description: 'Infrastructure codebase',
    });
    projectId = p.body.id;

    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
      project_id: projectId,
      title: 'Optimize Database Indexing',
      description: 'Add composite B-Tree indexes for fast query response',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });

    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
      project_id: projectId,
      title: 'Fix React Component Re-rendering',
      description: 'Memoize expensive state calculations',
      status: 'TODO',
      priority: 'MEDIUM',
    });
  });

  it('should find tasks matching keyword in title or description', async () => {
    const res = await request(app)
      .get('/api/search?q=Database')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('Optimize Database Indexing');
  });

  it('should find projects matching keyword', async () => {
    const res = await request(app)
      .get('/api/search?q=Searchable')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0].name).toBe('Searchable Platform');
  });
});
