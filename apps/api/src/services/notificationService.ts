import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { Notification } from '@taskforge/shared';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  link?: string | null;
}

export class NotificationService {
  static createNotification(dto: CreateNotificationDto): Notification {
    const db = getDb();
    const id = `ntf_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const cleanLink = dto.link && typeof dto.link === 'string' && dto.link.trim() ? dto.link.trim() : null;

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, is_read, link, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, dto.userId, dto.title.trim(), dto.message.trim(), cleanLink, now);

    return {
      id,
      user_id: dto.userId,
      title: dto.title.trim(),
      message: dto.message.trim(),
      is_read: 0,
      link: cleanLink,
      created_at: now,
    };
  }

  static generateDueDateAlerts(targetUserId?: string): { scanned: number; generated: number } {
    const db = getDb();
    let query = `
      SELECT t.id, t.title, t.due_date, t.project_id, t.assignee_id, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.status != 'DONE'
        AND t.due_date IS NOT NULL
        AND t.assignee_id IS NOT NULL
    `;
    const params: any[] = [];
    if (targetUserId) {
      query += ` AND t.assignee_id = ?`;
      params.push(targetUserId);
    }

    const tasks = db.prepare(query).all(...params) as any[];
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let generatedCount = 0;

    for (const t of tasks) {
      const link = `/projects/${t.project_id}`;
      let title = '';
      let message = '';

      if (t.due_date < todayStr) {
        title = '🚨 Overdue Task';
        message = `Task "${t.title}" in project "${t.project_name}" was due on ${t.due_date} and is now overdue.`;
      } else if (t.due_date === todayStr) {
        title = '⏳ Due Today';
        message = `Task "${t.title}" in project "${t.project_name}" is due today (${t.due_date}).`;
      } else if (t.due_date <= tomorrowStr) {
        title = '📅 Due Soon';
        message = `Task "${t.title}" in project "${t.project_name}" is due tomorrow (${t.due_date}).`;
      } else {
        continue;
      }

      // Check if unread alert already exists for this user and task link
      const existing = db.prepare(`
        SELECT id FROM notifications
        WHERE user_id = ? AND title = ? AND message = ? AND is_read = 0
      `).get(t.assignee_id, title, message) as any;

      if (!existing) {
        this.createNotification({
          userId: t.assignee_id,
          title,
          message,
          link,
        });
        generatedCount++;
      }
    }

    return { scanned: tasks.length, generated: generatedCount };
  }

  static listNotifications(userId: string): Notification[] {
    // Dynamically evaluate due date alerts before returning notifications
    try {
      this.generateDueDateAlerts(userId);
    } catch {
      // Non-blocking if due date evaluation encounters an issue
    }

    const db = getDb();
    const rows = db.prepare(`
      SELECT id, user_id, title, message, is_read, link, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `).all(userId) as unknown as Notification[];
    return rows;
  }

  static markAsRead(userId: string, notificationId: string): void {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId);
  }

  static markAllAsRead(userId: string): void {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  }

  static deleteNotification(userId: string, notificationId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(notificationId, userId);
  }

  static clearAll(userId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  }
}
