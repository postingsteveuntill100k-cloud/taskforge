import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('TaskForge End-to-End Full Lifecycle Verification (Section 16 Specification)', () => {
  const testDbFile = path.resolve(process.cwd(), 'e2e_persistent_test.db');
  let app: any;

  it('executes full 10-step lifecycle test with real SQLite persistence', async () => {
    // Clean up previous test db if present
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }

    closeDb();
    process.env.DATABASE_PATH = testDbFile;
    initDatabase(testDbFile);
    app = createApp();

    // 1. Register & Login
    const regRes = await request(app).post('/api/auth/register').send({
      email: 'founder@taskforge.io',
      name: 'Elena Rostova',
      password: 'StrongPassword99!',
    });
    expect(regRes.status).toBe(201);
    const originalToken = regRes.body.token;
    const userId = regRes.body.user.id;
    expect(originalToken).toBeDefined();

    // Verify login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'founder@taskforge.io',
      password: 'StrongPassword99!',
    });
    expect(loginRes.status).toBe(200);
    const activeToken = loginRes.body.token;

    // 2. Create Project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({
        name: 'Autonomous TaskForge SaaS',
        description: 'End-to-end verified SaaS platform build',
        color: '#4f46e5',
      });
    expect(projectRes.status).toBe(201);
    const projectId = projectRes.body.id;
    expect(projectId).toBeDefined();

    // 3. Create Task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({
        project_id: projectId,
        title: 'Design Scalable Database Architecture',
        description: 'Implement relational SQLite with ACID transactions and foreign keys',
        status: 'TODO',
        priority: 'URGENT',
        tags: ['Database', 'Architecture'],
        due_date: '2026-12-31',
      });
    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.id;
    expect(taskId).toBeDefined();

    // 4. Modify Task (update priority & description)
    const modifyRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${activeToken}`)
      .send({
        description: 'Updated: Schema migrated and WAL mode enabled.',
        priority: 'HIGH',
      });
    expect(modifyRes.status).toBe(200);
    expect(modifyRes.body.description).toContain('WAL mode enabled');
    expect(modifyRes.body.priority).toBe('HIGH');

    // 5. Move Task (Kanban transition: TODO -> IN_PROGRESS)
    const moveRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${activeToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.status).toBe('IN_PROGRESS');

    // 6. Comment on Task
    const commentRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${activeToken}`)
      .send({ content: 'Verified database indexes and foreign key cascades.' });
    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.id;
    expect(commentId).toBeDefined();

    // 7. Search & Filter
    const searchRes = await request(app)
      .get(`/api/search?q=Architecture&projectId=${projectId}`)
      .set('Authorization', `Bearer ${activeToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.tasks.length).toBeGreaterThan(0);
    expect(searchRes.body.tasks[0].id).toBe(taskId);

    // 8. Complete Task (IN_PROGRESS -> DONE)
    const completeRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${activeToken}`)
      .send({ status: 'DONE' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe('DONE');

    // 9. Logout & Login again
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${activeToken}`);
    expect(logoutRes.status).toBe(200);

    const reLoginRes = await request(app).post('/api/auth/login').send({
      email: 'founder@taskforge.io',
      password: 'StrongPassword99!',
    });
    expect(reLoginRes.status).toBe(200);
    const freshToken = reLoginRes.body.token;

    // 10. Verify Persisted Data across connection restart
    closeDb();
    // Reopen database from disk
    initDatabase(testDbFile);
    const newApp = createApp();

    const verifyTaskRes = await request(newApp)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${freshToken}`);
    expect(verifyTaskRes.status).toBe(200);
    expect(verifyTaskRes.body.id).toBe(taskId);
    expect(verifyTaskRes.body.status).toBe('DONE');
    expect(verifyTaskRes.body.title).toBe('Design Scalable Database Architecture');

    const verifyCommentsRes = await request(newApp)
      .get(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${freshToken}`);
    expect(verifyCommentsRes.status).toBe(200);
    expect(verifyCommentsRes.body).toHaveLength(1);
    expect(verifyCommentsRes.body[0].content).toContain('foreign key cascades');

    const verifyDashboardRes = await request(newApp)
      .get(`/api/dashboard?projectId=${projectId}`)
      .set('Authorization', `Bearer ${freshToken}`);
    expect(verifyDashboardRes.status).toBe(200);
    expect(verifyDashboardRes.body.total_tasks).toBe(1);
    expect(verifyDashboardRes.body.completed_tasks).toBe(1);
    expect(verifyDashboardRes.body.completion_rate_pct).toBe(100);

    // Clean up test file
    closeDb();
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  });
});
