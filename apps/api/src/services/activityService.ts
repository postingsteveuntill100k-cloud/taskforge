import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ActivityEventType, ActivityEvent } from '@taskforge/shared';

export class ActivityService {
  static logActivity(
    projectId: string,
    taskId: string | null,
    userId: string,
    eventType: ActivityEventType,
    description: string,
    metadata?: Record<string, any>
  ): ActivityEvent {
    const db = getDb();
    const id = `act_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const metaStr = metadata ? JSON.stringify(metadata) : null;

    db.prepare(`
      INSERT INTO activity_events (id, project_id, task_id, user_id, event_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, taskId, userId, eventType, description, metaStr, now);

    return {
      id,
      project_id: projectId,
      task_id: taskId,
      user_id: userId,
      event_type: eventType,
      description,
      metadata,
      created_at: now,
    };
  }

  static listActivity(
    userId: string,
    options: { projectId?: string; taskId?: string; limit?: number } = {}
  ): ActivityEvent[] {
    const db = getDb();
    const limit = Math.min(options.limit || 50, 100);

    let query = `
      SELECT 
        a.id, a.project_id, a.task_id, a.user_id, a.event_type, a.description, a.metadata, a.created_at,
        u.name as user_name, u.email as user_email, u.avatar_url as user_avatar, u.role as user_role,
        t.title as task_title
      FROM activity_events a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN tasks t ON a.task_id = t.id
      JOIN project_members pm ON a.project_id = pm.project_id AND pm.user_id = ?
    `;
    const params: any[] = [userId];

    if (options.projectId) {
      query += ` AND a.project_id = ?`;
      params.push(options.projectId);
    }
    if (options.taskId) {
      query += ` AND a.task_id = ?`;
      params.push(options.taskId);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      task_id: r.task_id,
      user_id: r.user_id,
      event_type: r.event_type,
      description: r.description,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      created_at: r.created_at,
      task_title: r.task_title,
      user: {
        id: r.user_id,
        name: r.user_name,
        email: r.user_email,
        avatar_url: r.user_avatar,
        role: r.user_role,
        created_at: r.created_at,
      },
    }));
  }
}
