import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ActivityService } from './activityService.js';
import { Comment, CreateCommentDto, UpdateCommentDto } from '@taskforge/shared';

export class CommentService {
  static listComments(taskId: string, userId: string): Comment[] {
    const db = getDb();
    // Validate project membership
    const task = db.prepare(`
      SELECT t.id, t.project_id
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE t.id = ?
    `).get(userId, taskId);

    if (!task) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    const rows = db.prepare(`
      SELECT 
        c.id, c.task_id, c.user_id, c.content, c.created_at, c.updated_at,
        u.name as user_name, u.email as user_email, u.avatar_url as user_avatar, u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(taskId) as any[];

    return rows.map((r) => ({
      id: r.id,
      task_id: r.task_id,
      user_id: r.user_id,
      content: r.content,
      created_at: r.created_at,
      updated_at: r.updated_at,
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

  static createComment(taskId: string, userId: string, dto: CreateCommentDto): Comment {
    const { content } = dto;
    if (!content || !content.trim()) {
      const err: any = new Error('Comment content cannot be empty.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    const task = db.prepare(`
      SELECT t.id, t.title, t.project_id, t.creator_id, t.assignee_id
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE t.id = ?
    `).get(userId, taskId) as any;

    if (!task) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    const commentId = `cmt_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO comments (id, task_id, user_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(commentId, taskId, userId, content.trim(), now, now);

    ActivityService.logActivity(
      task.project_id,
      taskId,
      userId,
      'COMMENT_ADDED',
      `Commented on task "${task.title}"`
    );

    // Notify task assignee if someone else comments
    if (task.assignee_id && task.assignee_id !== userId) {
      const notifId = `ntf_${crypto.randomUUID().slice(0, 12)}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, 'New Comment', ?, '/tasks', ?)
      `).run(notifId, task.assignee_id, `New comment on task "${task.title}"`, now);
    }

    const user = db.prepare('SELECT id, name, email, avatar_url, role, created_at FROM users WHERE id = ?').get(userId) as any;

    return {
      id: commentId,
      task_id: taskId,
      user_id: userId,
      content: content.trim(),
      created_at: now,
      updated_at: now,
      user,
    };
  }

  static updateComment(commentId: string, userId: string, dto: UpdateCommentDto): Comment {
    const { content } = dto;
    if (!content || !content.trim()) {
      const err: any = new Error('Comment content cannot be empty.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as any;
    if (!existing) {
      const err: any = new Error('Comment not found.');
      err.status = 404;
      throw err;
    }

    if (existing.user_id !== userId) {
      const err: any = new Error('You can only edit your own comments.');
      err.status = 403;
      throw err;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?').run(content.trim(), now, commentId);

    const user = db.prepare('SELECT id, name, email, avatar_url, role, created_at FROM users WHERE id = ?').get(userId) as any;

    return {
      id: commentId,
      task_id: existing.task_id,
      user_id: userId,
      content: content.trim(),
      created_at: existing.created_at,
      updated_at: now,
      user,
    };
  }

  static deleteComment(commentId: string, userId: string): void {
    const db = getDb();
    const existing = db.prepare(`
      SELECT c.*, u.role as user_role 
      FROM comments c
      JOIN users u ON u.id = ?
      WHERE c.id = ?
    `).get(userId, commentId) as any;

    if (!existing) {
      const err: any = new Error('Comment not found.');
      err.status = 404;
      throw err;
    }

    if (existing.user_id !== userId && existing.user_role !== 'ADMIN') {
      const err: any = new Error('You can only delete your own comments.');
      err.status = 403;
      throw err;
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  }
}
