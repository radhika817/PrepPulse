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
import { Question } from '../models/Question.js';
import { UserQuestionState } from '../models/UserQuestionState.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Ensure all schema indexes (especially text search index) are built
  await Question.init();
  await UserQuestionState.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Questions & Bookmarks API (Phase 5)', () => {
  let user1Token;
  let user2Token;
  let sampleApprovedQuestion;
  let sampleDraftQuestion;

  beforeEach(async () => {
    await User.deleteMany({});
    await Question.deleteMany({});
    await UserQuestionState.deleteMany({});

    // Register User 1
    const regUser1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Radhika Student',
      email: 'radhika@example.com',
      password: 'Password123',
    });
    user1Token = regUser1.body.token;

    // Register User 2
    const regUser2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Second Student',
      email: 'second@example.com',
      password: 'Password123',
    });
    user2Token = regUser2.body.token;

    // Seed approved test question
    sampleApprovedQuestion = await Question.create({
      category: 'OS',
      topic: 'Deadlock',
      difficulty: 'easy',
      type: 'mcq',
      question: 'Which condition is NOT required for deadlock to occur?',
      options: ['Mutual exclusion', 'Hold and wait', 'Preemption', 'Circular wait'],
      answer: 'Preemption',
      explanation: 'Preemption breaks one of the four necessary Coffman conditions.',
      tags: ['os', 'concurrency', 'deadlock'],
      reviewStatus: 'approved',
    });

    // Seed draft question (must not be served to students)
    sampleDraftQuestion = await Question.create({
      category: 'OS',
      topic: 'CPU Scheduling',
      difficulty: 'medium',
      type: 'short',
      question: 'Explain Round Robin scheduling algorithm.',
      answer: 'Round robin allocates a fixed time quantum per process.',
      explanation: 'Preemptive scheduling based on time slice.',
      tags: ['cpu', 'scheduling'],
      reviewStatus: 'draft',
    });
  });

  describe('Authentication protection', () => {
    it('requests without a token get 401 across all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/questions' },
        { method: 'get', path: `/api/v1/questions/${sampleApprovedQuestion._id}` },
        { method: 'get', path: '/api/v1/questions/meta' },
        { method: 'post', path: `/api/v1/questions/${sampleApprovedQuestion._id}/bookmark` },
        { method: 'get', path: '/api/v1/bookmarks' },
      ];

      for (const ep of endpoints) {
        const res = await request(app)[ep.method](ep.path);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('GET /api/v1/questions (List, Filters, Search & Pagination)', () => {
    it('list returns only approved questions', async () => {
      const res = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0]._id).toBe(sampleApprovedQuestion._id.toString());
    });

    it('filters by category, topic and difficulty work, including combined', async () => {
      // Add questions with different categories and difficulties
      await Question.create([
        {
          category: 'DBMS',
          topic: 'Normalization',
          difficulty: 'medium',
          type: 'short',
          question: 'What is 3NF in database design?',
          answer: '3NF removes transitive dependencies.',
          explanation: 'Every non-key attribute must depend directly on candidate key.',
          tags: ['dbms', 'normalization'],
          reviewStatus: 'approved',
        },
        {
          category: 'OS',
          topic: 'Memory Management',
          difficulty: 'hard',
          type: 'short',
          question: 'Explain Virtual Memory and Thrashing.',
          answer: 'Thrashing occurs when high paging activity drains CPU.',
          explanation: 'Too many page faults lead to low throughput.',
          tags: ['os', 'memory'],
          reviewStatus: 'approved',
        },
      ]);

      // Filter by category
      const catRes = await request(app)
        .get('/api/v1/questions?category=DBMS')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(catRes.status).toBe(200);
      expect(catRes.body.items).toHaveLength(1);
      expect(catRes.body.items[0].category).toBe('DBMS');

      // Filter by difficulty
      const diffRes = await request(app)
        .get('/api/v1/questions?difficulty=hard')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(diffRes.status).toBe(200);
      expect(diffRes.body.items).toHaveLength(1);
      expect(diffRes.body.items[0].difficulty).toBe('hard');

      // Filter by topic
      const topicRes = await request(app)
        .get('/api/v1/questions?topic=Deadlock')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(topicRes.status).toBe(200);
      expect(topicRes.body.items).toHaveLength(1);
      expect(topicRes.body.items[0].topic).toBe('Deadlock');

      // Combined filter
      const combinedRes = await request(app)
        .get('/api/v1/questions?category=OS&topic=Deadlock&difficulty=easy')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(combinedRes.status).toBe(200);
      expect(combinedRes.body.items).toHaveLength(1);
      expect(combinedRes.body.items[0].topic).toBe('Deadlock');

      // Combined filter matching nothing
      const noMatchRes = await request(app)
        .get('/api/v1/questions?category=DSA&difficulty=easy')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(noMatchRes.status).toBe(200);
      expect(noMatchRes.body.items).toHaveLength(0);
      expect(noMatchRes.body.total).toBe(0);

      // Rejects unknown category with 400
      const invalidCatRes = await request(app)
        .get('/api/v1/questions?category=UNKNOWN')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(invalidCatRes.status).toBe(400);
      expect(invalidCatRes.body.error.code).toBe('VALIDATION_ERROR');

      // Rejects unknown difficulty with 400
      const invalidDiffRes = await request(app)
        .get('/api/v1/questions?difficulty=superhard')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(invalidDiffRes.status).toBe(400);
      expect(invalidDiffRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('search with q returns matching questions', async () => {
      await Question.create({
        category: 'CN',
        topic: 'Routing',
        difficulty: 'medium',
        type: 'short',
        question: 'Explain Dijkstra shortest path in link-state routing protocol.',
        answer: 'Dijkstra finds the single-source shortest paths on weighted graph.',
        explanation: 'Used in OSPF protocol.',
        tags: ['cn', 'routing', 'network'],
        reviewStatus: 'approved',
      });

      const res = await request(app)
        .get('/api/v1/questions?q=Dijkstra')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].question).toContain('Dijkstra');
    });

    it('pagination returns correct page, total and totalPages', async () => {
      // Create 14 more approved questions (making 15 total)
      const extraQuestions = [];
      for (let i = 1; i <= 14; i++) {
        extraQuestions.push({
          category: 'DSA',
          topic: `Topic ${i}`,
          difficulty: 'easy',
          type: 'short',
          question: `DSA Practice Question number ${i} on algorithms?`,
          answer: `Answer ${i}`,
          explanation: `Explanation ${i}`,
          tags: ['dsa'],
          reviewStatus: 'approved',
        });
      }
      await Question.insertMany(extraQuestions);

      // Page 1 with limit 10
      const page1Res = await request(app)
        .get('/api/v1/questions?page=1&limit=10')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(page1Res.status).toBe(200);
      expect(page1Res.body.items).toHaveLength(10);
      expect(page1Res.body.page).toBe(1);
      expect(page1Res.body.limit).toBe(10);
      expect(page1Res.body.total).toBe(15);
      expect(page1Res.body.totalPages).toBe(2);

      // Page 2 with limit 10
      const page2Res = await request(app)
        .get('/api/v1/questions?page=2&limit=10')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(page2Res.status).toBe(200);
      expect(page2Res.body.items).toHaveLength(5);
      expect(page2Res.body.page).toBe(2);
      expect(page2Res.body.total).toBe(15);
      expect(page2Res.body.totalPages).toBe(2);
    });
  });

  describe('Security: Answer and Explanation Leakage Prevention', () => {
    it('list and detail responses never contain answer or explanation', async () => {
      // 1. Check list endpoint
      const listRes = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(listRes.status).toBe(200);
      for (const item of listRes.body.items) {
        expect(item.answer).toBeUndefined();
        expect(item.explanation).toBeUndefined();
      }

      // 2. Check detail endpoint
      const detailRes = await request(app)
        .get(`/api/v1/questions/${sampleApprovedQuestion._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.answer).toBeUndefined();
      expect(detailRes.body.explanation).toBeUndefined();
      expect(detailRes.body.question).toBe(sampleApprovedQuestion.question);
    });
  });

  describe('GET /api/v1/questions/meta', () => {
    it('returns categories and distinct topics for approved questions only', async () => {
      const res = await request(app)
        .get('/api/v1/questions/meta')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('categories');
      expect(Array.isArray(res.body.categories)).toBe(true);

      const osCategory = res.body.categories.find((c) => c.category === 'OS');
      expect(osCategory).toBeDefined();
      expect(osCategory.topics).toContain('Deadlock');
      // Draft topic 'CPU Scheduling' must not appear
      expect(osCategory.topics).not.toContain('CPU Scheduling');
    });
  });

  describe('GET /api/v1/questions/:id (Detail)', () => {
    it('returns 400 if id is not a valid ObjectId', async () => {
      const res = await request(app)
        .get('/api/v1/questions/not-a-valid-object-id')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ID');
    });

    it('returns 404 if question does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/questions/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 if question is not approved (draft/rejected)', async () => {
      const res = await request(app)
        .get(`/api/v1/questions/${sampleDraftQuestion._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Bookmarks: Toggle and List', () => {
    it('bookmark toggles on and off; bookmarks list shows only my bookmarks', async () => {
      // 1. Initial: not bookmarked
      const initialDetail = await request(app)
        .get(`/api/v1/questions/${sampleApprovedQuestion._id}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(initialDetail.body.isBookmarked).toBe(false);

      // 2. Toggle on
      const toggleOnRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/bookmark`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(toggleOnRes.status).toBe(200);
      expect(toggleOnRes.body.bookmarked).toBe(true);

      // 3. Detail and list now reflect isBookmarked = true
      const afterOnDetail = await request(app)
        .get(`/api/v1/questions/${sampleApprovedQuestion._id}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(afterOnDetail.body.isBookmarked).toBe(true);

      const listRes = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(listRes.body.items[0].isBookmarked).toBe(true);

      // 4. GET /bookmarks shows the question
      const bookmarksRes = await request(app)
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(bookmarksRes.status).toBe(200);
      expect(bookmarksRes.body.items).toHaveLength(1);
      expect(bookmarksRes.body.total).toBe(1);
      expect(bookmarksRes.body.items[0]._id).toBe(sampleApprovedQuestion._id.toString());
      expect(bookmarksRes.body.items[0].isBookmarked).toBe(true);
      // Answer and explanation must never be exposed in bookmarks either
      expect(bookmarksRes.body.items[0].answer).toBeUndefined();
      expect(bookmarksRes.body.items[0].explanation).toBeUndefined();

      // 5. Toggle off
      const toggleOffRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/bookmark`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(toggleOffRes.status).toBe(200);
      expect(toggleOffRes.body.bookmarked).toBe(false);

      // 6. GET /bookmarks is now empty
      const bookmarksAfterOff = await request(app)
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(bookmarksAfterOff.status).toBe(200);
      expect(bookmarksAfterOff.body.items).toHaveLength(0);
      expect(bookmarksAfterOff.body.total).toBe(0);
    });

    it('another user bookmarks never appear', async () => {
      // User 1 bookmarks sample question
      await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/bookmark`)
        .set('Authorization', `Bearer ${user1Token}`);

      // User 2 checks their bookmarks: should be empty!
      const user2Bookmarks = await request(app)
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Bookmarks.status).toBe(200);
      expect(user2Bookmarks.body.items).toHaveLength(0);
      expect(user2Bookmarks.body.total).toBe(0);

      // User 2 checking question list sees isBookmarked = false
      const user2List = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(user2List.body.items[0].isBookmarked).toBe(false);
    });

    it('toggle bookmark returns 404 if question does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/questions/${fakeId}/bookmark`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('toggle bookmark returns 400 if id is not a valid ObjectId', async () => {
      const res = await request(app)
        .post('/api/v1/questions/invalid-id-format/bookmark')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ID');
    });
  });
});
