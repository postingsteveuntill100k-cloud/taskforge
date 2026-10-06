import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb, getDb } from '../../apps/api/src/db/index.js';

describe('Subtasks & Checklist API (/api/tasks/:id/subtasks)', () => {
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
      email: 'owner@example.com',
      name: 'Project Owner',
      password: 'password123',
    });
    user1Token = u1.body.token;

    // User 2 (External user, not member)
    const u2 = await request(app).post('/api/auth/register').send({
      email: 'external@example.com',
      name: 'External User',
      password: 'password123',
    });
    user2Token = u2.body.token;

    // Project & Task created by User 1
    const p = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Subtask Test Project' });
    projectId = p.body.id;

    const t = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Core Architecture Refactor',
      });
    taskId = t.body.id;
  });

  it('1. should create subtask and return 201 with default values', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Verify SQLite WAL mode' });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^sub_/);
    expect(res.body.task_id).toBe(taskId);
    expect(res.body.title).toBe('Verify SQLite WAL mode');
    expect(res.body.is_completed).toBe(0);
    expect(res.body.position).toBeGreaterThanOrEqual(1);
    expect(res.body.created_at).toBeDefined();
  });

  it('2. should list subtasks in order', async () => {
    await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'First subtask', position: 1 });

    await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Second subtask', position: 2 });

    const listRes = await request(app)
      .get(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);
    expect(listRes.body[0].title).toBe('First subtask');
    expect(listRes.body[1].title).toBe('Second subtask');
  });

  it('3. should toggle subtask completion status', async () => {
    const createRes = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Toggle item' });
    const subtaskId = createRes.body.id;

    // Toggle complete
    const completeRes = await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ is_completed: true });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.is_completed).toBe(1);

    // Reopen
    const reopenRes = await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ is_completed: false });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.is_completed).toBe(0);
  });

  it('4. should update subtask title and position', async () => {
    const createRes = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Original title' });
    const subtaskId = createRes.body.id;

    const updateRes = await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Enhanced title', position: 10 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Enhanced title');
    expect(updateRes.body.position).toBe(10);
  });

  it('5. should reject empty or invalid title with 400', async () => {
    const emptyPost = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: '   ' });

    expect(emptyPost.status).toBe(400);

    const createRes = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Valid title' });
    const subtaskId = createRes.body.id;

    const emptyPatch = await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: '' });

    expect(emptyPatch.status).toBe(400);
  });

  it('6. should delete subtask', async () => {
    const createRes = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'To be deleted' });
    const subtaskId = createRes.body.id;

    const delRes = await request(app)
      .delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(delRes.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(listRes.body).toHaveLength(0);
  });

  it('7. should prevent unauthorized user from accessing or modifying subtasks', async () => {
    const createRes = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Owner secret subtask' });
    const subtaskId = createRes.body.id;

    // External user cannot list
    const unauthList = await request(app)
      .get(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(unauthList.status).toBe(404);

    // External user cannot create
    const unauthCreate = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ title: 'Unauthorized subtask' });
    expect(unauthCreate.status).toBe(404);

    // External user cannot update
    const unauthPatch = await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ is_completed: true });
    expect(unauthPatch.status).toBe(404);

    // External user cannot delete
    const unauthDelete = await request(app)
      .delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(unauthDelete.status).toBe(404);
  });

  it('8. should cascade delete subtasks when parent task is deleted', async () => {
    await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Cascade test subtask' });

    const db = getDb();
    const countBefore = db.prepare('SELECT COUNT(*) as count FROM subtasks WHERE task_id = ?').get(taskId) as any;
    expect(countBefore.count).toBe(1);

    // Delete parent task
    const delTaskRes = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(delTaskRes.status).toBe(200);

    // Verify subtasks cascade deleted
    const countAfter = db.prepare('SELECT COUNT(*) as count FROM subtasks WHERE task_id = ?').get(taskId) as any;
    expect(countAfter.count).toBe(0);
  });

  it('9. should correctly compute subtasks_count and completed_subtasks_count in listTasks and getTask', async () => {
    // Initially count is 0
    const initialGet = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(initialGet.body.subtasks_count).toBe(0);
    expect(initialGet.body.completed_subtasks_count).toBe(0);

    // Create 3 subtasks
    const s1 = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Task item 1' });
    const s2 = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Task item 2' });
    await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Task item 3' });

    // Mark s1 as completed
    await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${s1.body.id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ is_completed: true });

    // Verify in GET /api/tasks/:id
    const getRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.subtasks_count).toBe(3);
    expect(getRes.body.completed_subtasks_count).toBe(1);

    // Verify in GET /api/tasks (list view)
    const listRes = await request(app)
      .get(`/api/tasks?projectId=${projectId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(listRes.status).toBe(200);
    const listed = listRes.body.find((t: any) => t.id === taskId);
    expect(listed).toBeDefined();
    expect(listed.subtasks_count).toBe(3);
    expect(listed.completed_subtasks_count).toBe(1);

    // Mark s2 as completed -> completed count should become 2
    await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${s2.body.id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ is_completed: true });

    const getResAfter2 = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(getResAfter2.body.completed_subtasks_count).toBe(2);

    // Delete s1 -> total count should become 2, completed count should become 1
    await request(app)
      .delete(`/api/tasks/${taskId}/subtasks/${s1.body.id}`)
      .set('Authorization', `Bearer ${user1Token}`);

    const getResAfterDel = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(getResAfterDel.body.subtasks_count).toBe(2);
    expect(getResAfterDel.body.completed_subtasks_count).toBe(1);
  });
});
