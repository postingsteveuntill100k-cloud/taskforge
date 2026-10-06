import crypto from 'node:crypto';
import { getDb } from '../db/index.js';

export interface SavedFilter {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  filter_config: Record<string, any>;
  created_at: string;
}

export class SavedFilterService {
  static list(userId: string, projectId?: string): SavedFilter[] {
    const db = getDb();
    let query = `
      SELECT id, user_id, project_id, name, filter_config, created_at
      FROM saved_filters
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (projectId) {
      query += ` AND project_id = ?`;
      params.push(projectId);
    }

    query += ` ORDER BY created_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      project_id: r.project_id,
      name: r.name,
      filter_config: JSON.parse(r.filter_config || '{}'),
      created_at: r.created_at,
    }));
  }

  static create(userId: string, data: { name: string; project_id: string; filter_config: Record<string, any> }): SavedFilter {
    if (!data.name || !data.project_id) {
      const err: any = new Error('Name and project_id are required.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    // Verify membership in project
    const member = db.prepare(`SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`).get(data.project_id, userId);
    if (!member) {
      const err: any = new Error('Access denied. You are not a member of this project.');
      err.status = 403;
      throw err;
    }

    const id = `flt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();
    const configStr = JSON.stringify(data.filter_config || {});

    db.prepare(`
      INSERT INTO saved_filters (id, user_id, project_id, name, filter_config, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, data.project_id, data.name.trim(), configStr, now);

    return {
      id,
      user_id: userId,
      project_id: data.project_id,
      name: data.name.trim(),
      filter_config: data.filter_config || {},
      created_at: now,
    };
  }

  static delete(filterId: string, userId: string): void {
    const db = getDb();
    const filter = db.prepare(`SELECT user_id FROM saved_filters WHERE id = ?`).get(filterId) as any;

    if (!filter) {
      const err: any = new Error('Saved filter not found.');
      err.status = 404;
      throw err;
    }

    if (filter.user_id !== userId) {
      const err: any = new Error('Access denied. You can only delete your own saved filters.');
      err.status = 403;
      throw err;
    }

    db.prepare(`DELETE FROM saved_filters WHERE id = ?`).run(filterId);
  }
}
