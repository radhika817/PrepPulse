import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Ensure environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_123';
process.env.JWT_EXPIRES_IN = '1d';

import app from '../app.js';
import { User } from '../models/User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication & User Profile API (Phase 4)', () => {
  const validUser = {
    name: 'Radhika Sharma',
    email: 'radhika@example.com',
    password: 'Password123',
    timezone: 'Asia/Kolkata',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return user object without passwordHash', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('_id');
      expect(res.body.user.name).toBe(validUser.name);
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.role).toBe('student');
      expect(res.body.user.timezone).toBe('Asia/Kolkata');
      // Critical security check: passwordHash must never be exposed
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject registration with a duplicate email', async () => {
      // Register first time
      await request(app).post('/api/v1/auth/register').send(validUser);

      // Register duplicate
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          name: 'Another Name',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should reject registration with a weak password (no numbers or too short)', async () => {
      // Less than 8 characters
      const shortRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          password: 'Pass1',
        });
      expect(shortRes.status).toBe(400);
      expect(shortRes.body.error.code).toBe('VALIDATION_ERROR');

      // No number
      const noNumRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          password: 'PasswordOnly',
        });
      expect(noNumRes.status).toBe(400);
      expect(noNumRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with an invalid email address', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'not-an-email',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register user before login tests
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject login with wrong password using generic error message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword999',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject login with unknown email using exact same generic error message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/users/me', () => {
    let token;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
      token = regRes.body.token;
    });

    it('should return current user profile when valid token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.name).toBe(validUser.name);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should return 401 when token is missing', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    let token;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
      token = regRes.body.token;
    });

    it('should update name and timezone successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Radhika S.',
          timezone: 'America/New_York',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Radhika S.');
      expect(res.body.user.timezone).toBe('America/New_York');
    });

    it('should reject or ignore attempts to change role', async () => {
      // Attempting to send role: 'admin'
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'admin',
        });

      // Strict schema rejects unknown fields with 400
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Verify in DB that role was not changed
      const meRes = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meRes.body.user.role).toBe('student');
    });

    it('should reject attempts to change email or streak', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'hacker@example.com',
          streak: { current: 100 },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
