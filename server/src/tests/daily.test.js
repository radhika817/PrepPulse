import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_daily_123';
process.env.JWT_EXPIRES_IN = '1d';

import jwt from 'jsonwebtoken';
import app from '../app.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { DailyChallenge } from '../models/DailyChallenge.js';
import { UserQuestionState } from '../models/UserQuestionState.js';
import { getTodayKey, getYesterdayKey, sanitizeTimezone } from '../utils/date.util.js';

let mongoServer;
let user1;
let user2;
let user1Token;
let user2Token;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await Question.init();
  await Attempt.init();
  await DailyChallenge.init();
  await UserQuestionState.init();

  user1 = await User.create({
    name: 'Daily Student One',
    email: 'daily1@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
    timezone: 'Asia/Kolkata',
  });

  user2 = await User.create({
    name: 'Daily Student Two',
    email: 'daily2@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
    timezone: 'America/New_York',
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

describe('Phase 8: Daily Five-Question Challenge', () => {
  beforeEach(async () => {
    await Question.deleteMany({});
    await Attempt.deleteMany({});
    await DailyChallenge.deleteMany({});
    await UserQuestionState.deleteMany({});
  });

  describe('1. Timezone Date Utility (date.util.js)', () => {
    it('returns the right date for Asia/Kolkata and far-away zones around midnight with a fixed date', () => {
      // 00:30 UTC on October 14, 2026
      const fixedMidnight = new Date('2026-10-14T00:30:00Z');

      // Asia/Kolkata is UTC+5:30 -> local time 06:00 on Oct 14, 2026
      expect(getTodayKey('Asia/Kolkata', fixedMidnight)).toBe('2026-10-14');
      expect(getYesterdayKey('Asia/Kolkata', fixedMidnight)).toBe('2026-10-13');

      // Pacific/Honolulu is UTC-10:00 -> local time 14:30 on Oct 13, 2026
      expect(getTodayKey('Pacific/Honolulu', fixedMidnight)).toBe('2026-10-13');
      expect(getYesterdayKey('Pacific/Honolulu', fixedMidnight)).toBe('2026-10-12');

      // America/New_York is UTC-4:00 (EDT) -> local time 20:30 on Oct 13, 2026
      expect(getTodayKey('America/New_York', fixedMidnight)).toBe('2026-10-13');
      expect(getYesterdayKey('America/New_York', fixedMidnight)).toBe('2026-10-12');
    });

    it('falls back to Asia/Kolkata if timezone is missing, invalid or null', () => {
      const fixedDate = new Date('2026-10-14T01:00:00Z');
      expect(sanitizeTimezone('')).toBe('Asia/Kolkata');
      expect(sanitizeTimezone('Not/A_Real_Timezone')).toBe('Asia/Kolkata');
      expect(sanitizeTimezone(null)).toBe('Asia/Kolkata');

      const expectedKolkata = getTodayKey('Asia/Kolkata', fixedDate);
      expect(getTodayKey('InvalidZone', fixedDate)).toBe(expectedKolkata);
      expect(getTodayKey(null, fixedDate)).toBe(expectedKolkata);
    });
  });

  describe('2. Daily Challenge Generation & GET /api/v1/daily', () => {
    it('returns 401 without an authentication token', async () => {
      const res = await request(app).get('/api/v1/daily');
      expect(res.status).toBe(401);
    });

    it('returns 409 if there are fewer than 5 approved questions in the database', async () => {
      // Seed only 3 approved questions
      for (let i = 1; i <= 3; i++) {
        await Question.create({
          category: 'OS',
          topic: 'Deadlock',
          difficulty: 'easy',
          type: 'short',
          question: `Test Question Number ${i}?`,
          answer: `Model Answer ${i}`,
          explanation: `Explanation ${i}`,
          reviewStatus: 'approved',
        });
      }

      const res = await request(app)
        .get('/api/v1/daily')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INSUFFICIENT_QUESTIONS');
    });

    it('returns 5 distinct approved questions, and calling it twice returns the same 5 questions', async () => {
      // Seed 8 approved questions across categories and 1 draft question
      for (let i = 1; i <= 8; i++) {
        await Question.create({
          category: i % 2 === 0 ? 'DBMS' : 'OS',
          topic: `Topic ${i}`,
          difficulty: i % 3 === 0 ? 'hard' : 'medium',
          type: 'mcq',
          question: `Sample Approved Question ${i} for daily challenge?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'Option A',
          explanation: `Explanation text ${i}`,
          reviewStatus: 'approved',
        });
      }

      await Question.create({
        category: 'OS',
        topic: 'Draft',
        difficulty: 'easy',
        type: 'short',
        question: 'Draft question that must not be in daily challenge?',
        answer: 'Draft answer',
        explanation: 'Draft explanation',
        reviewStatus: 'draft',
      });

      // 1. First call creates challenge
      const res1 = await request(app)
        .get('/api/v1/daily')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.challengeId).toBeDefined();
      expect(res1.body.date).toBe(getTodayKey(user1.timezone));
      expect(res1.body.completed).toBe(false);
      expect(res1.body.completedCount).toBe(0);
      expect(res1.body.questions).toHaveLength(5);

      // Verify all 5 questions are distinct
      const ids = res1.body.questions.map((q) => q._id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      // Verify answer and explanation are strictly excluded, isDone is false
      res1.body.questions.forEach((q) => {
        expect(q.answer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.isDone).toBe(false);
        expect(typeof q.isBookmarked).toBe('boolean');
      });

      // 2. Second call on same day returns the exact same 5 questions and challenge
      const res2 = await request(app)
        .get('/api/v1/daily')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.challengeId).toBe(res1.body.challengeId);
      expect(res2.body.questions.map((q) => q._id)).toEqual(ids);
    });

    it('picks questions from weak topics and ignores revealedFirst attempts when computing weak topics', async () => {
      // Create weak topic questions: OS / Concurrency
      const weakQ1 = await Question.create({
        category: 'OS',
        topic: 'Concurrency',
        difficulty: 'hard',
        type: 'mcq',
        question: 'What is a race condition in concurrency?',
        options: ['Mutual Exclusion', 'Two threads competing for shared state', 'Deadlock', 'Livelock'],
        answer: 'Two threads competing for shared state',
        explanation: 'A race condition occurs when concurrent execution leads to nondeterministic state.',
        reviewStatus: 'approved',
      });

      const weakQ2 = await Question.create({
        category: 'OS',
        topic: 'Concurrency',
        difficulty: 'medium',
        type: 'short',
        question: 'Explain semaphores vs mutexes in concurrency.',
        answer: 'Mutex is binary locking; semaphore has an integer count.',
        explanation: 'Dijkstra introduced counting semaphores.',
        reviewStatus: 'approved',
      });

      // Seed 6 general questions in other topics
      for (let i = 1; i <= 6; i++) {
        await Question.create({
          category: 'DBMS',
          topic: `Transactions ${i}`,
          difficulty: 'easy',
          type: 'short',
          question: `General pool transaction question ${i}?`,
          answer: `Transaction answer ${i}`,
          explanation: `Transaction explanation ${i}`,
          reviewStatus: 'approved',
        });
      }

      // Seed attempts for user1 to make "OS / Concurrency" a weak topic:
      // 5 attempts: 4 missed, 1 knew -> accuracy = 1/5 = 0.2 (< 0.6)
      for (let i = 0; i < 4; i++) {
        await Attempt.create({
          userId: user1._id,
          questionId: weakQ1._id,
          mode: 'practice',
          selfRating: 'missed',
          revealedFirst: false,
          timeSpentSec: 10,
        });
      }
      await Attempt.create({
        userId: user1._id,
        questionId: weakQ1._id,
        mode: 'practice',
        selfRating: 'knew',
        revealedFirst: false,
        timeSpentSec: 15,
      });

      // Add a revealedFirst attempt that got "knew" (must NOT inflate accuracy!)
      await Attempt.create({
        userId: user1._id,
        questionId: weakQ1._id,
        mode: 'practice',
        selfRating: 'knew',
        revealedFirst: true, // MUST BE EXCLUDED FROM ACCURACY
        timeSpentSec: 2,
      });

      const res = await request(app)
        .get('/api/v1/daily')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(5);

      // Verify that Concurrency appears in the daily set
      const topicsInDaily = res.body.questions.map((q) => q.topic);
      expect(topicsInDaily).toContain('Concurrency');
    });
  });

  describe('3. Attempting Questions in Daily Mode', () => {
    let dailyQIds = [];
    let challengeId = null;

    beforeEach(async () => {
      // Seed 7 approved questions
      for (let i = 1; i <= 7; i++) {
        await Question.create({
          category: 'DSA',
          topic: 'Binary Search',
          difficulty: 'medium',
          type: 'mcq',
          question: `DSA Binary search question ${i}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'Option A',
          explanation: `Explanation ${i}`,
          reviewStatus: 'approved',
        });
      }

      const res = await request(app)
        .get('/api/v1/daily')
        .set('Authorization', `Bearer ${user1Token}`);

      challengeId = res.body.challengeId;
      dailyQIds = res.body.questions.map((q) => q._id);
    });

    it('rejects attempt if question is outside today set with 400', async () => {
      // Create an outside question not in the challenge
      const outsideQ = await Question.create({
        category: 'HR',
        topic: 'Intro',
        difficulty: 'easy',
        type: 'short',
        question: 'Tell me about yourself.',
        answer: 'Structure response with past, present, and future.',
        explanation: 'Elevator pitch format.',
        reviewStatus: 'approved',
      });

      const res = await request(app)
        .post(`/api/v1/questions/${outsideQ._id}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'daily',
          challengeId,
          selfRating: 'knew',
          timeSpentSec: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CHALLENGE');
    });

    it('rejects attempt if using another user challenge with 400', async () => {
      // User 2 tries to attempt user 1's challenge
      const res = await request(app)
        .post(`/api/v1/questions/${dailyQIds[0]}/attempt`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          mode: 'daily',
          challengeId, // belongs to user 1
          selectedOption: 'Option A',
          timeSpentSec: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CHALLENGE');
    });

    it('submitting questions in daily mode marks them completed, prevents duplicate counting, and marks challenge complete on 5th question', async () => {
      // Attempt 1: First question
      const res1 = await request(app)
        .post(`/api/v1/questions/${dailyQIds[0]}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'daily',
          challengeId,
          selectedOption: 'Option A',
          timeSpentSec: 12,
        });

      expect(res1.status).toBe(200);
      expect(res1.body.isCorrect).toBe(true);
      expect(res1.body.completedCount).toBe(1);
      expect(res1.body.challengeCompleted).toBe(false);

      // Attempting the same question again in daily mode returns 400 ALREADY_COMPLETED
      const duplicateAttemptRes = await request(app)
        .post(`/api/v1/questions/${dailyQIds[0]}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'daily',
          challengeId,
          selectedOption: 'Option A',
          timeSpentSec: 10,
        });

      expect(duplicateAttemptRes.status).toBe(400);
      expect(duplicateAttemptRes.body.error.code).toBe('ALREADY_COMPLETED');

      // Attempt questions 2, 3, 4
      for (let i = 1; i < 4; i++) {
        const midRes = await request(app)
          .post(`/api/v1/questions/${dailyQIds[i]}/attempt`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            mode: 'daily',
            challengeId,
            selectedOption: 'Option A',
            timeSpentSec: 10,
          });

        expect(midRes.status).toBe(200);
        expect(midRes.body.completedCount).toBe(i + 1);
        expect(midRes.body.challengeCompleted).toBe(false);
      }

      // Check daily status: 4 of 5 completed
      const checkMidDaily = await request(app)
        .get('/api/v1/daily')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(checkMidDaily.body.completedCount).toBe(4);
      expect(checkMidDaily.body.completed).toBe(false);
      expect(checkMidDaily.body.questions[0].isDone).toBe(true);
      expect(checkMidDaily.body.questions[4].isDone).toBe(false);

      // Attempt 5th question: Completes the daily challenge!
      const res5 = await request(app)
        .post(`/api/v1/questions/${dailyQIds[4]}/attempt`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mode: 'daily',
          challengeId,
          selectedOption: 'Option A',
          timeSpentSec: 15,
        });

      expect(res5.status).toBe(200);
      expect(res5.body.completedCount).toBe(5);
      expect(res5.body.challengeCompleted).toBe(true);

      // Check daily endpoint now reflects completion
      const finalDailyRes = await request(app)
        .get('/api/v1/daily')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(finalDailyRes.body.completed).toBe(true);
      expect(finalDailyRes.body.completedCount).toBe(5);
      finalDailyRes.body.questions.forEach((q) => {
        expect(q.isDone).toBe(true);
      });
    });
  });
});
