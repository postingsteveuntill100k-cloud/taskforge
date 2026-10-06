import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Projects API (/api/projects)', () => {
  let app: any;
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    // Register User 1
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'owner@example.com',
      name: 'Owner User',
      password: 'password123',
    });
    user1Token = res1.body.token;
    user1Id = res1.body.user.id;

    // Register User 2
    const res2 = await request(app).post('/api/auth/register').send({
      email: 'stranger@example.com',
      name: 'Stranger User',
      password: 'password123',
    });
    user2Token = res2.body.token;
    user2Id = res2.body.user.id;
  });

  it('should create a new project and assign owner', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Alpha Initiative',
        description: 'First high-impact project',
        color: '#6366f1',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Alpha Initiative');
    expect(res.body.owner_id).toBe(user1Id);
    expect(res.body.is_archived).toBe(0);
  });

  it('should list projects for the authenticated user only', async () => {
    // User 1 creates project
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Project 1' });

    // User 2 creates project
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ name: 'Project 2' });

    // User 1 lists
    const list1 = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(list1.status).toBe(200);
    expect(list1.body).toHaveLength(1);
    expect(list1.body[0].name).toBe('Project 1');

    // User 2 lists
    const list2 = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${user2Token}`);
    expect(list2.status).toBe(200);
    expect(list2.body).toHaveLength(1);
    expect(list2.body[0].name).toBe('Project 2');
  });

  it('should prevent non-members from viewing project details', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Confidential Project' });
    const projectId = createRes.body.id;

    // Stranger tries to get project
    const strangerGet = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(strangerGet.status).toBe(403);
  });

  it('should allow project owner to update and archive project', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Original Name' });
    const projectId = createRes.body.id;

    // Update
    const updateRes = await request(app)
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Renamed Project', is_archived: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Renamed Project');
    expect(updateRes.body.is_archived).toBe(1);
  });

  it('should allow owner to delete project', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Disposable Project' });
    const projectId = createRes.body.id;

    const delRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(delRes.status).toBe(200);

    // Verify gone
    const checkRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(checkRes.status).toBe(403);
  });
});
