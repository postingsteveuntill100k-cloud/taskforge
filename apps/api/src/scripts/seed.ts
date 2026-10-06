import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { initDatabase } from '../db/index.js';

export function runSeed(customDb?: any) {
  const db = customDb || initDatabase();
  console.log('Seeding TaskForge database with realistic production-grade data...');

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  const dueSoon = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  const overdue = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
  const dueNextWeek = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  // 1. Users
  const users = [
    {
      id: 'usr_admin001',
      email: 'admin@taskforge.dev',
      name: 'Sarah Connor',
      role: 'ADMIN',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      id: 'usr_alex002',
      email: 'alex@taskforge.dev',
      name: 'Alex Chen',
      role: 'MEMBER',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      id: 'usr_elena003',
      email: 'elena@taskforge.dev',
      name: 'Elena Rostova',
      role: 'MEMBER',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  ];

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, name, avatar_url, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.email, passwordHash, u.name, u.avatar_url, u.role, twoDaysAgo, now);
  }

  // 2. Projects
  const projects = [
    {
      id: 'prj_core001',
      name: 'TaskForge SaaS Platform',
      description: 'Core cloud task and project orchestration SaaS suite with real-time collaboration.',
      owner_id: 'usr_admin001',
      color: '#4f46e5',
    },
    {
      id: 'prj_mobile002',
      name: 'TaskForge Mobile App',
      description: 'Cross-platform companion application for iOS and Android workflows.',
      owner_id: 'usr_alex002',
      color: '#0ea5e9',
    },
  ];

  const insertProject = db.prepare(`
    INSERT OR REPLACE INTO projects (id, name, description, owner_id, is_archived, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `);

  for (const p of projects) {
    insertProject.run(p.id, p.name, p.description, p.owner_id, p.color, twoDaysAgo, now);
  }

  // 3. Project Members
  const insertMember = db.prepare(`
    INSERT OR REPLACE INTO project_members (id, project_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertMember.run('mem_01', 'prj_core001', 'usr_admin001', 'OWNER', twoDaysAgo);
  insertMember.run('mem_02', 'prj_core001', 'usr_alex002', 'ADMIN', twoDaysAgo);
  insertMember.run('mem_03', 'prj_core001', 'usr_elena003', 'MEMBER', twoDaysAgo);
  insertMember.run('mem_04', 'prj_mobile002', 'usr_alex002', 'OWNER', twoDaysAgo);
  insertMember.run('mem_05', 'prj_mobile002', 'usr_admin001', 'MEMBER', twoDaysAgo);

  // 4. Tags
  const tags = [
    { id: 'tag_be', project_id: 'prj_core001', name: 'Backend', color: '#6366f1' },
    { id: 'tag_fe', project_id: 'prj_core001', name: 'Frontend', color: '#ec4899' },
    { id: 'tag_sec', project_id: 'prj_core001', name: 'Security', color: '#ef4444' },
    { id: 'tag_perf', project_id: 'prj_core001', name: 'Performance', color: '#f59e0b' },
    { id: 'tag_ux', project_id: 'prj_core001', name: 'UX/UI', color: '#8b5cf6' },
  ];

  const insertTag = db.prepare(`
    INSERT OR REPLACE INTO tags (id, project_id, name, color, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const t of tags) {
    insertTag.run(t.id, t.project_id, t.name, t.color, twoDaysAgo);
  }

  // 5. Tasks
  const tasks = [
    {
      id: 'tsk_001',
      project_id: 'prj_core001',
      title: 'Architect JWT Auth & Session Revocation',
      description: 'Implement hardened session management with HMAC SHA-256 tokens and database session revocation check.',
      status: 'DONE',
      priority: 'HIGH',
      creator_id: 'usr_admin001',
      assignee_id: 'usr_alex002',
      due_date: twoDaysAgo.split('T')[0],
      position: 1,
      tags: ['tag_be', 'tag_sec'],
    },
    {
      id: 'tsk_002',
      project_id: 'prj_core001',
      title: 'Real-time Kanban Board with Drag & Drop Transitions',
      description: 'Build responsive columns (TODO, IN PROGRESS, BLOCKED, DONE) with immediate optimistic state update.',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      creator_id: 'usr_admin001',
      assignee_id: 'usr_alex002',
      due_date: dueSoon,
      position: 2,
      tags: ['tag_fe', 'tag_ux'],
    },
    {
      id: 'tsk_003',
      project_id: 'prj_core001',
      title: 'Server-side Multi-Parametric Search Endpoint',
      description: 'Build query planner searching title, description, tags, status, assignee with SQL indexing.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      creator_id: 'usr_elena003',
      assignee_id: 'usr_admin001',
      due_date: dueSoon,
      position: 3,
      tags: ['tag_be', 'tag_perf'],
    },
    {
      id: 'tsk_004',
      project_id: 'prj_core001',
      title: 'Overdue Task Alert Notification Engine',
      description: 'Automated notification generation when tasks cross due date without reaching DONE status.',
      status: 'BLOCKED',
      priority: 'MEDIUM',
      creator_id: 'usr_alex002',
      assignee_id: 'usr_elena003',
      due_date: overdue,
      position: 4,
      tags: ['tag_be'],
    },
    {
      id: 'tsk_005',
      project_id: 'prj_core001',
      title: 'Project Analytics & Velocity Dashboard',
      description: 'Aggregates task completion velocity, blocked task ratios, and member workloads into visual graphs.',
      status: 'TODO',
      priority: 'MEDIUM',
      creator_id: 'usr_admin001',
      assignee_id: 'usr_elena003',
      due_date: dueNextWeek,
      position: 5,
      tags: ['tag_fe', 'tag_ux'],
    },
    {
      id: 'tsk_006',
      project_id: 'prj_core001',
      title: 'Audit Logging & Activity Timeline Stream',
      description: 'Event-sourced audit logs tracking all CRUD modifications with user attribution.',
      status: 'DONE',
      priority: 'LOW',
      creator_id: 'usr_alex002',
      assignee_id: 'usr_alex002',
      due_date: yesterday.split('T')[0],
      position: 6,
      tags: ['tag_be', 'tag_sec'],
    },
  ];

  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (id, project_id, title, description, status, priority, creator_id, assignee_id, due_date, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTaskTag = db.prepare(`
    INSERT OR REPLACE INTO task_tags (task_id, tag_id) VALUES (?, ?)
  `);

  for (const t of tasks) {
    insertTask.run(t.id, t.project_id, t.title, t.description, t.status, t.priority, t.creator_id, t.assignee_id, t.due_date, t.position, twoDaysAgo, now);
    for (const tagId of t.tags) {
      insertTaskTag.run(t.id, tagId);
    }
  }

  // 6. Comments
  const comments = [
    {
      id: 'cmt_001',
      task_id: 'tsk_002',
      user_id: 'usr_admin001',
      content: 'Kanban board drag state should trigger optimistic status transition immediately before waiting on HTTP PATCH response.',
      created_at: yesterday,
    },
    {
      id: 'cmt_002',
      task_id: 'tsk_002',
      user_id: 'usr_alex002',
      content: 'Agreed! Implementing the state cache with rollback on network failure.',
      created_at: now,
    },
    {
      id: 'cmt_003',
      task_id: 'tsk_004',
      user_id: 'usr_elena003',
      content: 'This task is blocked waiting on the email gateway API key credentials.',
      created_at: yesterday,
    },
  ];

  const insertComment = db.prepare(`
    INSERT OR REPLACE INTO comments (id, task_id, user_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const c of comments) {
    insertComment.run(c.id, c.task_id, c.user_id, c.content, c.created_at, c.created_at);
  }

  // 7. Activity Events
  const events = [
    {
      id: 'act_001',
      project_id: 'prj_core001',
      task_id: null,
      user_id: 'usr_admin001',
      event_type: 'PROJECT_CREATED',
      description: 'Sarah Connor created project "TaskForge SaaS Platform"',
      created_at: twoDaysAgo,
    },
    {
      id: 'act_002',
      project_id: 'prj_core001',
      task_id: 'tsk_001',
      user_id: 'usr_admin001',
      event_type: 'TASK_CREATED',
      description: 'Created task "Architect JWT Auth & Session Revocation"',
      created_at: twoDaysAgo,
    },
    {
      id: 'act_003',
      project_id: 'prj_core001',
      task_id: 'tsk_001',
      user_id: 'usr_alex002',
      event_type: 'TASK_COMPLETED',
      description: 'Alex Chen completed task "Architect JWT Auth & Session Revocation"',
      created_at: yesterday,
    },
    {
      id: 'act_004',
      project_id: 'prj_core001',
      task_id: 'tsk_002',
      user_id: 'usr_alex002',
      event_type: 'TASK_ASSIGNED',
      description: 'Assigned "Real-time Kanban Board" to Alex Chen',
      created_at: yesterday,
    },
    {
      id: 'act_005',
      project_id: 'prj_core001',
      task_id: 'tsk_002',
      user_id: 'usr_admin001',
      event_type: 'COMMENT_ADDED',
      description: 'Sarah Connor commented on "Real-time Kanban Board"',
      created_at: now,
    },
  ];

  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO activity_events (id, project_id, task_id, user_id, event_type, description, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const e of events) {
    insertEvent.run(e.id, e.project_id, e.task_id, e.user_id, e.event_type, e.description, JSON.stringify({ source: 'seed' }), e.created_at);
  }

  // 8. Notifications
  const insertNotif = db.prepare(`
    INSERT OR REPLACE INTO notifications (id, user_id, title, message, is_read, link, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run('ntf_01', 'usr_admin001', 'Task Assigned', 'Alex Chen assigned you to task "Server-side Multi-Parametric Search Endpoint"', 0, '/tasks', now);
  insertNotif.run('ntf_02', 'usr_alex002', 'New Comment', 'Sarah Connor commented on your task "Real-time Kanban Board"', 0, '/tasks', now);

  console.log('✓ Seeding complete. 3 users, 2 projects, 6 tasks, 3 comments, 5 activity logs generated.');
}

runSeed();

