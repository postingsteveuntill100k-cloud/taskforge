import { getDb } from '../db/index.js';
import { UserSafe } from '@taskforge/shared';

export class UserService {
  static listUsers(query?: string): UserSafe[] {
    const db = getDb();
    let sql = 'SELECT id, email, name, avatar_url, role, created_at FROM users';
    const params: any[] = [];
    if (query && query.trim()) {
      sql += ' WHERE (name LIKE ? OR email LIKE ?)';
      const term = `%${query.trim()}%`;
      params.push(term, term);
    }
    sql += ' ORDER BY name ASC LIMIT 50';
    return db.prepare(sql).all(...params) as unknown as UserSafe[];
  }
}
