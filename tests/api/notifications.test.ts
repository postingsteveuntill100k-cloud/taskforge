import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('TaskForge Notifications & Due Date Alert Engine Suite', () => {
  let app: any;
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let projectId: string;

  beforeEach(async () => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();

    // User 1 (Assignee / Worker)
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'worker@taskforge.dev',
      name: 'Worker Agent',
      password: 'password123',
    });
    user1Token = res1.body.token;
    user1Id = res1.body.user.id;

    // User 2 (Project Owner / Lead)
    const res2 = await request(app).post('/api/auth/register').send({
      email: 'lead@taskforge.dev',
      name: 'Team Lead',
      password: 'password123',
    });
    user2Token = res2.body.token;
    user2Id = res2.body.user.id;

    // Lead creates project
    const pRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        name: 'Mission Operations',
        description: 'Operations tracking workspace',
        color: '#6366f1',
      });
    projectId = pRes.body.id;

    // Add user 1 as project member
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        email: 'worker@taskforge.dev',
        role: 'MEMBER',
      });
  });

  it('starts with zero notifications for a new unassigned user, and records membership notification', async () => {
    // Brand new user without any projects/tasks
    const freshRes = await request(app).post('/api/auth/register').send({
      email: 'fresh@taskforge.dev',
      name: 'Fresh User',
      password: 'password123',
    });
    const freshList = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${freshRes.body.token}`);

    expect(freshList.status).toBe(200);
    expect(freshList.body).toEqual([]);

    // User 1 was invited to the project in beforeEach, so should have 1 notification
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Added to Project');
  });

  it('generates notification when assigned to a new task by another user', async () => {
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        project_id: projectId,
        title: 'Review System Architecture',
        assignee_id: user1Id,
        priority: 'HIGH',
      });
    expect(taskRes.status).toBe(201);

    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.length).toBeGreaterThanOrEqual(1);
    const assignedNotif = notifRes.body.find((n: any) => n.title === 'Task Assigned');
    expect(assignedNotif).toBeDefined();
    expect(assignedNotif.message).toContain('Review System Architecture');
    expect(assignedNotif.is_read).toBe(0);
  });

  it('generates notification when another user comments on an assigned task', async () => {
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Refactor Data Pipeline',
        assignee_id: user1Id,
      });

    // User 2 comments on User 1's task
    const cmtRes = await request(app)
      .post(`/api/tasks/${taskRes.body.id}/comments`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        content: 'Please ensure idempotency checks are included.',
      });
    expect(cmtRes.status).toBe(201);

    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    const cmtNotif = notifRes.body.find((n: any) => n.title === 'New Comment');
    expect(cmtNotif).toBeDefined();
    expect(cmtNotif.message).toContain('Refactor Data Pipeline');
  });

  it('due date engine automatically detects overdue, today, and tomorrow deadlines', async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Task 1: Overdue
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Critical Security Patch',
        assignee_id: user1Id,
        due_date: yesterdayStr,
      });

    // Task 2: Due Today
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Release Candidate Verification',
        assignee_id: user1Id,
        due_date: todayStr,
      });

    // Task 3: Due Tomorrow
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Documentation Review',
        assignee_id: user1Id,
        due_date: tomorrowStr,
      });

    // Task 4: Next Week (should NOT trigger alert)
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Long-term Planning',
        assignee_id: user1Id,
        due_date: nextWeekStr,
      });

    // Task 5: Overdue but completed (should NOT trigger alert)
    const doneTask = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Already Fixed Bug',
        assignee_id: user1Id,
        due_date: yesterdayStr,
      });
    await request(app)
      .patch(`/api/tasks/${doneTask.body.id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'DONE' });

    // Explicit check alert trigger
    const checkRes = await request(app)
      .post('/api/notifications/check-alerts')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.generated).toBe(3);

    // Fetch notifications
    const notifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    const overdueAlert = notifs.body.find((n: any) => n.title.includes('Overdue'));
    expect(overdueAlert).toBeDefined();
    expect(overdueAlert.message).toContain('Critical Security Patch');

    const todayAlert = notifs.body.find((n: any) => n.title.includes('Due Today'));
    expect(todayAlert).toBeDefined();
    expect(todayAlert.message).toContain('Release Candidate Verification');

    const soonAlert = notifs.body.find((n: any) => n.title.includes('Due Soon'));
    expect(soonAlert).toBeDefined();
    expect(soonAlert.message).toContain('Documentation Review');

    // Deduplication check: running check-alerts again should generate 0 duplicates
    const rerun = await request(app)
      .post('/api/notifications/check-alerts')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(rerun.body.generated).toBe(0);
  });

  it('supports marking individual notifications as read and marking all as read', async () => {
    // Generate an alert
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Overdue Audit Item',
        assignee_id: user1Id,
        due_date: yesterday.toISOString().split('T')[0],
      });

    const notifsRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(notifsRes.body.length).toBeGreaterThanOrEqual(1);
    const target = notifsRes.body[0];
    expect(target.is_read).toBe(0);

    // Mark single as read
    const patchRes = await request(app)
      .patch(`/api/notifications/${target.id}/read`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(patchRes.status).toBe(200);

    // Verify marked
    const afterPatch = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);
    const found = afterPatch.body.find((n: any) => n.id === target.id);
    expect(found.is_read).toBe(1);

    // Mark all as read
    const allRes = await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(allRes.status).toBe(200);
  });

  it('supports deleting individual notifications and clearing all notifications', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        project_id: projectId,
        title: 'Temporary Reminder',
        assignee_id: user1Id,
        due_date: yesterday.toISOString().split('T')[0],
      });

    let notifs = (await request(app).get('/api/notifications').set('Authorization', `Bearer ${user1Token}`)).body;
    expect(notifs.length).toBeGreaterThan(0);
    const idToDelete = notifs[0].id;

    // Delete single
    const delRes = await request(app)
      .delete(`/api/notifications/${idToDelete}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(delRes.status).toBe(200);

    notifs = (await request(app).get('/api/notifications').set('Authorization', `Bearer ${user1Token}`)).body;
    expect(notifs.find((n: any) => n.id === idToDelete)).toBeUndefined();

    // Clear all
    const clearRes = await request(app)
      .delete('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(clearRes.status).toBe(200);

    // After clearing, check list without re-triggering new alert creation
    // Directly query database to confirm table is empty for user1
    const finalNotifs = (await request(app).get('/api/notifications').set('Authorization', `Bearer ${user1Token}`)).body;
    // Since listNotifications triggers alert generation for existing unfinished tasks,
    // let's complete the task first to ensure clearAll permanently empties it:
    const tasks = (await request(app).get(`/api/tasks?projectId=${projectId}`).set('Authorization', `Bearer ${user1Token}`)).body;
    for (const t of tasks) {
      await request(app).patch(`/api/tasks/${t.id}`).set('Authorization', `Bearer ${user1Token}`).send({ status: 'DONE' });
    }
    await request(app).delete('/api/notifications').set('Authorization', `Bearer ${user1Token}`);
    const emptyList = (await request(app).get('/api/notifications').set('Authorization', `Bearer ${user1Token}`)).body;
    expect(emptyList).toEqual([]);
  });
});
