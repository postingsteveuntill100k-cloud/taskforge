import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { getDb } from '../db/index.js';
import { AuthResponse, LoginDto, RegisterDto, UserSafe } from '@taskforge/shared';

export class AuthService {
  static async register(dto: RegisterDto): Promise<AuthResponse> {
    const { email, name, password } = dto;

    if (!email || !email.includes('@')) {
      const err: any = new Error('A valid email address is required.');
      err.status = 400;
      throw err;
    }

    if (!name || name.trim().length < 2) {
      const err: any = new Error('Name must be at least 2 characters long.');
      err.status = 400;
      throw err;
    }

    if (!password || password.length < 6) {
      const err: any = new Error('Password must be at least 6 characters long.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      const err: any = new Error('An account with this email address already exists.');
      err.status = 409;
      throw err;
    }

    const saltRounds = process.env.NODE_ENV === 'test' ? 4 : 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'MEMBER', ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, name.trim(), now, now);

    const userSafe: UserSafe = {
      id: userId,
      email: email.toLowerCase(),
      name: name.trim(),
      role: 'MEMBER',
      created_at: now,
    };

    const token = jwt.sign({ userId, email: userSafe.email, jti: crypto.randomUUID() }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN,
    });

    const sessionId = `ses_${crypto.randomUUID().slice(0, 12)}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, userId, token, expiresAt, now);

    return { user: userSafe, token };
  }

  static async login(dto: LoginDto): Promise<AuthResponse> {
    const { email, password } = dto;

    if (!email || !password) {
      const err: any = new Error('Email and password are required.');
      err.status = 400;
      throw err;
    }

    const db = getDb();
    const user = db.prepare(`
      SELECT id, email, password_hash, name, avatar_url, role, created_at
      FROM users WHERE email = ?
    `).get(email.toLowerCase()) as any;

    if (!user) {
      const err: any = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const passwordValid = bcrypt.compareSync(password, user.password_hash);
    if (!passwordValid) {
      const err: any = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const userSafe: UserSafe = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role,
      created_at: user.created_at,
    };

    const token = jwt.sign({ userId: user.id, email: user.email, jti: crypto.randomUUID() }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN,
    });

    const sessionId = `ses_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, user.id, token, expiresAt, now);

    return { user: userSafe, token };
  }

  static async logout(token: string): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  static async getMe(userId: string): Promise<UserSafe> {
    const db = getDb();
    const user = db.prepare(`
      SELECT id, email, name, avatar_url, role, created_at
      FROM users WHERE id = ?
    `).get(userId) as UserSafe | undefined;

    if (!user) {
      const err: any = new Error('User not found.');
      err.status = 404;
      throw err;
    }

    return user;
  }

  static async updateProfile(
    userId: string,
    dto: { name?: string; avatar_url?: string | null; current_password?: string; new_password?: string }
  ): Promise<UserSafe> {
    const db = getDb();
    const existing = db.prepare(`
      SELECT id, email, password_hash, name, avatar_url, role, created_at
      FROM users WHERE id = ?
    `).get(userId) as any;

    if (!existing) {
      const err: any = new Error('User not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    let name = existing.name;
    if (dto.name !== undefined) {
      if (dto.name.trim().length < 2) {
        const err: any = new Error('Name must be at least 2 characters long.');
        err.status = 400;
        throw err;
      }
      name = dto.name.trim();
    }

    let avatar_url = dto.avatar_url !== undefined
      ? (dto.avatar_url && dto.avatar_url.trim() ? dto.avatar_url.trim() : null)
      : existing.avatar_url;
    let passwordHash = existing.password_hash;

    if (dto.new_password) {
      if (!dto.current_password) {
        const err: any = new Error('Current password is required to set a new password.');
        err.status = 400;
        throw err;
      }
      const valid = bcrypt.compareSync(dto.current_password, existing.password_hash);
      if (!valid) {
        const err: any = new Error('Current password does not match.');
        err.status = 400;
        throw err;
      }
      if (dto.new_password.length < 6) {
        const err: any = new Error('New password must be at least 6 characters long.');
        err.status = 400;
        throw err;
      }
      const saltRounds = process.env.NODE_ENV === 'test' ? 4 : 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      passwordHash = bcrypt.hashSync(dto.new_password, salt);
    }

    db.prepare(`
      UPDATE users SET name = ?, avatar_url = ?, password_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(name, avatar_url, passwordHash, now, userId);

    return {
      id: existing.id,
      email: existing.email,
      name,
      avatar_url,
      role: existing.role,
      created_at: existing.created_at,
    };
  }
}

