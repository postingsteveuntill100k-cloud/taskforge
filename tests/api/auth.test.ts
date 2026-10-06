import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { initDatabase, closeDb } from '../../apps/api/src/db/index.js';

describe('Authentication API (/api/auth)', () => {
  let app: any;

  beforeEach(() => {
    closeDb();
    process.env.DATABASE_PATH = ':memory:';
    initDatabase(':memory:');
    app = createApp();
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'alice@example.com',
        name: 'Alice Cooper',
        password: 'securepassword123',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.name).toBe('Alice Cooper');
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined(); // Never expose password hash
  });

  it('should prevent registration with duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bob@example.com',
        name: 'Bob Marley',
        password: 'password123',
      });

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bob@example.com',
        name: 'Bob Duplicate',
        password: 'anotherpassword',
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error).toContain('already exists');
  });

  it('should fail registration with invalid input', async () => {
    const shortPasswordRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid@example.com',
        name: 'Shorty',
        password: '123',
      });

    expect(shortPasswordRes.status).toBe(400);

    const invalidEmailRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'notanemail',
        name: 'Valid Name',
        password: 'validpassword123',
      });

    expect(invalidEmailRes.status).toBe(400);
  });

  it('should login an existing user with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'carol@example.com',
        name: 'Carol Danvers',
        password: 'captainmarvel!',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'carol@example.com',
        password: 'captainmarvel!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.name).toBe('Carol Danvers');
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dave@example.com',
        name: 'Dave Dave',
        password: 'correctpassword',
      });

    const badLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dave@example.com',
        password: 'wrongpassword',
      });

    expect(badLoginRes.status).toBe(401);
  });

  it('should return current user with /api/auth/me when authenticated', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'eve@example.com',
        name: 'Eve Hacker',
        password: 'password123',
      });

    const token = regRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('eve@example.com');
    expect(meRes.body.name).toBe('Eve Hacker');
  });

  it('should reject /api/auth/me without token', async () => {
    const meRes = await request(app).get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });
});
