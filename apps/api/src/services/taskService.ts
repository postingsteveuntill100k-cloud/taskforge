import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ActivityService } from './activityService.js';
import { CreateTaskDto, Tag, Task, TaskPriority, TaskStatus, UpdateTaskDto, UserSafe } from '@taskforge/shared';

const VALID_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
const VALID_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export class TaskService {
  static listTasks(
    userId: string,
    filters: {
      projectId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      tag?: string;
      search?: string;
      sort?: string;
    } = {}
  ): Task[] {
    const db = getDb();

    let query = `
      SELECT 
        t.id, t.project_id, t.title, t.description, t.status, t.priority,
        t.creator_id, t.assignee_id, t.due_date, t.position, t.created_at, t.updated_at,
        cu.name as creator_name, cu.email as creator_email, cu.avatar_url as creator_avatar,
        au.name as assignee_name, au.email as assignee_email, au.avatar_url as assignee_avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comments_count
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      JOIN users cu ON t.creator_id = cu.id
      LEFT JOIN users au ON t.assignee_id = au.id
      WHERE 1=1
    `;
    const params: any[] = [userId];

    if (filters.projectId) {
      query += ` AND t.project_id = ?`;
      params.push(filters.projectId);
    }
    if (filters.status && VALID_STATUSES.includes(filters.status)) {
      query += ` AND t.status = ?`;
      params.push(filters.status);
    }
    if (filters.priority && VALID_PRIORITIES.includes(filters.priority)) {
      query += ` AND t.priority = ?`;
      params.push(filters.priority);
    }
    if (filters.assigneeId) {
      query += ` AND t.assignee_id = ?`;
      params.push(filters.assigneeId);
    }
    if (filters.search && filters.search.trim()) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      const term = `%${filters.search.trim()}%`;
      params.push(term, term);
    }

    if (filters.sort === 'due_date') {
      query += ` ORDER BY t.due_date ASC NULLS LAST, t.position ASC`;
    } else if (filters.sort === 'priority') {
      query += ` ORDER BY 
        CASE t.priority 
          WHEN 'URGENT' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
          ELSE 5 
        END ASC, t.position ASC`;
    } else if (filters.sort === 'created_at') {
      query += ` ORDER BY t.created_at DESC`;
    } else {
      query += ` ORDER BY t.position ASC, t.updated_at DESC`;
    }

    const rows = db.prepare(query).all(...params) as any[];

    // Fetch tags for these tasks
    const taskIds = rows.map((r) => r.id);
    const tagsMap: Record<string, Tag[]> = {};

    if (taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      const tagRows = db.prepare(`
        SELECT tt.task_id, tg.id, tg.project_id, tg.name, tg.color, tg.created_at
        FROM task_tags tt
        JOIN tags tg ON tt.tag_id = tg.id
        WHERE tt.task_id IN (${placeholders})
      `).all(...taskIds) as any[];

      for (const tr of tagRows) {
        if (!tagsMap[tr.task_id]) tagsMap[tr.task_id] = [];
        tagsMap[tr.task_id].push({
          id: tr.id,
          project_id: tr.project_id,
          name: tr.name,
          color: tr.color,
          created_at: tr.created_at,
        });
      }
    }

    let tasks: Task[] = rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      title: r.title,
      description: r.description,
      status: r.status as TaskStatus,
      priority: r.priority as TaskPriority,
      creator_id: r.creator_id,
      assignee_id: r.assignee_id,
      due_date: r.due_date,
      position: r.position,
      created_at: r.created_at,
      updated_at: r.updated_at,
      comments_count: Number(r.comments_count || 0),
      creator: {
        id: r.creator_id,
        name: r.creator_name,
        email: r.creator_email,
        avatar_url: r.creator_avatar,
        role: 'MEMBER',
        created_at: r.created_at,
      },
      assignee: r.assignee_id
        ? {
            id: r.assignee_id,
            name: r.assignee_name,
            email: r.assignee_email,
            avatar_url: r.assignee_avatar,
            role: 'MEMBER',
            created_at: r.created_at,
          }
        : null,
      tags: tagsMap[r.id] || [],
    }));

    if (filters.tag) {
      tasks = tasks.filter((t) => t.tags?.some((tg) => tg.name.toLowerCase() === filters.tag?.toLowerCase()));
    }

    return tasks;
  }

  static getTask(taskId: string, userId: string): Task {
    const db = getDb();
    const task = db.prepare(`
      SELECT 
        t.id, t.project_id, t.title, t.description, t.status, t.priority,
        t.creator_id, t.assignee_id, t.due_date, t.position, t.created_at, t.updated_at,
        cu.name as creator_name, cu.email as creator_email, cu.avatar_url as creator_avatar,
        au.name as assignee_name, au.email as assignee_email, au.avatar_url as assignee_avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comments_count
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      JOIN users cu ON t.creator_id = cu.id
      LEFT JOIN users au ON t.assignee_id = au.id
      WHERE t.id = ?
    `).get(userId, taskId) as any;

    if (!task) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    const tagRows = db.prepare(`
      SELECT tg.id, tg.project_id, tg.name, tg.color, tg.created_at
      FROM task_tags tt
      JOIN tags tg ON tt.tag_id = tg.id
      WHERE tt.task_id = ?
    `).all(taskId) as unknown as Tag[];

    return {
      id: task.id,
      project_id: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      creator_id: task.creator_id,
      assignee_id: task.assignee_id,
      due_date: task.due_date,
      position: task.position,
      created_at: task.created_at,
      updated_at: task.updated_at,
      comments_count: Number(task.comments_count || 0),
      creator: {
        id: task.creator_id,
        name: task.creator_name,
        email: task.creator_email,
        avatar_url: task.creator_avatar,
        role: 'MEMBER',
        created_at: task.created_at,
      },
      assignee: task.assignee_id
        ? {
            id: task.assignee_id,
            name: task.assignee_name,
            email: task.assignee_email,
            avatar_url: task.assignee_avatar,
            role: 'MEMBER',
            created_at: task.created_at,
          }
        : null,
      tags: tagRows,
    };
  }

  static createTask(userId: string, dto: CreateTaskDto): Task {
    const { project_id, title, description, status, priority, assignee_id, due_date, tags } = dto;

    if (!title || title.trim().length === 0) {
      const err: any = new Error('Task title is required.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    // Validate project access
    const memberCheck = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(project_id, userId);

    if (!memberCheck) {
      const err: any = new Error('Access denied. You are not a member of this project.');
      err.status = 403;
      throw err;
    }

    const taskStatus: TaskStatus = status && VALID_STATUSES.includes(status) ? status : 'TODO';
    const taskPriority: TaskPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM';

    // Get next position in project
    const posRow = db.prepare(`SELECT MAX(position) as max_pos FROM tasks WHERE project_id = ?`).get(project_id) as any;
    const position = (posRow?.max_pos || 0) + 1;

    const taskId = `tsk_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, creator_id, assignee_id, due_date, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      project_id,
      title.trim(),
      description || null,
      taskStatus,
      taskPriority,
      userId,
      assignee_id || null,
      due_date || null,
      position,
      now,
      now
    );

    // Tags handling
    const insertedTags: Tag[] = [];
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        if (!tagName.trim()) continue;
        let tag = db.prepare(`SELECT * FROM tags WHERE project_id = ? AND name = ?`).get(project_id, tagName.trim()) as any;
        if (!tag) {
          const tagId = `tag_${crypto.randomUUID().slice(0, 8)}`;
          db.prepare(`INSERT INTO tags (id, project_id, name, color, created_at) VALUES (?, ?, ?, '#64748b', ?)`).run(
            tagId,
            project_id,
            tagName.trim(),
            now
          );
          tag = { id: tagId, project_id, name: tagName.trim(), color: '#64748b', created_at: now };
        }
        db.prepare(`INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)`).run(taskId, tag.id);
        insertedTags.push(tag);
      }
    }

    ActivityService.logActivity(
      project_id,
      taskId,
      userId,
      'TASK_CREATED',
      `Created task "${title.trim()}"`,
      { status: taskStatus, priority: taskPriority }
    );

    if (assignee_id && assignee_id !== userId) {
      const notifId = `ntf_${crypto.randomUUID().slice(0, 12)}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, 'Task Assigned', ?, '/tasks', ?)
      `).run(notifId, assignee_id, `You were assigned to task "${title.trim()}"`, now);
    }

    return this.getTask(taskId, userId);
  }

  static updateTask(taskId: string, userId: string, dto: UpdateTaskDto): Task {
    const db = getDb();
    const existing = db.prepare(`
      SELECT t.*, u.name as user_name
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      JOIN users u ON u.id = ?
      WHERE t.id = ?
    `).get(userId, userId, taskId) as any;

    if (!existing) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const title = dto.title !== undefined ? dto.title.trim() : existing.title;
    const description = dto.description !== undefined ? dto.description : existing.description;
    const status: TaskStatus = dto.status && VALID_STATUSES.includes(dto.status) ? dto.status : existing.status;
    const priority: TaskPriority = dto.priority && VALID_PRIORITIES.includes(dto.priority) ? dto.priority : existing.priority;
    const assignee_id = dto.assignee_id !== undefined ? dto.assignee_id : existing.assignee_id;
    const due_date = dto.due_date !== undefined ? dto.due_date : existing.due_date;
    const position = dto.position !== undefined ? dto.position : existing.position;

    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, due_date = ?, position = ?, updated_at = ?
      WHERE id = ?
    `).run(title, description, status, priority, assignee_id, due_date, position, now, taskId);

    // Track status transitions
    if (dto.status && dto.status !== existing.status) {
      if (dto.status === 'DONE') {
        ActivityService.logActivity(
          existing.project_id,
          taskId,
          userId,
          'TASK_COMPLETED',
          `Completed task "${title}"`,
          { old_status: existing.status, new_status: status }
        );
      } else {
        ActivityService.logActivity(
          existing.project_id,
          taskId,
          userId,
          'TASK_UPDATED',
          `Moved task "${title}" to ${status}`,
          { old_status: existing.status, new_status: status }
        );
      }
    }

    // Track assignee changes
    if (dto.assignee_id !== undefined && dto.assignee_id !== existing.assignee_id) {
      let assigneeName = 'Nobody';
      if (dto.assignee_id) {
        const u = db.prepare('SELECT name FROM users WHERE id = ?').get(dto.assignee_id) as any;
        if (u) assigneeName = u.name;
      }
      ActivityService.logActivity(
        existing.project_id,
        taskId,
        userId,
        'TASK_ASSIGNED',
        `Assigned task "${title}" to ${assigneeName}`,
        { assignee_id }
      );

      if (dto.assignee_id && dto.assignee_id !== userId) {
        const notifId = `ntf_${crypto.randomUUID().slice(0, 12)}`;
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, link, created_at)
          VALUES (?, ?, 'Task Assigned', ?, '/tasks', ?)
        `).run(notifId, dto.assignee_id, `You were assigned to task "${title}"`, now);
      }
    }

    // Update tags if provided
    if (dto.tags && Array.isArray(dto.tags)) {
      db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
      for (const tagName of dto.tags) {
        if (!tagName.trim()) continue;
        let tag = db.prepare(`SELECT * FROM tags WHERE project_id = ? AND name = ?`).get(existing.project_id, tagName.trim()) as any;
        if (!tag) {
          const tagId = `tag_${crypto.randomUUID().slice(0, 8)}`;
          db.prepare(`INSERT INTO tags (id, project_id, name, color, created_at) VALUES (?, ?, ?, '#64748b', ?)`).run(
            tagId,
            existing.project_id,
            tagName.trim(),
            now
          );
          tag = { id: tagId, project_id: existing.project_id, name: tagName.trim(), color: '#64748b', created_at: now };
        }
        db.prepare(`INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)`).run(taskId, tag.id);
      }
    }

    return this.getTask(taskId, userId);
  }

  static deleteTask(taskId: string, userId: string): void {
    const db = getDb();
    const existing = db.prepare(`
      SELECT t.id, t.title, t.project_id, t.creator_id, pm.role
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE t.id = ?
    `).get(userId, taskId) as any;

    if (!existing) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    ActivityService.logActivity(
      existing.project_id,
      null,
      userId,
      'TASK_DELETED',
      `Deleted task "${existing.title}"`
    );

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  }

  static reorderTasks(userId: string, updates: Array<{ id: string; status: TaskStatus; position: number }>): void {
    const db = getDb();
    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE tasks SET status = ?, position = ?, updated_at = ? WHERE id = ?
    `);

    for (const item of updates) {
      if (VALID_STATUSES.includes(item.status)) {
        updateStmt.run(item.status, item.position, now, item.id);
      }
    }
  }
}
