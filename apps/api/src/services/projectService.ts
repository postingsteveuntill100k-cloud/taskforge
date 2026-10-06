import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ActivityService } from './activityService.js';
import { CreateProjectDto, Project, ProjectMember, UpdateProjectDto, UserSafe } from '@taskforge/shared';

export class ProjectService {
  static listProjects(userId: string): Project[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        p.id, p.name, p.description, p.owner_id, p.is_archived, p.color, p.created_at, p.updated_at,
        u.name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users u ON p.owner_id = u.id
      WHERE pm.user_id = ?
      ORDER BY p.updated_at DESC
    `).all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      owner_id: r.owner_id,
      is_archived: r.is_archived,
      color: r.color,
      created_at: r.created_at,
      updated_at: r.updated_at,
      member_count: Number(r.member_count),
      task_count: Number(r.task_count),
      owner: {
        id: r.owner_id,
        name: r.owner_name,
        email: r.owner_email,
        avatar_url: r.owner_avatar,
        role: 'MEMBER',
        created_at: r.created_at,
      },
    }));
  }

  static getProject(projectId: string, userId: string): Project & { members: ProjectMember[] } {
    const db = getDb();
    // Check access
    const memberCheck = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, userId);

    if (!memberCheck) {
      const err: any = new Error('Access denied. You are not a member of this project.');
      err.status = 403;
      throw err;
    }

    const project = db.prepare(`
      SELECT 
        p.id, p.name, p.description, p.owner_id, p.is_archived, p.color, p.created_at, p.updated_at,
        u.name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `).get(projectId) as any;

    if (!project) {
      const err: any = new Error('Project not found.');
      err.status = 404;
      throw err;
    }

    const members = db.prepare(`
      SELECT 
        pm.id, pm.project_id, pm.user_id, pm.role, pm.joined_at,
        u.name, u.email, u.avatar_url
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.joined_at ASC
    `).all(projectId) as any[];

    const formattedMembers: ProjectMember[] = members.map((m) => ({
      id: m.id,
      project_id: m.project_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      user: {
        id: m.user_id,
        name: m.name,
        email: m.email,
        avatar_url: m.avatar_url,
        role: 'MEMBER',
        created_at: m.joined_at,
      },
    }));

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      owner_id: project.owner_id,
      is_archived: project.is_archived,
      color: project.color,
      created_at: project.created_at,
      updated_at: project.updated_at,
      owner: {
        id: project.owner_id,
        name: project.owner_name,
        email: project.owner_email,
        avatar_url: project.owner_avatar,
        role: 'MEMBER',
        created_at: project.created_at,
      },
      members: formattedMembers,
    };
  }

  static createProject(userId: string, dto: CreateProjectDto): Project {
    const { name, description, color } = dto;
    if (!name || name.trim().length === 0) {
      const err: any = new Error('Project name is required.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    const projectId = `prj_${crypto.randomUUID().slice(0, 12)}`;
    const memberId = `mem_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const projectColor = color || '#4f46e5';

    db.prepare(`
      INSERT INTO projects (id, name, description, owner_id, is_archived, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `).run(projectId, name.trim(), description || null, userId, projectColor, now, now);

    db.prepare(`
      INSERT INTO project_members (id, project_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'OWNER', ?)
    `).run(memberId, projectId, userId, now);

    ActivityService.logActivity(
      projectId,
      null,
      userId,
      'PROJECT_CREATED',
      `Created project "${name.trim()}"`
    );

    return {
      id: projectId,
      name: name.trim(),
      description: description || null,
      owner_id: userId,
      is_archived: 0,
      color: projectColor,
      created_at: now,
      updated_at: now,
    };
  }

