import { getDb } from '../db/index.js';
import { Notification } from '@taskforge/shared';

export class NotificationService {
  static listNotifications(userId: string): Notification[] {
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
}
