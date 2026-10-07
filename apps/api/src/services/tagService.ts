import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ActivityService } from './activityService.js';
import { CreateTagDto, Tag, TagWithCount, UpdateTagDto } from '@taskforge/shared';

export class TagService {
  private static checkAccess(projectId: string, userId: string, requireEditRole: boolean = false): string {
    const db = getDb();
    const member = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, userId) as { role: string } | undefined;

    if (!member) {
      const err: any = new Error('Access denied. You are not a member of this project.');
      err.status = 403;
      throw err;
    }

    if (requireEditRole && member.role === 'VIEWER') {
      const err: any = new Error('Access denied. Viewers cannot modify project tags.');
      err.status = 403;
      throw err;
    }

    return member.role;
  }

  static listProjectTags(projectId: string, userId: string): TagWithCount[] {
    this.checkAccess(projectId, userId, false);
    const db = getDb();

    const rows = db.prepare(`
      SELECT 
        t.id, t.project_id, t.name, t.color, t.created_at,
        (SELECT COUNT(*) FROM task_tags tt WHERE tt.tag_id = t.id) as task_count
      FROM tags t
      WHERE t.project_id = ?
      ORDER BY t.name ASC
    `).all(projectId) as any[];

    return rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      name: r.name,
      color: r.color,
      created_at: r.created_at,
      task_count: Number(r.task_count),
    }));
  }

  static createProjectTag(projectId: string, userId: string, dto: CreateTagDto): Tag {
    this.checkAccess(projectId, userId, true);
    const db = getDb();

    const name = dto.name?.trim();
    if (!name) {
      const err: any = new Error('Tag name is required.');
      err.status = 400;
      throw err;
    }

    // Check duplicate name within project (case-insensitive)
    const existing = db.prepare(`
      SELECT id FROM tags WHERE project_id = ? AND LOWER(name) = LOWER(?)
    `).get(projectId, name) as any;

    if (existing) {
      const err: any = new Error(`Tag with name "${name}" already exists in this project.`);
      err.status = 409;
      throw err;
    }

    const id = `tag_${crypto.randomUUID().slice(0, 10)}`;
    const color = dto.color?.trim() || '#64748b';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tags (id, project_id, name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, name, color, now);

    ActivityService.logActivity(
      projectId,
      null,
      userId,
      'TAG_CREATED',
      `Created project tag "${name}"`,
      { tag_id: id, tag_name: name, color }
    );

    return {
      id,
      project_id: projectId,
      name,
      color,
      created_at: now,
    };
  }

  static updateProjectTag(projectId: string, tagId: string, userId: string, dto: UpdateTagDto): Tag {
    this.checkAccess(projectId, userId, true);
    const db = getDb();

    const tag = db.prepare(`
      SELECT * FROM tags WHERE id = ? AND project_id = ?
    `).get(tagId, projectId) as any;

    if (!tag) {
      const err: any = new Error('Tag not found.');
      err.status = 404;
      throw err;
    }

    let name = tag.name;
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        const err: any = new Error('Tag name cannot be empty.');
        err.status = 400;
        throw err;
      }
      // Check duplicate
      const duplicate = db.prepare(`
        SELECT id FROM tags WHERE project_id = ? AND LOWER(name) = LOWER(?) AND id != ?
      `).get(projectId, trimmed, tagId) as any;

      if (duplicate) {
        const err: any = new Error(`Tag with name "${trimmed}" already exists in this project.`);
        err.status = 409;
        throw err;
      }
      name = trimmed;
    }

    const color = dto.color !== undefined ? dto.color.trim() || '#64748b' : tag.color;

    db.prepare(`
      UPDATE tags SET name = ?, color = ? WHERE id = ?
    `).run(name, color, tagId);

    ActivityService.logActivity(
      projectId,
      null,
      userId,
      'TAG_UPDATED',
      `Updated tag "${tag.name}" to "${name}"`,
      { tag_id: tagId, old_name: tag.name, new_name: name, color }
    );

    return {
      id: tagId,
      project_id: projectId,
      name,
      color,
      created_at: tag.created_at,
    };
  }

  static deleteProjectTag(projectId: string, tagId: string, userId: string): void {
    this.checkAccess(projectId, userId, true);
    const db = getDb();

    const tag = db.prepare(`
      SELECT * FROM tags WHERE id = ? AND project_id = ?
    `).get(tagId, projectId) as any;

    if (!tag) {
      const err: any = new Error('Tag not found.');
      err.status = 404;
      throw err;
    }

    db.prepare(`DELETE FROM tags WHERE id = ?`).run(tagId);

    ActivityService.logActivity(
      projectId,
      null,
      userId,
      'TAG_DELETED',
      `Deleted tag "${tag.name}"`,
      { tag_id: tagId, tag_name: tag.name }
    );
  }
}