  static updateProject(projectId: string, userId: string, dto: UpdateProjectDto): Project {
    const db = getDb();
    const existing = db.prepare(`
      SELECT p.*, pm.role 
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = ? AND pm.user_id = ?
    `).get(projectId, userId) as any;

    if (!existing) {
      const err: any = new Error('Project not found or access denied.');
      err.status = 404;
      throw err;
    }

    if (existing.role !== 'OWNER' && existing.role !== 'ADMIN') {
      const err: any = new Error('Only project Owners and Admins can update project settings.');
      err.status = 403;
      throw err;
    }

    const now = new Date().toISOString();
    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    const description = dto.description !== undefined ? dto.description : existing.description;
    const is_archived = dto.is_archived !== undefined ? (dto.is_archived ? 1 : 0) : existing.is_archived;
    const color = dto.color || existing.color;

    db.prepare(`
      UPDATE projects 
      SET name = ?, description = ?, is_archived = ?, color = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description, is_archived, color, now, projectId);

    if (dto.is_archived !== undefined && dto.is_archived !== Boolean(existing.is_archived)) {
      ActivityService.logActivity(
        projectId,
        null,
        userId,
        dto.is_archived ? 'PROJECT_ARCHIVED' : 'PROJECT_UPDATED',
        dto.is_archived ? `Archived project "${name}"` : `Unarchived project "${name}"`
      );
    } else {
      ActivityService.logActivity(
        projectId,
        null,
        userId,
        'PROJECT_UPDATED',
        `Updated project details for "${name}"`
      );
    }

    return {
      id: projectId,
      name,
      description,
      owner_id: existing.owner_id,
      is_archived,
      color,
      created_at: existing.created_at,
      updated_at: now,
    };
  }

  static deleteProject(projectId: string, userId: string): void {
    const db = getDb();
    const existing = db.prepare(`
      SELECT owner_id FROM projects WHERE id = ?
    `).get(projectId) as any;

    if (!existing) {
      const err: any = new Error('Project not found.');
      err.status = 404;
      throw err;
    }

    if (existing.owner_id !== userId) {
      const err: any = new Error('Only the project owner can delete this project.');
      err.status = 403;
      throw err;
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  }

  static listMembers(projectId: string, userId: string): ProjectMember[] {
    const db = getDb();
    const caller = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    if (!caller) {
      const err: any = new Error('Access denied. You are not a member of this project.');
      err.status = 403;
      throw err;
    }

    const members = db.prepare(`
      SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.joined_at,
             u.name, u.email, u.avatar_url
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.joined_at ASC
    `).all(projectId) as any[];

    return members.map((m) => ({
      id: m.id,
      project_id: m.project_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      user: {
        id: m.user_id,
        name: m.name,
        email: m.email,
        avatar_url: m.avatar_url,
        role: 'MEMBER',
        created_at: m.joined_at,
      },
    }));
  }

  static addMember(
    projectId: string,
    currentUserId: string,
    dto: { user_id?: string; email?: string; role?: any }
  ): ProjectMember {
    const db = getDb();
    const caller = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, currentUserId) as any;
    if (!caller || (caller.role !== 'OWNER' && caller.role !== 'ADMIN')) {
      const err: any = new Error('Only project Owners and Admins can add members.');
      err.status = 403;
      throw err;
    }

    let targetUser: any = null;
    if (dto.email && dto.email.trim()) {
      targetUser = db.prepare('SELECT id, name, email, avatar_url, role FROM users WHERE email = ?').get(dto.email.toLowerCase().trim());
    } else if (dto.user_id && dto.user_id.trim()) {
      targetUser = db.prepare('SELECT id, name, email, avatar_url, role FROM users WHERE id = ?').get(dto.user_id.trim());
    }

    if (!targetUser) {
      const err: any = new Error('User not found.');
      err.status = 404;
      throw err;
    }

    const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, targetUser.id);
    if (existing) {
      const err: any = new Error('User is already a member of this project.');
      err.status = 409;
      throw err;
    }

    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
    const memberRole = dto.role && validRoles.includes(dto.role) ? dto.role : 'MEMBER';
    const memberId = `mem_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO project_members (id, project_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(memberId, projectId, targetUser.id, memberRole, now);

    ActivityService.logActivity(
      projectId,
      null,
      currentUserId,
      'MEMBER_ADDED',
      `Added ${targetUser.name} to the project as ${memberRole}`
    );

    const notifId = `ntf_${crypto.randomUUID().slice(0, 12)}`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link, created_at)
      VALUES (?, ?, 'Added to Project', ?, '/projects', ?)
    `).run(notifId, targetUser.id, `You were added to a project with role ${memberRole}`, now);

    return {
      id: memberId,
      project_id: projectId,
      user_id: targetUser.id,
      role: memberRole,
      joined_at: now,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        avatar_url: targetUser.avatar_url,
        role: targetUser.role,
        created_at: now,
      },
    };
  }

  static updateMemberRole(
    projectId: string,
    currentUserId: string,
    targetUserId: string,
    role: any
  ): ProjectMember {
    const db = getDb();
    const caller = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, currentUserId) as any;
    if (!caller || (caller.role !== 'OWNER' && caller.role !== 'ADMIN')) {
      const err: any = new Error('Only project Owners and Admins can update member roles.');
      err.status = 403;
      throw err;
    }

    const target = db.prepare(`
      SELECT pm.*, p.owner_id, u.name, u.email, u.avatar_url
      FROM project_members pm
      JOIN projects p ON pm.project_id = p.id
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ? AND pm.user_id = ?
    `).get(projectId, targetUserId) as any;

    if (!target) {
      const err: any = new Error('Member not found in project.');
      err.status = 404;
      throw err;
    }

    if (target.owner_id === targetUserId) {
      const err: any = new Error('Cannot change the role of the project owner.');
      err.status = 400;
      throw err;
    }

    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
    if (!validRoles.includes(role)) {
      const err: any = new Error(`Invalid role: "${role}". Must be one of ${validRoles.join(', ')}.`);
      err.status = 400;
      throw err;
    }

    db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role, projectId, targetUserId);

    return {
      id: target.id,
      project_id: projectId,
      user_id: targetUserId,
      role,
      joined_at: target.joined_at,
      user: {
        id: target.user_id,
        name: target.name,
        email: target.email,
        avatar_url: target.avatar_url,
        role: 'MEMBER',
        created_at: target.joined_at,
      },
    };
  }

  static removeMember(projectId: string, currentUserId: string, targetUserId: string): void {
    const db = getDb();
    const caller = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, currentUserId) as any;
    if (!caller) {
      const err: any = new Error('Access denied.');
      err.status = 403;
      throw err;
    }

    if (currentUserId !== targetUserId && caller.role !== 'OWNER' && caller.role !== 'ADMIN') {
      const err: any = new Error('Only project Owners and Admins can remove other members.');
      err.status = 403;
      throw err;
    }

    const proj = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId) as any;
    if (!proj) {
      const err: any = new Error('Project not found.');
      err.status = 404;
      throw err;
    }

    if (proj.owner_id === targetUserId) {
      const err: any = new Error('Cannot remove the project owner.');
      err.status = 400;
      throw err;
    }

    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, targetUserId);
    db.prepare('UPDATE tasks SET assignee_id = NULL WHERE project_id = ? AND assignee_id = ?').run(projectId, targetUserId);

    ActivityService.logActivity(
      projectId,
      null,
      currentUserId,
      'MEMBER_REMOVED',
      `Removed member from the project`
    );
  }
}

