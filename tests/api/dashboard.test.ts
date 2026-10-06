import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Dashboard & Analytics API (/api/dashboard)', () => {
  let app: any;
  let token: string;
  let projectId: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    const u = await request(app).post('/api/auth/register').send({
      email: 'manager@example.com',
      name: 'Project Manager',
      password: 'password123',
    });
    token = u.body.token;

    const p = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'Dashboard Test Project' });
    projectId = p.body.id;

    // Seed tasks: 1 DONE, 1 IN_PROGRESS, 1 BLOCKED, 1 OVERDUE (TODO with past date)
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
      project_id: projectId,
      title: 'Done Task',
      status: 'DONE',
      priority: 'LOW',
    });

    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
      project_id: projectId,
      title: 'Active Task',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
    });

    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
      project_id: projectId,
      title: 'Blocked Task',
      status: 'BLOCKED',
      priority: 'HIGH',
    });

    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
      project_id: projectId,
      title: 'Overdue Task',
      status: 'TODO',
      priority: 'URGENT',
      due_date: yesterday,
    });
  });

  it('should accurately calculate dashboard metrics and distributions', async () => {
    const res = await request(app)
      .get(`/api/dashboard?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const stats = res.body;

    expect(stats.total_tasks).toBe(4);
    expect(stats.completed_tasks).toBe(1);
    expect(stats.active_tasks).toBe(2); // TODO + IN_PROGRESS
    expect(stats.blocked_tasks).toBe(1);
    expect(stats.overdue_tasks).toBe(1);
    expect(stats.completion_rate_pct).toBe(25); // 1 out of 4 = 25%

    // Status breakdown
    expect(stats.by_status.DONE).toBe(1);
    expect(stats.by_status.IN_PROGRESS).toBe(1);
    expect(stats.by_status.BLOCKED).toBe(1);
    expect(stats.by_status.TODO).toBe(1);

    // Priority breakdown
    expect(stats.by_priority.LOW).toBe(1);
    expect(stats.by_priority.MEDIUM).toBe(1);
    expect(stats.by_priority.HIGH).toBe(1);
    expect(stats.by_priority.URGENT).toBe(1);

    // Recent activity present
    expect(stats.recent_activity.length).toBeGreaterThan(0);
  });
});
