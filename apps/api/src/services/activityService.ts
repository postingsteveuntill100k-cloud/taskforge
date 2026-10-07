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

  static getProjectActivityCsv(projectId: string, options?: { startDate?: string; endDate?: string }): string {
    const db = getDb();
    
    let query = `
      SELECT 
        a.created_at,
        u.email as actor_email,
        a.event_type,
        a.description
      FROM activity_events a
      JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ?
    `;
    const params: any[] = [projectId];

    if (options?.startDate) {
      query += ` AND a.created_at >= ?`;
      params.push(options.startDate);
    }
    if (options?.endDate) {
      query += ` AND a.created_at <= ?`;
      params.push(options.endDate);
    }

    query += ` ORDER BY a.created_at DESC`;
    
    const rows = db.prepare(query).all(...params) as any[];
    
    let csv = 'timestamp,actor_email,event_type,details\n';
    
    for (const row of rows) {
      // Escape CSV fields
      const escapeField = (field: any) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      
      const timestamp = escapeField(row.created_at);
      const email = escapeField(row.actor_email);
      const eventType = escapeField(row.event_type);
      const details = escapeField(row.description);
      
      csv += `${timestamp},${email},${eventType},${details}\n`;
    }
    
    return csv;
  }

  static validateAuditCsv(csv: string): { valid: boolean; errors: string[]; rowCount: number } {
    const errors: string[] = [];
    if (!csv || typeof csv !== 'string' || !csv.trim()) {
      return { valid: false, errors: ['CSV content is empty.'], rowCount: 0 };
    }

    // RFC 4180 CSV parser
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    const text = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (insideQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else if (char === '"') {
          insideQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\n') {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
    }
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    // Filter out trailing empty line if any
    const nonEmptyRows = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim().length > 0));

    if (nonEmptyRows.length === 0) {
      return { valid: false, errors: ['CSV contains no header or rows.'], rowCount: 0 };
    }

    // Validate Header
    const header = nonEmptyRows[0];
    const expectedHeaders = ['timestamp', 'actor_email', 'event_type', 'details'];
    if (header.length !== 4 || header.some((h, idx) => h.trim() !== expectedHeaders[idx])) {
      errors.push(`Invalid CSV header. Expected: "${expectedHeaders.join(',')}", Received: "${header.join(',')}"`);
      return { valid: false, errors, rowCount: 0 };
    }

    const dataRows = nonEmptyRows.slice(1);
    const validEventTypes = new Set([
      'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED',
      'TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED', 'TASK_COMPLETED',
      'COMMENT_ADDED', 'COMMENT_DELETED',
      'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_ROLE_UPDATED',
      'SUBTASK_CREATED', 'SUBTASK_TOGGLED', 'SUBTASK_DELETED'
    ]);

    dataRows.forEach((row, idx) => {
      const lineNum = idx + 2;
      if (row.length !== 4) {
        errors.push(`Line ${lineNum}: Expected 4 columns, found ${row.length}.`);
        return;
      }

      const [timestamp, email, eventType, details] = row;

      // Validate timestamp format
      const dateVal = Date.parse(timestamp);
      if (isNaN(dateVal) || !timestamp.includes('T')) {
        errors.push(`Line ${lineNum}: Invalid ISO timestamp "${timestamp}".`);
      }

      // Validate email format
      if (!email.includes('@') || !email.includes('.')) {
        errors.push(`Line ${lineNum}: Invalid actor email format "${email}".`);
      }

      // Validate event_type
      if (!validEventTypes.has(eventType)) {
        errors.push(`Line ${lineNum}: Unknown event type "${eventType}".`);
      }

      // Validate details
      if (!details || details.trim().length === 0) {
        errors.push(`Line ${lineNum}: Details field cannot be empty.`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      rowCount: dataRows.length,
    };
  }
}
