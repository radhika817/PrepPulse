import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Ensure environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_123';
process.env.JWT_EXPIRES_IN = '1d';

import jwt from 'jsonwebtoken';
import app from '../app.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { UserQuestionState } from '../models/UserQuestionState.js';
import { Attempt } from '../models/Attempt.js';

let mongoServer;
let user1;
let user2;
let user1Token;
let user2Token;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Ensure all schema indexes (especially text search index) are built
  await Question.init();
  await UserQuestionState.init();
  await Attempt.init();

  // Create persistent test users once to avoid heavy repeated bcrypt hashing in beforeEach
  user1 = await User.create({
    name: 'Radhika Student',
    email: 'radhika@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
  });
  user2 = await User.create({
    name: 'Second Student',
    email: 'second@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
  });

  user1Token = jwt.sign(
    { userId: user1._id.toString(), role: user1.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  user2Token = jwt.sign(
    { userId: user2._id.toString(), role: user2.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Questions & Bookmarks API (Phase 5)', () => {
  let sampleApprovedQuestion;
  let sampleDraftQuestion;

  beforeEach(async () => {
    await Question.deleteMany({});
    await UserQuestionState.deleteMany({});
    await Attempt.deleteMany({});

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
    it('list and detail responses never contain answer, explanation or followUp', async () => {
      // 1. Check list endpoint
      const listRes = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(listRes.status).toBe(200);
      for (const item of listRes.body.items) {
        expect(item.answer).toBeUndefined();
        expect(item.explanation).toBeUndefined();
        expect(item.followUp).toBeUndefined();
      }

      // 2. Check detail endpoint
      const detailRes = await request(app)
        .get(`/api/v1/questions/${sampleApprovedQuestion._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.answer).toBeUndefined();
      expect(detailRes.body.explanation).toBeUndefined();
      expect(detailRes.body.followUp).toBeUndefined();
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
      // Answer, explanation and followUp must never be exposed in bookmarks either
      expect(bookmarksRes.body.items[0].answer).toBeUndefined();
      expect(bookmarksRes.body.items[0].explanation).toBeUndefined();
      expect(bookmarksRes.body.items[0].followUp).toBeUndefined();

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

  describe('Practice Reveal & Attempt API (Phase 6)', () => {
    let sampleCodingQuestion;
    let sampleShortQuestion;

    beforeEach(async () => {
      sampleCodingQuestion = await Question.create({
        category: 'DSA',
        topic: 'Arrays',
        difficulty: 'medium',
        type: 'coding_link',
        question: 'Two Sum problem',
        answer: 'Use a hash map to look up complements in O(n) time.',
        explanation: 'Store each number and index in a map and check for target - current.',
        link: 'https://leetcode.com/problems/two-sum',
        tags: ['dsa', 'arrays'],
        reviewStatus: 'approved',
      });

      sampleShortQuestion = await Question.create({
        category: 'DBMS',
        topic: 'Indexing',
        difficulty: 'easy',
        type: 'short',
        question: 'What is a B+ tree?',
        answer: 'A self-balancing tree data structure used in database indexes.',
        explanation: 'All leaves are at the same level and linked together.',
        tags: ['dbms', 'indexing'],
        reviewStatus: 'approved',
      });
    });

    it('list and detail responses still never contain answer or explanation', async () => {
      const listRes = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.items.length).toBeGreaterThan(0);
      listRes.body.items.forEach((item) => {
        expect(item.answer).toBeUndefined();
        expect(item.explanation).toBeUndefined();
      });

      const detailRes = await request(app)
        .get(`/api/v1/questions/${sampleApprovedQuestion._id}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.answer).toBeUndefined();
      expect(detailRes.body.explanation).toBeUndefined();
    });

    it('reveal returns the answer for an approved question; 404 otherwise', async () => {
      // Approved MCQ question reveal
      const revealRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/reveal`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(revealRes.status).toBe(200);
      expect(revealRes.body.answer).toBe('Preemption');
      expect(revealRes.body.explanation).toBe(
        'Preemption breaks one of the four necessary Coffman conditions.'
      );
      expect(revealRes.body.link).toBeUndefined();

      // Coding link question reveal returns link
      const codingRevealRes = await request(app)
        .post(`/api/v1/questions/${sampleCodingQuestion._id}/reveal`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(codingRevealRes.status).toBe(200);
      expect(codingRevealRes.body.link).toBe('https://leetcode.com/problems/two-sum');

      // Draft question returns 404
      const draftRes = await request(app)
        .post(`/api/v1/questions/${sampleDraftQuestion._id}/reveal`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(draftRes.status).toBe(404);

      // Non-existent question returns 404
      const fakeId = new mongoose.Types.ObjectId();
      const notFoundRes = await request(app)
        .post(`/api/v1/questions/${fakeId}/reveal`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(notFoundRes.status).toBe(404);

      // Invalid ID returns 400
      const invalidRes = await request(app)
        .post('/api/v1/questions/invalid-id/reveal')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error.code).toBe('INVALID_ID');

      // Verify reveal is stateless (did not save any attempt or question state)
      const attemptsCount = await Attempt.countDocuments();
      expect(attemptsCount).toBe(0);
      const stateCount = await UserQuestionState.countDocuments();
      expect(stateCount).toBe(0);
    });

    it('mcq attempt: correct and wrong answers set isCorrect on the server; a client-sent isCorrect is ignored', async () => {
      // 1. Correct answer with client attempting to spoof isCorrect: false
      const correctRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selectedOption: 'Preemption',
          isCorrect: false, // client spoof must be ignored
          revealedFirst: false,
          timeSpentSec: 15,
        });

      expect(correctRes.status).toBe(200);
      expect(correctRes.body.isCorrect).toBe(true);
      expect(correctRes.body.answer).toBe('Preemption');
      expect(correctRes.body.explanation).toBeDefined();

      const savedAttempt1 = await Attempt.findOne({
        userId: user1._id,
        questionId: sampleApprovedQuestion._id,
      });
      expect(savedAttempt1).not.toBeNull();
      expect(savedAttempt1.isCorrect).toBe(true);
      expect(savedAttempt1.selfRating).toBe('knew');

      // 2. Wrong answer with client attempting to spoof isCorrect: true
      const wrongRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          mode: 'practice',
          selectedOption: 'Mutual exclusion',
          isCorrect: true, // client spoof must be ignored
          revealedFirst: true,
          timeSpentSec: 30,
        });

      expect(wrongRes.status).toBe(200);
      expect(wrongRes.body.isCorrect).toBe(false);

      const savedAttempt2 = await Attempt.findOne({
        userId: user2._id,
        questionId: sampleApprovedQuestion._id,
      });
      expect(savedAttempt2).not.toBeNull();
      expect(savedAttempt2.isCorrect).toBe(false);
      expect(savedAttempt2.selfRating).toBe('missed');
      expect(savedAttempt2.revealedFirst).toBe(true);
      expect(savedAttempt2.timeSpentSec).toBe(30);

      // 3. MCQ attempt without selectedOption returns 400
      const missingOptionRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          timeSpentSec: 5,
        });
      expect(missingOptionRes.status).toBe(400);
      expect(missingOptionRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('non-mcq attempt without selfRating returns 400', async () => {
      const res = await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          timeSpentSec: 20,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unknown fields in attempt body with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'knew',
          unknownField: 'malicious_or_unexpected',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('attempt creates an Attempt and updates UserQuestionState correctly for missed, partly and knew', async () => {
      const now = Date.now();

      // Test 1: missed rating sets box = 0, nextReviewAt = ~now + 1 day
      const missedRes = await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'missed',
          timeSpentSec: 10,
        });
      expect(missedRes.status).toBe(200);
      expect(missedRes.body.nextReviewAt).toBeDefined();

      const stateMissed = await UserQuestionState.findOne({
        userId: user1._id,
        questionId: sampleShortQuestion._id,
      });
      expect(stateMissed.lastRating).toBe('missed');
      expect(stateMissed.timesSeen).toBe(1);
      expect(stateMissed.box).toBe(0);
      const missedReviewDiff = new Date(stateMissed.nextReviewAt).getTime() - now;
      expect(missedReviewDiff).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
      expect(missedReviewDiff).toBeLessThanOrEqual(25 * 60 * 60 * 1000);

      // Test 2: partly rating sets box = max(box, 1) = 1, nextReviewAt = ~now + 3 days
      const partlyRes = await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'partly',
          timeSpentSec: 12,
        });
      expect(partlyRes.status).toBe(200);

      const statePartly = await UserQuestionState.findOne({
        userId: user1._id,
        questionId: sampleShortQuestion._id,
      });
      expect(statePartly.lastRating).toBe('partly');
      expect(statePartly.timesSeen).toBe(2);
      expect(statePartly.box).toBe(1);
      const partlyReviewDiff = new Date(statePartly.nextReviewAt).getTime() - now;
      expect(partlyReviewDiff).toBeGreaterThanOrEqual(71 * 60 * 60 * 1000);
      expect(partlyReviewDiff).toBeLessThanOrEqual(73 * 60 * 60 * 1000);

      // Test 3: knew progression: box 1 -> box 2 (+3 days) -> box 3 (+7 days) -> mastered (null)
      // Attempt with 'knew' from box 1 -> becomes box 2 (+3 days)
      await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'knew',
          timeSpentSec: 8,
        });
      const stateKnew2 = await UserQuestionState.findOne({
        userId: user1._id,
        questionId: sampleShortQuestion._id,
      });
      expect(stateKnew2.box).toBe(2);
      expect(stateKnew2.timesSeen).toBe(3);
      expect(stateKnew2.lastRating).toBe('knew');

      // Attempt with 'knew' from box 2 -> becomes box 3 (+7 days)
      await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'knew',
          timeSpentSec: 8,
        });
      const stateKnew3 = await UserQuestionState.findOne({
        userId: user1._id,
        questionId: sampleShortQuestion._id,
      });
      expect(stateKnew3.box).toBe(3);
      expect(stateKnew3.timesSeen).toBe(4);
      const knew3ReviewDiff = new Date(stateKnew3.nextReviewAt).getTime() - now;
      expect(knew3ReviewDiff).toBeGreaterThanOrEqual(167 * 60 * 60 * 1000);
      expect(knew3ReviewDiff).toBeLessThanOrEqual(169 * 60 * 60 * 1000);

      // Attempt with 'knew' from box 3 -> graduated past box 3, nextReviewAt is null
      const graduatedRes = await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'knew',
          timeSpentSec: 5,
        });
      expect(graduatedRes.status).toBe(200);
      expect(graduatedRes.body.nextReviewAt).toBeNull();

      const stateGraduated = await UserQuestionState.findOne({
        userId: user1._id,
        questionId: sampleShortQuestion._id,
      });
      expect(stateGraduated.box).toBe(3);
      expect(stateGraduated.nextReviewAt).toBeNull();
      expect(stateGraduated.timesSeen).toBe(5);
    });

    it('attempt keeps the bookmark intact', async () => {
      // First bookmark the question
      await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/bookmark`)
        .set('Authorization', `Bearer ${user1Token}`);

      const stateBefore = await UserQuestionState.findOne({
        userId: user1._id,
        questionId: sampleShortQuestion._id,
      });
      expect(stateBefore.bookmarked).toBe(true);

      // Now submit an attempt
      const attemptRes = await request(app)
        .post(`/api/v1/questions/${sampleShortQuestion._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'knew',
          timeSpentSec: 25,
        });

      expect(attemptRes.status).toBe(200);

      const stateAfter = await UserQuestionState.findOne({
        userId: user1._id,
        questionId: sampleShortQuestion._id,
      });
      expect(stateAfter.bookmarked).toBe(true); // Must remain true!
      expect(stateAfter.lastRating).toBe('knew');
      expect(stateAfter.timesSeen).toBe(1);
    });

    it('401 without a token', async () => {
      // reveal without token
      const revealRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/reveal`);
      expect(revealRes.status).toBe(401);

      // attempt without token
      const attemptRes = await request(app)
        .post(`/api/v1/questions/${sampleApprovedQuestion._id}/attempt`)
        .send({
          mode: 'practice',
          selectedOption: 'Preemption',
          timeSpentSec: 10,
        });
      expect(attemptRes.status).toBe(401);
    });
  });

  describe('Question Schema Extensions (Categories, followUp, optional explanation)', () => {
    it('supports question with followUp and returns it in reveal and attempt, but never in list/detail', async () => {
      const qWithFollowUp = await Question.create({
        category: 'CPP',
        topic: 'Pointers',
        difficulty: 'medium',
        type: 'short',
        question: 'What is a smart pointer in modern C++?',
        answer: 'A wrapper class around a raw pointer that manages its lifetime automatically.',
        followUp: 'What is the difference between std::unique_ptr and std::shared_ptr?',
        tags: ['cpp', 'memory'],
        reviewStatus: 'approved',
      });

      // 1. Detail endpoint does NOT expose followUp
      const detailRes = await request(app)
        .get(`/api/v1/questions/${qWithFollowUp._id}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.followUp).toBeUndefined();

      // 2. Reveal endpoint DOES expose followUp
      const revealRes = await request(app)
        .post(`/api/v1/questions/${qWithFollowUp._id}/reveal`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(revealRes.status).toBe(200);
      expect(revealRes.body.followUp).toBe(
        'What is the difference between std::unique_ptr and std::shared_ptr?'
      );

      // 3. Attempt endpoint DOES expose followUp
      const attemptRes = await request(app)
        .post(`/api/v1/questions/${qWithFollowUp._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'practice',
          selfRating: 'knew',
          timeSpentSec: 10,
        });
      expect(attemptRes.status).toBe(200);
      expect(attemptRes.body.followUp).toBe(
        'What is the difference between std::unique_ptr and std::shared_ptr?'
      );
    });

    it('allows short and hr questions without explanation', async () => {
      const hrQuestion = await Question.create({
        category: 'HR',
        topic: 'Behavioral',
        difficulty: 'easy',
        type: 'hr',
        question: 'Tell me about a time you handled a conflict in a team.',
        answer: 'Use the STAR method: Situation, Task, Action, Result.',
        followUp: 'How do you handle disagreements with management?',
        tags: ['hr', 'behavioral'],
        reviewStatus: 'approved',
      });

      expect(hrQuestion).toBeDefined();
      expect(hrQuestion.explanation).toBe('');
    });
  });
});

