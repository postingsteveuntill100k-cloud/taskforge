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

  it('should filter audit log export by date range', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const futureDate = new Date(Date.now() + 3600000).toISOString();

    const res = await request(app)
      .get(`/api/projects/${projectId}/audit-export?startDate=${pastDate}&endDate=${futureDate}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('PROJECT_CREATED');

    // Future start date should return only header
    const futureStart = new Date(Date.now() + 7200000).toISOString();
    const emptyRes = await request(app)
      .get(`/api/projects/${projectId}/audit-export?startDate=${futureStart}`)
      .set('Authorization', `Bearer ${token}`);

    expect(emptyRes.status).toBe(200);
    const lines = emptyRes.text.trim().split('\n');
    expect(lines.length).toBe(1); // Header only
    expect(lines[0]).toBe('timestamp,actor_email,event_type,details');
  });

  it('should validate genuine exported CSV using ActivityService.validateAuditCsv', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/audit-export`)
      .set('Authorization', `Bearer ${token}`);

    const validation = ActivityService.validateAuditCsv(res.text);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.rowCount).toBe(2);
  });

  it('should reject invalid or malformed CSV via ActivityService.validateAuditCsv', () => {
    // 1. Empty CSV
    const emptyRes = ActivityService.validateAuditCsv('');
    expect(emptyRes.valid).toBe(false);
    expect(emptyRes.errors[0]).toContain('empty');

    // 2. Bad header
    const badHeaderRes = ActivityService.validateAuditCsv('col1,col2,col3,col4\n1,2,3,4');
    expect(badHeaderRes.valid).toBe(false);
    expect(badHeaderRes.errors[0]).toContain('Invalid CSV header');

    // 3. Bad timestamp and unknown event type
    const malformedCsv = 'timestamp,actor_email,event_type,details\nnot-a-date,user@test.com,FAKE_EVENT,some details\n';
    const malformedRes = ActivityService.validateAuditCsv(malformedCsv);
    expect(malformedRes.valid).toBe(false);
    expect(malformedRes.errors.some((e) => e.includes('Invalid ISO timestamp'))).toBe(true);
    expect(malformedRes.errors.some((e) => e.includes('Unknown event type'))).toBe(true);
  });

  it('should validate CSV via POST /api/projects/:id/audit-export/validate endpoint', async () => {
    const validCsv = 'timestamp,actor_email,event_type,details\n2026-10-07T00:00:00.000Z,audit@test.com,PROJECT_CREATED,Project created\n';
    const res = await request(app)
      .post(`/api/projects/${projectId}/audit-export/validate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ csv: validCsv });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.rowCount).toBe(1);

    // Invalid CSV payload
    const invalidRes = await request(app)
      .post(`/api/projects/${projectId}/audit-export/validate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ csv: 'garbage data' });

    expect(invalidRes.status).toBe(200);
    expect(invalidRes.body.valid).toBe(false);
    expect(invalidRes.body.errors.length).toBeGreaterThan(0);
  });

  it('should return 401 for unauthenticated export requests', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/audit-export`);
    expect(res.status).toBe(401);
  });
});
