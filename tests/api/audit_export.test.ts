import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, getDb, closeDb } from '../../apps/api/src/db/index.js';
import { ActivityService } from '../../apps/api/src/services/activityService.js';
import { ActivityEventType } from '@taskforge/shared';
import crypto from 'node:crypto';

describe('Audit Export API', () => {
  let app: any;
  let token: string;
  let userId: string;
  let projectId: string;
  let db: any;

  beforeAll(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    db = getDb();
    app = createApp();

    const email = `audit_${Date.now()}@example.com`;
    const regRes = await request(app).post('/api/auth/register').send({
      email,
      name: 'Audit User',
      password: 'password123',
    });
    token = regRes.body.token;
    userId = regRes.body.user.id;

    projectId = `prj_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO projects (id, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
      projectId,
      'Test Audit Project',
      userId,
      now,
      now
    );
    db.prepare(`INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(
      projectId,
      userId,
      'ADMIN',
      now
    );

    // Add some activities
    ActivityService.logActivity(projectId, null, userId, 'PROJECT_CREATED' as ActivityEventType, 'Created project');
    ActivityService.logActivity(projectId, null, userId, 'TASK_CREATED' as ActivityEventType, 'Created task, "test"');
  });

  afterAll(() => {
    // nothing to clean up for in-memory db
  });

  it('should export audit log in CSV format', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/audit-export`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('timestamp,actor_email,event_type,details');
    expect(lines.length).toBe(3); // Header + 2 activities
    expect(res.text).toContain('TASK_CREATED');
    expect(res.text).toContain('"Created task, ""test"""');
    expect(res.text).toContain('PROJECT_CREATED');
  });
});
