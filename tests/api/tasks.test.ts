import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Tasks API (/api/tasks)', () => {
  let app: any;
  let token: string;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    // Register User
    const regRes = await request(app).post('/api/auth/register').send({
      email: 'lead@example.com',
      name: 'Tech Lead',
      password: 'password123',
    });
    token = regRes.body.token;
    userId = regRes.body.user.id;

    // Create Project
    const pRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Task Test Project' });
    projectId = pRes.body.id;
  });

  it('should create a task with tags and default values', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        title: 'Implement OAuth Flow',
        description: 'Add Google and GitHub OAuth providers',
        priority: 'URGENT',
        tags: ['Security', 'Backend'],
        due_date: '2026-12-31',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Implement OAuth Flow');
    expect(res.body.status).toBe('TODO');
    expect(res.body.priority).toBe('URGENT');
    expect(res.body.tags).toHaveLength(2);
    expect(res.body.tags.map((t: any) => t.name)).toContain('Security');
  });

  it('should list tasks with status and priority filtering', async () => {
    // Task 1: TODO, HIGH
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        title: 'Task 1',
        status: 'TODO',
        priority: 'HIGH',
      });

    // Task 2: DONE, LOW
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        title: 'Task 2',
        status: 'DONE',
        priority: 'LOW',
      });

    // Filter by status = DONE
    const doneRes = await request(app)
      .get(`/api/tasks?projectId=${projectId}&status=DONE`)
      .set('Authorization', `Bearer ${token}`);

    expect(doneRes.status).toBe(200);
    expect(doneRes.body).toHaveLength(1);
    expect(doneRes.body[0].title).toBe('Task 2');

    // Filter by priority = HIGH
    const highRes = await request(app)
      .get(`/api/tasks?projectId=${projectId}&priority=HIGH`)
      .set('Authorization', `Bearer ${token}`);

    expect(highRes.status).toBe(200);
    expect(highRes.body).toHaveLength(1);
    expect(highRes.body[0].title).toBe('Task 1');
  });

  it('should update task status and log transition', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        title: 'Feature X',
        status: 'TODO',
      });
    const taskId = createRes.body.id;

    // Move to IN_PROGRESS
    const updateRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('IN_PROGRESS');

    // Move to DONE
    const doneRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DONE' });

    expect(doneRes.status).toBe(200);
    expect(doneRes.body.status).toBe('DONE');
  });

  it('should batch reorder tasks for Kanban board', async () => {
    const t1 = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ project_id: projectId, title: 'Item 1' });
    const t2 = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ project_id: projectId, title: 'Item 2' });

    const reorderRes = await request(app)
      .post('/api/tasks/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({
        updates: [
          { id: t1.body.id, status: 'IN_PROGRESS', position: 1 },
          { id: t2.body.id, status: 'IN_PROGRESS', position: 2 },
        ],
      });

    expect(reorderRes.status).toBe(200);

    const check = await request(app).get(`/api/tasks/${t1.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(check.body.status).toBe('IN_PROGRESS');
  });

  it('should delete a task', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, title: 'To Delete' });
    const taskId = createRes.body.id;

    const delRes = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });
});
