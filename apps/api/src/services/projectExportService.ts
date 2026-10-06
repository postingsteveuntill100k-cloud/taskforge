import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ProjectService } from './projectService.js';
import { ActivityService } from './activityService.js';

export interface ExportedProjectBundle {
  version: string;
  exported_at: string;
  project: {
    name: string;
    description: string | null;
    color: string;
  };
  tasks: Array<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    position: number;
    tags: string[];
    comments: Array<{
      content: string;
      author_name: string;
      created_at: string;
    }>;
  }>;
}

export class ProjectExportService {
  static exportProjectJson(projectId: string, userId: string): ExportedProjectBundle {
    const db = getDb();
    const project = ProjectService.getProject(projectId, userId);

    // Fetch tasks
    const tasks = db.prepare(`
      SELECT id, title, description, status, priority, due_date, position
      FROM tasks
      WHERE project_id = ?
      ORDER BY position ASC, created_at ASC
    `).all(projectId) as any[];

    const exportedTasks = tasks.map((t) => {
      // Tags
      const tags = db.prepare(`
        SELECT tg.name
        FROM tags tg
        JOIN task_tags tt ON tg.id = tt.tag_id
        WHERE tt.task_id = ?
      `).all(t.id) as any[];

      // Comments
      const comments = db.prepare(`
        SELECT c.content, c.created_at, u.name as author_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at ASC
      `).all(t.id) as any[];

      return {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        position: t.position,
        tags: tags.map((tg) => tg.name),
        comments: comments.map((c) => ({
          content: c.content,
          author_name: c.author_name,
          created_at: c.created_at,
        })),
      };
    });

    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      project: {
        name: project.name,
        description: project.description,
        color: project.color,
      },
      tasks: exportedTasks,
    };
  }

  static exportTasksCsv(projectId: string, userId: string): string {
    const db = getDb();
    ProjectService.getProject(projectId, userId); // Permission check

    const tasks = db.prepare(`
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at,
        u.email as assignee_email
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id = ?
      ORDER BY t.position ASC, t.created_at ASC
    `).all(projectId) as any[];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const header = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee Email', 'Due Date', 'Created At'];
    const rows = tasks.map((t) => [
      escapeCsv(t.id),
      escapeCsv(t.title),
      escapeCsv(t.description || ''),
      escapeCsv(t.status),
      escapeCsv(t.priority),
      escapeCsv(t.assignee_email || ''),
      escapeCsv(t.due_date || ''),
      escapeCsv(t.created_at),
    ]);

    return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static importProject(userId: string, bundle: ExportedProjectBundle): any {
    if (!bundle || !bundle.project || !bundle.project.name) {
      const err: any = new Error('Invalid project bundle format.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    const now = new Date().toISOString();
    const projectId = `prj_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

    // 1. Create project
    db.prepare(`
      INSERT INTO projects (id, name, description, owner_id, is_archived, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      projectId,
      bundle.project.name,
      bundle.project.description || null,
      userId,
      bundle.project.color || '#4f46e5',
      now,
      now
    );

    // 2. Add owner as member
    const memberId = `pm_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    db.prepare(`
      INSERT INTO project_members (id, project_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'OWNER', ?)
    `).run(memberId, projectId, userId, now);

    // 3. Create tasks, tags, comments
    const tagCache = new Map<string, string>(); // name -> tagId

    if (Array.isArray(bundle.tasks)) {
      for (let i = 0; i < bundle.tasks.length; i++) {
        const t = bundle.tasks[i];
        const taskId = `tsk_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
        const pos = typeof t.position === 'number' ? t.position : i;

        db.prepare(`
          INSERT INTO tasks (id, project_id, title, description, status, priority, creator_id, assignee_id, due_date, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
        `).run(
          taskId,
          projectId,
          t.title,
          t.description || null,
          t.status || 'TODO',
          t.priority || 'MEDIUM',
          userId,
          t.due_date || null,
          pos,
          now,
          now
        );

        // Tags
        if (Array.isArray(t.tags)) {
          for (const tagName of t.tags) {
            let tagId = tagCache.get(tagName);
            if (!tagId) {
              const existing = db.prepare(`SELECT id FROM tags WHERE project_id = ? AND name = ?`).get(projectId, tagName) as any;
              if (existing) {
                tagId = existing.id;
              } else {
                tagId = `tag_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
                db.prepare(`
                  INSERT INTO tags (id, project_id, name, color, created_at)
                  VALUES (?, ?, ?, '#6366f1', ?)
                `).run(tagId, projectId, tagName, now);
              }
              tagCache.set(tagName, tagId!);
            }

            if (tagId) {
              db.prepare(`
                INSERT OR IGNORE INTO task_tags (task_id, tag_id)
                VALUES (?, ?)
              `).run(taskId, tagId);
            }
          }
        }

        // Comments
        if (Array.isArray(t.comments)) {
          for (const c of t.comments) {
            const commentId = `cmt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
            db.prepare(`
              INSERT INTO comments (id, task_id, user_id, content, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(commentId, taskId, userId, c.content, c.created_at || now, c.created_at || now);
          }
        }
      }
    }

    // Record activity
    ActivityService.logActivity(
      projectId,
      null,
      userId,
      'PROJECT_CREATED',
      `Imported project "${bundle.project.name}" with ${bundle.tasks?.length || 0} tasks`,
      { source: 'import' }
    );

    return ProjectService.getProject(projectId, userId);
  }
}
