import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('TaskForge Edge Cases, Security & Member Management Suite', () => {
  const testDbFile = path.resolve(process.cwd(), 'edge_cases_test.db');
  let app: any;
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let user1ProjectId: string;
  let user1TaskId: string;

  beforeEach(async () => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
    closeDb();
    process.env.DATABASE_PATH = testDbFile;
    initDatabase(testDbFile);
    app = createApp();

    // Register User 1
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'user1@test.com',
      name: 'User One',
      password: 'Password123!',
    });
    user1Token = res1.body.token;
    user1Id = res1.body.user.id;

    // Register User 2
    const res2 = await request(app).post('/api/auth/register').send({
      email: 'user2@test.com',
      name: 'User Two',
      password: 'Password123!',
    });
    user2Token = res2.body.token;
    user2Id = res2.body.user.id;

    // User 1 creates project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'User 1 Project' });
    user1ProjectId = projRes.body.id;

    // User 1 creates task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: user1ProjectId,
        title: 'User 1 Task',
        assignee_id: user1Id,
        tags: ['SecurityTag', 'Database'],
      });
    user1TaskId = taskRes.body.id;
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  });

  it('1. should unassign task when assignee_id is empty string without crashing with SQLITE foreign key error', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${user1TaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ assignee_id: '' });

    expect(res.status).toBe(200);
    expect(res.body.assignee_id).toBeNull();
  });

  it('2. should prevent User 2 from reordering tasks in User 1 private project', async () => {
    const res = await request(app)
      .post('/api/tasks/reorder')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        updates: [{ id: user1TaskId, status: 'DONE', position: 999 }],
      });

    // Check if task was modified by User 2
    const taskCheck = await request(app)
      .get(`/api/tasks/${user1TaskId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    // If User 2 is not a member, task status MUST NOT have changed to DONE!
    expect(taskCheck.body.status).toBe('TODO');
  });

  it('3. should reject invalid status with 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${user1TaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'INVALID_STATUS' });

    expect(res.status).toBe(400);
  });

  it('4. should reject assigning task to a user who is not a member of the project', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${user1TaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ assignee_id: user2Id });

    expect(res.status).toBe(400);
  });

  it('5. should manage project members (add, list, update role, remove)', async () => {
    // User 1 adds User 2 as MEMBER
    const addRes = await request(app)
      .post(`/api/projects/${user1ProjectId}/members`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ email: 'user2@test.com', role: 'MEMBER' });
    expect(addRes.status).toBe(201);
    expect(addRes.body.user_id).toBe(user2Id);
    expect(addRes.body.role).toBe('MEMBER');

    // List members
    const listRes = await request(app)
      .get(`/api/projects/${user1ProjectId}/members`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(2);

    // Now User 2 can be assigned to task
    const assignRes = await request(app)
      .patch(`/api/tasks/${user1TaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ assignee_id: user2Id });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.assignee_id).toBe(user2Id);

    // Update User 2 role to VIEWER
    const roleRes = await request(app)
      .patch(`/api/projects/${user1ProjectId}/members/${user2Id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ role: 'VIEWER' });
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.role).toBe('VIEWER');

    // As VIEWER, User 2 should NOT be allowed to create or edit tasks
    const viewerCreate = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ project_id: user1ProjectId, title: 'Viewer Task' });
    expect(viewerCreate.status).toBe(403);

    const viewerUpdate = await request(app)
      .patch(`/api/tasks/${user1TaskId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ title: 'Hacked Title' });
    expect(viewerUpdate.status).toBe(403);

    // Remove User 2 from project
    const removeRes = await request(app)
      .delete(`/api/projects/${user1ProjectId}/members/${user2Id}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(removeRes.status).toBe(200);

    // Confirm task was unassigned upon member removal
    const taskAfterRemoval = await request(app)
      .get(`/api/tasks/${user1TaskId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(taskAfterRemoval.body.assignee_id).toBeNull();
  });

  it('6. should update account profile and change password', async () => {
    const updateRes = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Elena Rostova Updated',
        avatar_url: 'https://avatar.io/elena.png',
        current_password: 'Password123!',
        new_password: 'NewStrongPassword88!',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Elena Rostova Updated');
    expect(updateRes.body.avatar_url).toBe('https://avatar.io/elena.png');

    // Old password should fail login
    const oldLogin = await request(app).post('/api/auth/login').send({
      email: 'user1@test.com',
      password: 'Password123!',
    });
    expect(oldLogin.status).toBe(401);

    // New password should succeed
    const newLogin = await request(app).post('/api/auth/login').send({
      email: 'user1@test.com',
      password: 'NewStrongPassword88!',
    });
    expect(newLogin.status).toBe(200);
  });

  it('7. should find tasks by tag in search', async () => {
    const searchRes = await request(app)
      .get('/api/search?q=SecurityTag')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.tasks.length).toBeGreaterThan(0);
    expect(searchRes.body.tasks[0].id).toBe(user1TaskId);
  });

  it('8. should list users for assignment/invitation', async () => {
    const usersRes = await request(app)
      .get('/api/users?q=User')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(usersRes.status).toBe(200);
    expect(usersRes.body.length).toBeGreaterThanOrEqual(2);
  });

  it('9. should handle concurrent task updates without SQLITE_BUSY', async () => {
    const updates = Array.from({ length: 20 }, (_, i) =>
      request(app)
        .patch(`/api/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ position: i })
    );

    const results = await Promise.all(updates);
    for (const r of results) {
      expect(r.status).toBe(200);
    }
  });
});
