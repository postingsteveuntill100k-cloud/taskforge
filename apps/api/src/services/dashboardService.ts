import { getDb } from '../db/index.js';
import { ActivityService } from './activityService.js';
import { DashboardStats, TaskPriority, TaskStatus } from '@taskforge/shared';

export class DashboardService {
  static getDashboardStats(userId: string, projectId?: string): DashboardStats {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    let baseFilter = `
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE 1=1
    `;
    const params: any[] = [userId];

    if (projectId) {
      baseFilter += ` AND t.project_id = ?`;
      params.push(projectId);
    }

    // Totals
    const totalRow = db.prepare(`SELECT COUNT(*) as c ${baseFilter}`).get(...params) as any;
    const completedRow = db.prepare(`SELECT COUNT(*) as c ${baseFilter} AND t.status = 'DONE'`).get(...params) as any;
    const activeRow = db.prepare(`SELECT COUNT(*) as c ${baseFilter} AND t.status IN ('TODO', 'IN_PROGRESS')`).get(...params) as any;
    const blockedRow = db.prepare(`SELECT COUNT(*) as c ${baseFilter} AND t.status = 'BLOCKED'`).get(...params) as any;
    const overdueRow = db.prepare(`SELECT COUNT(*) as c ${baseFilter} AND t.due_date IS NOT NULL AND t.due_date < ? AND t.status != 'DONE'`).get(...params, today) as any;

    const total = Number(totalRow?.c || 0);
    const completed = Number(completedRow?.c || 0);
    const active = Number(activeRow?.c || 0);
    const blocked = Number(blockedRow?.c || 0);
    const overdue = Number(overdueRow?.c || 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Status breakdown
    const statusRows = db.prepare(`SELECT t.status, COUNT(*) as c ${baseFilter} GROUP BY t.status`).all(...params) as any[];
    const byStatus: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      DONE: 0,
    };
    for (const r of statusRows) {
      if (r.status in byStatus) {
        byStatus[r.status as TaskStatus] = Number(r.c);
      }
    }

    // Priority breakdown
    const priorityRows = db.prepare(`SELECT t.priority, COUNT(*) as c ${baseFilter} GROUP BY t.priority`).all(...params) as any[];
    const byPriority: Record<TaskPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    for (const r of priorityRows) {
      if (r.priority in byPriority) {
        byPriority[r.priority as TaskPriority] = Number(r.c);
      }
    }

    // Recent activity
    const recentActivity = ActivityService.listActivity(userId, { projectId, limit: 8 });

    // Project summaries
    const projectSummariesRows = db.prepare(`
      SELECT 
        p.id, p.name,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completed
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.is_archived = 0
      GROUP BY p.id, p.name
      ORDER BY p.updated_at DESC
    `).all(userId) as any[];

    const projectSummaries = projectSummariesRows.map((r) => {
      const pTotal = Number(r.total || 0);
      const pDone = Number(r.completed || 0);
      return {
        id: r.id,
        name: r.name,
        total: pTotal,
        completed: pDone,
        completion_rate: pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0,
      };
    });

    return {
      total_tasks: total,
      completed_tasks: completed,
      active_tasks: active,
      blocked_tasks: blocked,
      overdue_tasks: overdue,
      completion_rate_pct: completionRate,
      by_status: byStatus,
      by_priority: byPriority,
      recent_activity: recentActivity,
      project_summaries: projectSummaries,
    };
  }
}
