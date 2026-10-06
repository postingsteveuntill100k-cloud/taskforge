import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Comments API (/api/comments & /api/tasks/:id/comments)', () => {
  let app: any;
  let user1Token: string;
  let user2Token: string;
  let projectId: string;
  let taskId: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    // User 1 (Project Owner)
    const u1 = await request(app).post('/api/auth/register').send({
      email: 'user1@example.com',
      name: 'User One',
      password: 'password123',
    });
    user1Token = u1.body.token;

    // User 2
    const u2 = await request(app).post('/api/auth/register').send({
      email: 'user2@example.com',
      name: 'User Two',
      password: 'password123',
    });
    user2Token = u2.body.token;

    // Project & Task created by User 1
    const p = await request(app).post('/api/projects').set('Authorization', `Bearer ${user1Token}`).send({ name: 'Comment Test' });
    projectId = p.body.id;

    const t = await request(app).post('/api/tasks').set('Authorization', `Bearer ${user1Token}`).send({
      project_id: projectId,
      title: 'Task for Comments',
    });
    taskId = t.body.id;
  });

  it('should add comment and list comments with author details', async () => {
    const addRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ content: 'Initial specification is approved.' });

    expect(addRes.status).toBe(201);
    expect(addRes.body.id).toBeDefined();
    expect(addRes.body.content).toBe('Initial specification is approved.');
    expect(addRes.body.user.name).toBe('User One');

    const listRes = await request(app)
      .get(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].content).toBe('Initial specification is approved.');
  });

  it('should allow author to update comment', async () => {
    const addRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ content: 'Draft version.' });
    const commentId = addRes.body.id;

    const editRes = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ content: 'Final revised version.' });

    expect(editRes.status).toBe(200);
    expect(editRes.body.content).toBe('Final revised version.');
  });

  it('should prevent non-author from editing someone else comment', async () => {
    const addRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ content: 'Owner comment.' });
    const commentId = addRes.body.id;

    const unauthorizedEdit = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ content: 'Malicious edit.' });

    expect(unauthorizedEdit.status).toBe(403);
  });

  it('should allow author to delete comment', async () => {
    const addRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ content: 'Temporary note.' });
    const commentId = addRes.body.id;

    const delRes = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(delRes.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(listRes.body).toHaveLength(0);
  });
});
