import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ActivityService } from './activityService.js';
import { CreateSubtaskDto, CreateTaskDto, Subtask, Tag, Task, TaskPriority, TaskStatus, UpdateSubtaskDto, UpdateTaskDto, UserSafe } from '@taskforge/shared';

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
      query += ` AND (t.title LIKE ? OR t.description LIKE ? OR EXISTS (
        SELECT 1 FROM task_tags tt_s
        JOIN tags tg_s ON tt_s.tag_id = tg_s.id
        WHERE tt_s.task_id = t.id AND tg_s.name LIKE ?
      ))`;
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
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

    const subtaskRows = db.prepare(`
      SELECT id, task_id, title, is_completed, position, created_at, updated_at
      FROM subtasks
      WHERE task_id = ?
      ORDER BY position ASC, created_at ASC
    `).all(taskId) as unknown as Subtask[];

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
      subtasks: subtaskRows,
    };
  }

  static createTask(userId: string, dto: CreateTaskDto): Task {
    const { project_id, title, description, status, priority, assignee_id, due_date, tags } = dto;

    if (!title || title.trim().length === 0) {
      const err: any = new Error('Task title is required.');
      err.status = 400;
      throw err;
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      const err: any = new Error(`Invalid status: "${status}". Must be one of ${VALID_STATUSES.join(', ')}.`);
      err.status = 400;
      throw err;
    }

    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      const err: any = new Error(`Invalid priority: "${priority}". Must be one of ${VALID_PRIORITIES.join(', ')}.`);
      err.status = 400;
      throw err;
    }

    const db = getDb();
    // Validate project access & role
    const memberCheck = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(project_id, userId) as any;

    if (!memberCheck) {
      const err: any = new Error('Access denied. You are not a member of this project.');
      err.status = 403;
      throw err;
    }

    if (memberCheck.role === 'VIEWER') {
      const err: any = new Error('Viewers cannot create tasks.');
      err.status = 403;
      throw err;
    }

    const taskStatus: TaskStatus = status || 'TODO';
    const taskPriority: TaskPriority = priority || 'MEDIUM';

    // Validate assignee if provided
    let cleanAssigneeId: string | null = null;
    if (assignee_id && typeof assignee_id === 'string' && assignee_id.trim()) {
      cleanAssigneeId = assignee_id.trim();
      const assigneeCheck = db.prepare(`
        SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
      `).get(project_id, cleanAssigneeId);
      if (!assigneeCheck) {
        const err: any = new Error('Assignee must be a member of this project.');
        err.status = 400;
        throw err;
      }
    }

    const cleanDueDate = due_date && typeof due_date === 'string' && due_date.trim() ? due_date.trim() : null;
    const cleanDescription = description && typeof description === 'string' && description.trim() ? description.trim() : null;

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
      cleanDescription,
      taskStatus,
      taskPriority,
      userId,
      cleanAssigneeId,
      cleanDueDate,
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

    if (cleanAssigneeId && cleanAssigneeId !== userId) {
      const notifId = `ntf_${crypto.randomUUID().slice(0, 12)}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, 'Task Assigned', ?, '/tasks', ?)
      `).run(notifId, cleanAssigneeId, `You were assigned to task "${title.trim()}"`, now);
    }

    return this.getTask(taskId, userId);
  }

  static updateTask(taskId: string, userId: string, dto: UpdateTaskDto): Task {
    if (dto.status !== undefined && !VALID_STATUSES.includes(dto.status)) {
      const err: any = new Error(`Invalid status: "${dto.status}". Must be one of ${VALID_STATUSES.join(', ')}.`);
      err.status = 400;
      throw err;
    }

    if (dto.priority !== undefined && !VALID_PRIORITIES.includes(dto.priority)) {
      const err: any = new Error(`Invalid priority: "${dto.priority}". Must be one of ${VALID_PRIORITIES.join(', ')}.`);
      err.status = 400;
      throw err;
    }

    const db = getDb();
    const existing = db.prepare(`
      SELECT t.*, u.name as user_name, pm.role as member_role
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

    if (existing.member_role === 'VIEWER') {
      const err: any = new Error('Viewers cannot update tasks.');
      err.status = 403;
      throw err;
    }

    const now = new Date().toISOString();
    const title = dto.title !== undefined ? dto.title.trim() : existing.title;
    const description = dto.description !== undefined
      ? (dto.description && typeof dto.description === 'string' && dto.description.trim() ? dto.description.trim() : null)
      : existing.description;
    const status: TaskStatus = dto.status !== undefined ? dto.status : existing.status;
    const priority: TaskPriority = dto.priority !== undefined ? dto.priority : existing.priority;
    const due_date = dto.due_date !== undefined
      ? (dto.due_date && typeof dto.due_date === 'string' && dto.due_date.trim() ? dto.due_date.trim() : null)
      : existing.due_date;
    const position = dto.position !== undefined ? dto.position : existing.position;

    // Validate assignee
    let assignee_id = existing.assignee_id;
    if (dto.assignee_id !== undefined) {
      const clean = dto.assignee_id && typeof dto.assignee_id === 'string' && dto.assignee_id.trim() ? dto.assignee_id.trim() : null;
      if (clean) {
        const assigneeCheck = db.prepare(`
          SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
        `).get(existing.project_id, clean);
        if (!assigneeCheck) {
          const err: any = new Error('Assignee must be a member of this project.');
          err.status = 400;
          throw err;
        }
      }
      assignee_id = clean;
    }

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
    if (dto.assignee_id !== undefined && assignee_id !== existing.assignee_id) {
      let assigneeName = 'Nobody';
      if (assignee_id) {
        const u = db.prepare('SELECT name FROM users WHERE id = ?').get(assignee_id) as any;
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

      if (assignee_id && assignee_id !== userId) {
        const notifId = `ntf_${crypto.randomUUID().slice(0, 12)}`;
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, link, created_at)
          VALUES (?, ?, 'Task Assigned', ?, '/tasks', ?)
        `).run(notifId, assignee_id, `You were assigned to task "${title}"`, now);
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

    if (existing.role === 'VIEWER') {
      const err: any = new Error('Viewers cannot delete tasks.');
      err.status = 403;
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
      UPDATE tasks 
      SET status = ?, position = ?, updated_at = ? 
      WHERE id = ? 
        AND project_id IN (
          SELECT project_id FROM project_members WHERE user_id = ? AND role != 'VIEWER'
        )
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const item of updates) {
        if (VALID_STATUSES.includes(item.status)) {
          updateStmt.run(item.status, item.position, now, item.id, userId);
        }
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  // --- SUBTASKS MANAGEMENT ---
  static getSubtasks(taskId: string, userId: string): Subtask[] {
    const db = getDb();
    const task = db.prepare(`
      SELECT t.id FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE t.id = ?
    `).get(userId, taskId);

    if (!task) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    return db.prepare(`
      SELECT id, task_id, title, is_completed, position, created_at, updated_at
      FROM subtasks
      WHERE task_id = ?
      ORDER BY position ASC, created_at ASC
    `).all(taskId) as unknown as Subtask[];
  }

  static createSubtask(taskId: string, userId: string, dto: CreateSubtaskDto): Subtask {
    const db = getDb();
    const task = db.prepare(`
      SELECT t.id, t.project_id, pm.role FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE t.id = ?
    `).get(userId, taskId) as any;

    if (!task) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    if (task.role === 'VIEWER') {
      const err: any = new Error('Viewers cannot add subtasks.');
      err.status = 403;
      throw err;
    }

    if (!dto.title || !dto.title.trim()) {
      const err: any = new Error('Subtask title is required.');
      err.status = 400;
      throw err;
    }

    const subtaskId = `sub_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const maxRow = db.prepare('SELECT MAX(position) as max_pos FROM subtasks WHERE task_id = ?').get(taskId) as any;
    const pos = dto.position ?? ((maxRow?.max_pos ?? 0) + 1);

    db.prepare(`
      INSERT INTO subtasks (id, task_id, title, is_completed, position, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?, ?)
    `).run(subtaskId, taskId, dto.title.trim(), pos, now, now);

    ActivityService.logActivity(
      task.project_id,
      taskId,
      userId,
      'SUBTASK_CREATED' as any,
      `Added subtask "${dto.title.trim()}"`
    );

    return {
      id: subtaskId,
      task_id: taskId,
      title: dto.title.trim(),
      is_completed: 0,
      position: pos,
      created_at: now,
      updated_at: now
    };
  }

  static updateSubtask(
    taskId: string,
    subtaskId: string,
    userId: string,
    dto: UpdateSubtaskDto
  ): Subtask {
    const db = getDb();
    const task = db.prepare(`
      SELECT t.id, t.project_id, pm.role FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE t.id = ?
    `).get(userId, taskId) as any;

    if (!task) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    if (task.role === 'VIEWER') {
      const err: any = new Error('Viewers cannot update subtasks.');
      err.status = 403;
      throw err;
    }

    const existing = db.prepare(`
      SELECT * FROM subtasks WHERE id = ? AND task_id = ?
    `).get(subtaskId, taskId) as any;

    if (!existing) {
      const err: any = new Error('Subtask not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    let newTitle = existing.title;
    if (dto.title !== undefined) {
      if (!dto.title.trim()) {
        const err: any = new Error('Subtask title cannot be empty.');
        err.status = 400;
        throw err;
      }
      newTitle = dto.title.trim();
    }

    let newCompleted = existing.is_completed;
    if (dto.is_completed !== undefined) {
      newCompleted = (dto.is_completed === true || dto.is_completed === 1) ? 1 : 0;
    }

    let newPos = existing.position;
    if (dto.position !== undefined) {
      newPos = Number(dto.position);
    }

    db.prepare(`
      UPDATE subtasks 
      SET title = ?, is_completed = ?, position = ?, updated_at = ?
      WHERE id = ?
    `).run(newTitle, newCompleted, newPos, now, subtaskId);

    if (dto.is_completed !== undefined && newCompleted !== existing.is_completed) {
      ActivityService.logActivity(
        task.project_id,
        taskId,
        userId,
        'SUBTASK_TOGGLED' as any,
        `${newCompleted ? 'Completed' : 'Reopened'} subtask "${newTitle}"`
      );
    }

    return {
      id: subtaskId,
      task_id: taskId,
      title: newTitle,
      is_completed: newCompleted,
      position: newPos,
      created_at: existing.created_at,
      updated_at: now
    };
  }

  static deleteSubtask(taskId: string, subtaskId: string, userId: string): void {
    const db = getDb();
    const task = db.prepare(`
      SELECT t.id, t.project_id, pm.role FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE t.id = ?
    `).get(userId, taskId) as any;

    if (!task) {
      const err: any = new Error('Task not found or access denied.');
      err.status = 404;
      throw err;
    }

    if (task.role === 'VIEWER') {
      const err: any = new Error('Viewers cannot delete subtasks.');
      err.status = 403;
      throw err;
    }

    const existing = db.prepare(`SELECT * FROM subtasks WHERE id = ? AND task_id = ?`).get(subtaskId, taskId) as any;
    if (!existing) {
      const err: any = new Error('Subtask not found.');
      err.status = 404;
      throw err;
    }

    ActivityService.logActivity(
      task.project_id,
      taskId,
      userId,
      'SUBTASK_DELETED' as any,
      `Deleted subtask "${existing.title}"`
    );

    db.prepare(`DELETE FROM subtasks WHERE id = ?`).run(subtaskId);
  }
}
