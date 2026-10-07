import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Project Tag & Label Management API (/api/projects/:id/tags)', () => {
  let app: any;
  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;
  let externalToken: string;
  let projectId: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    // 1. Owner
    const u1 = await request(app).post('/api/auth/register').send({
      email: 'owner@example.com',
      name: 'Project Owner',
      password: 'password123',
    });
    ownerToken = u1.body.token;

    // 2. Member
    const u2 = await request(app).post('/api/auth/register').send({
      email: 'member@example.com',
      name: 'Team Member',
      password: 'password123',
    });
    memberToken = u2.body.token;

    // 3. Viewer
    const u3 = await request(app).post('/api/auth/register').send({
      email: 'viewer@example.com',
      name: 'Project Viewer',
      password: 'password123',
    });
    viewerToken = u3.body.token;

    // 4. External User
    const u4 = await request(app).post('/api/auth/register').send({
      email: 'external@example.com',
      name: 'External User',
      password: 'password123',
    });
    externalToken = u4.body.token;

    // Create project
    const p = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Tag Management Test Project' });
    projectId = p.body.id;

    // Add Member & Viewer to project
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ user_id: u2.body.user.id, role: 'MEMBER' });

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ user_id: u3.body.user.id, role: 'VIEWER' });
  });

  it('1. should create tag with custom color and return 201', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Backend', color: '#6366f1' });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^tag_/);
    expect(res.body.name).toBe('Backend');
    expect(res.body.color).toBe('#6366f1');
    expect(res.body.project_id).toBe(projectId);
    expect(res.body.created_at).toBeDefined();
  });

  it('2. should reject empty tag name with 400', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '   ', color: '#ef4444' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Tag name is required');
  });

  it('3. should reject duplicate tag name in same project with 409', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Urgent', color: '#ef4444' });

    const duplicateRes = await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'urgent', color: '#dc2626' });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.error).toBeDefined();
  });

  it('4. should list tags with accurate task_count', async () => {
    // Create tags
    const t1 = await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Security', color: '#ef4444' });

    await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Frontend', color: '#10b981' });

    // Create a task tagged with 'Security'
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        project_id: projectId,
        title: 'Audit JWT nonces',
        tags: ['Security'],
      });

    const listRes = await request(app)
      .get(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);
    
    const secTag = listRes.body.find((t: any) => t.name === 'Security');
    expect(secTag).toBeDefined();
    expect(secTag.task_count).toBe(1);

    const feTag = listRes.body.find((t: any) => t.name === 'Frontend');
    expect(feTag).toBeDefined();
    expect(feTag.task_count).toBe(0);
  });

  it('5. should update tag name and color', async () => {
    const createRes = await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'DevOps', color: '#64748b' });
    const tagId = createRes.body.id;

    const updateRes = await request(app)
      .patch(`/api/projects/${projectId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Infrastructure', color: '#0ea5e9' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Infrastructure');
    expect(updateRes.body.color).toBe('#0ea5e9');
  });

  it('6. should delete tag and remove associations from tasks without deleting the task', async () => {
    const createRes = await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Deprecated', color: '#94a3b8' });
    const tagId = createRes.body.id;

    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        project_id: projectId,
        title: 'Legacy cleanup task',
        tags: ['Deprecated'],
      });
    const taskId = taskRes.body.id;

    // Delete tag
    const delRes = await request(app)
      .delete(`/api/projects/${projectId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(delRes.status).toBe(200);

    // Verify task still exists but has 0 tags
    const taskGet = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(taskGet.status).toBe(200);
    expect(taskGet.body.tags).toHaveLength(0);
  });

  it('7. should enforce RBAC: VIEWER can list but cannot create or delete tags', async () => {
    // Viewer can list
    const listRes = await request(app)
      .get(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(listRes.status).toBe(200);

    // Viewer cannot create
    const createRes = await request(app)
      .post(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Unauthorized Tag' });
    expect(createRes.status).toBe(403);
    expect(createRes.body.error).toContain('Viewers cannot modify project tags');

    // External user cannot access
    const extRes = await request(app)
      .get(`/api/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${externalToken}`);
    expect(extRes.status).toBe(403);
  });

  it('8. should filter tasks by tag name correctly', async () => {
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        project_id: projectId,
        title: 'Frontend Button Polish',
        tags: ['UX', 'Frontend'],
      });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        project_id: projectId,
        title: 'Database WAL checkpoint',
        tags: ['Database'],
      });

    const uxRes = await request(app)
      .get(`/api/tasks?projectId=${projectId}&tag=UX`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(uxRes.status).toBe(200);
    expect(uxRes.body).toHaveLength(1);
    expect(uxRes.body[0].title).toBe('Frontend Button Polish');

    const dbRes = await request(app)
      .get(`/api/tasks?projectId=${projectId}&tag=Database`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(dbRes.status).toBe(200);
    expect(dbRes.body).toHaveLength(1);
    expect(dbRes.body[0].title).toBe('Database WAL checkpoint');
  });
});
