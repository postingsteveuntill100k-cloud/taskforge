import { getDb } from '../db/index.js';
import { TaskService } from './taskService.js';
import { Project, SearchQueryDto, Task } from '@taskforge/shared';

export class SearchService {
  static search(
    userId: string,
    queryDto: SearchQueryDto
  ): { tasks: Task[]; projects: Project[]; total_matches: number } {
    const db = getDb();
    const q = (queryDto.q || '').trim();

    // 1. Search tasks
    const tasks = TaskService.listTasks(userId, {
      projectId: queryDto.projectId,
      status: queryDto.status,
      priority: queryDto.priority,
      assigneeId: queryDto.assigneeId,
      tag: queryDto.tag,
      search: q || undefined,
    });

    // 2. Search projects
    let projects: Project[] = [];
    if (q) {
      const pRows = db.prepare(`
        SELECT p.id, p.name, p.description, p.owner_id, p.is_archived, p.color, p.created_at, p.updated_at
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
        WHERE (p.name LIKE ? OR p.description LIKE ?)
        ORDER BY p.updated_at DESC
        LIMIT 10
      `).all(userId, `%${q}%`, `%${q}%`) as any[];

      projects = pRows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        owner_id: r.owner_id,
        is_archived: r.is_archived,
        color: r.color,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    }

    return {
      tasks,
      projects,
      total_matches: tasks.length + projects.length,
    };
  }
}
