import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_streak_123';
process.env.JWT_EXPIRES_IN = '1d';

import app from '../app.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { DailyChallenge } from '../models/DailyChallenge.js';
import { Attempt } from '../models/Attempt.js';
import { UserQuestionState } from '../models/UserQuestionState.js';
import {
  updateStreakOnCompletion,
  getEffectiveStreak,
  getRecentActivity,
} from '../services/streak.service.js';
import { getTodayKey, getYesterdayKey } from '../utils/date.util.js';

let mongoServer;
let testUser;
let testUserToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await User.init();
  await Question.init();
  await DailyChallenge.init();
  await Attempt.init();
  await UserQuestionState.init();

  testUser = await User.create({
    name: 'Streak Tester',
    email: 'streaktid@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
    timezone: 'Asia/Kolkata',
  });

  testUserToken = jwt.sign(
    { userId: testUser._id.toString(), role: testUser.role },
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

beforeEach(async () => {
  await User.updateOne(
    { _id: testUser._id },
    {
      $set: {
        'streak.current': 0,
        'streak.longest': 0,
        'streak.lastCompletedDate': null,
      },
    }
  );
  await DailyChallenge.deleteMany({});
  await Attempt.deleteMany({});
  await Question.deleteMany({});
  await UserQuestionState.deleteMany({});
});

describe('Streak Calculation & Service Unit Tests', () => {
  it('first completion sets current 1, longest 1', async () => {
    const result = await updateStreakOnCompletion(
      testUser._id,
      '2026-10-01',
      '2026-09-30'
    );

    expect(result).toEqual({
      current: 1,
      longest: 1,
      lastCompletedDate: '2026-10-01',
      increased: true,
    });

    const userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(1);
    expect(userInDb.streak.longest).toBe(1);
    expect(userInDb.streak.lastCompletedDate).toBe('2026-10-01');
  });

  it('completing again on the same day changes nothing', async () => {
    await updateStreakOnCompletion(testUser._id, '2026-10-01', '2026-09-30');

    const secondResult = await updateStreakOnCompletion(
      testUser._id,
      '2026-10-01',
      '2026-09-30'
    );

    expect(secondResult).toEqual({
      current: 1,
      longest: 1,
      lastCompletedDate: '2026-10-01',
      increased: false,
    });

    const userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(1);
    expect(userInDb.streak.longest).toBe(1);
  });

  it('completing on the next day gives current 2', async () => {
    await updateStreakOnCompletion(testUser._id, '2026-10-01', '2026-09-30');

    const nextDayResult = await updateStreakOnCompletion(
      testUser._id,
      '2026-10-02',
      '2026-10-01'
    );

    expect(nextDayResult).toEqual({
      current: 2,
      longest: 2,
      lastCompletedDate: '2026-10-02',
      increased: true,
    });

    const userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(2);
    expect(userInDb.streak.longest).toBe(2);
  });

  it('skipping a day resets current to 1 and keeps longest', async () => {
    await updateStreakOnCompletion(testUser._id, '2026-10-01', '2026-09-30');
    await updateStreakOnCompletion(testUser._id, '2026-10-02', '2026-10-01');

    // Skip Oct 3, complete on Oct 4
    const skipDayResult = await updateStreakOnCompletion(
      testUser._id,
      '2026-10-04',
      '2026-10-03'
    );

    expect(skipDayResult).toEqual({
      current: 1,
      longest: 2,
      lastCompletedDate: '2026-10-04',
      increased: true,
    });

    const userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(1);
    expect(userInDb.streak.longest).toBe(2);
  });

  it('longest keeps the highest value after a reset', async () => {
    // Build up streak to 3
    await updateStreakOnCompletion(testUser._id, '2026-10-01', '2026-09-30');
    await updateStreakOnCompletion(testUser._id, '2026-10-02', '2026-10-01');
    await updateStreakOnCompletion(testUser._id, '2026-10-03', '2026-10-02');

    let userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(3);
    expect(userInDb.streak.longest).toBe(3);

    // Skip 3 days, complete on Oct 07
    await updateStreakOnCompletion(testUser._id, '2026-10-07', '2026-10-06');

    userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(1);
    expect(userInDb.streak.longest).toBe(3); // Longest preserved

    // Complete on Oct 08: current reaches 2, longest stays 3
    await updateStreakOnCompletion(testUser._id, '2026-10-08', '2026-10-07');
    userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(2);
    expect(userInDb.streak.longest).toBe(3);
  });

  it('two simultaneous completions for the same day count only once', async () => {
    // Initial state: completed yesterday
    await User.updateOne(
      { _id: testUser._id },
      {
        $set: {
          'streak.current': 2,
          'streak.longest': 2,
          'streak.lastCompletedDate': '2026-10-10',
        },
      }
    );

    const [res1, res2] = await Promise.all([
      updateStreakOnCompletion(testUser._id, '2026-10-11', '2026-10-10'),
      updateStreakOnCompletion(testUser._id, '2026-10-11', '2026-10-10'),
    ]);

    // One must have increased, the other must have recognized the day as already completed
    const increasedResults = [res1, res2].filter((r) => r.increased);
    const noChangeResults = [res1, res2].filter((r) => !r.increased);

    expect(increasedResults).toHaveLength(1);
    expect(noChangeResults).toHaveLength(1);

    const userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(3); // Increment occurred once, not twice
    expect(userInDb.streak.lastCompletedDate).toBe('2026-10-11');
  });

  it('getEffectiveStreak returns 0 after a missed day without changing the database', async () => {
    // In database, current is stored as 5, lastCompletedDate was 3 days ago
    await User.updateOne(
      { _id: testUser._id },
      {
        $set: {
          'streak.current': 5,
          'streak.longest': 7,
          'streak.lastCompletedDate': '2026-10-01',
        },
      }
    );

    const userInDb = await User.findById(testUser._id);
    const effective = getEffectiveStreak(userInDb, '2026-10-05', '2026-10-04');

    expect(effective.current).toBe(0);
    expect(effective.longest).toBe(7);
    expect(effective.lastCompletedDate).toBe('2026-10-01');

    // Verify database was NOT modified
    const refreshedUser = await User.findById(testUser._id);
    expect(refreshedUser.streak.current).toBe(5);
  });

  it('time zone boundary: a user in Asia/Kolkata and a user in a distant zone get the correct date keys around midnight UTC', () => {
    // 2026-10-14 20:30:00 UTC
    const utcTimestamp = new Date('2026-10-14T20:30:00Z');

    // Asia/Kolkata is UTC+5:30 -> 2026-10-15 02:00:00 (Next day)
    const kolkataToday = getTodayKey('Asia/Kolkata', utcTimestamp);
    const kolkataYesterday = getYesterdayKey('Asia/Kolkata', utcTimestamp);
    expect(kolkataToday).toBe('2026-10-15');
    expect(kolkataYesterday).toBe('2026-10-14');

    // America/Los_Angeles is UTC-7:00 -> 2026-10-14 13:30:00 (Same day)
    const laToday = getTodayKey('America/Los_Angeles', utcTimestamp);
    const laYesterday = getYesterdayKey('America/Los_Angeles', utcTimestamp);
    expect(laToday).toBe('2026-10-14');
    expect(laYesterday).toBe('2026-10-13');
  });

  it('recentActivity marks only completed days', async () => {
    // Create challenges for 4 days
    await DailyChallenge.create([
      {
        userId: testUser._id,
        date: '2026-10-01',
        questionIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
        completed: true,
      },
      {
        userId: testUser._id,
        date: '2026-10-02',
        questionIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
        completed: false,
      },
      // 2026-10-03 is not created (missed)
      {
        userId: testUser._id,
        date: '2026-10-04',
        questionIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
        completed: true,
      },
    ]);

    const activity = await getRecentActivity(testUser._id, '2026-10-04', 4);

    expect(activity).toEqual([
      { date: '2026-10-01', completed: true },
      { date: '2026-10-02', completed: false },
      { date: '2026-10-03', completed: false },
      { date: '2026-10-04', completed: true },
    ]);
  });
});

describe('Streak API Integration Tests', () => {
  it('GET /api/v1/streak returns streak and recent activity', async () => {
    await updateStreakOnCompletion(testUser._id, '2026-10-10', '2026-10-09');

    const res = await request(app)
      .get('/api/v1/streak?days=14')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('current');
    expect(res.body).toHaveProperty('longest');
    expect(res.body).toHaveProperty('lastCompletedDate');
    expect(res.body).toHaveProperty('completedToday');
    expect(res.body).toHaveProperty('recentActivity');
    expect(res.body.recentActivity).toHaveLength(14);
  });

  it('GET /api/v1/streak validates days query param (7 to 90)', async () => {
    // Less than 7
    const lowRes = await request(app)
      .get('/api/v1/streak?days=5')
      .set('Authorization', `Bearer ${testUserToken}`);
    expect(lowRes.status).toBe(400);

    // Greater than 90
    const highRes = await request(app)
      .get('/api/v1/streak?days=100')
      .set('Authorization', `Bearer ${testUserToken}`);
    expect(highRes.status).toBe(400);
  });

  it('GET /api/v1/users/me returns the effective current streak', async () => {
    // Store streak that was last completed 4 days ago
    await User.updateOne(
      { _id: testUser._id },
      {
        $set: {
          'streak.current': 6,
          'streak.longest': 8,
          'streak.lastCompletedDate': '2026-10-01',
        },
      }
    );

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.status).toBe(200);
    // Effective streak is 0 because lastCompletedDate is not today or yesterday
    expect(res.body.user.streak.current).toBe(0);
    expect(res.body.user.streak.longest).toBe(8);

    // Verify DB still holds 6
    const userInDb = await User.findById(testUser._id);
    expect(userInDb.streak.current).toBe(6);
  });

  it('the attempt response includes streak details only when the challenge becomes completed', async () => {
    // Create 5 test questions
    const questions = await Question.create([
      { category: 'OS', topic: 'T1', difficulty: 'easy', type: 'short', question: 'Q1 Text Sample', answer: 'Ans1', reviewStatus: 'approved' },
      { category: 'OS', topic: 'T2', difficulty: 'easy', type: 'short', question: 'Q2 Text Sample', answer: 'Ans2', reviewStatus: 'approved' },
      { category: 'OS', topic: 'T3', difficulty: 'easy', type: 'short', question: 'Q3 Text Sample', answer: 'Ans3', reviewStatus: 'approved' },
      { category: 'OS', topic: 'T4', difficulty: 'easy', type: 'short', question: 'Q4 Text Sample', answer: 'Ans4', reviewStatus: 'approved' },
      { category: 'OS', topic: 'T5', difficulty: 'easy', type: 'short', question: 'Q5 Text Sample', answer: 'Ans5', reviewStatus: 'approved' },
    ]);

    const todayStr = getTodayKey(testUser.timezone);
    const challenge = await DailyChallenge.create({
      userId: testUser._id,
      date: todayStr,
      questionIds: questions.map((q) => q._id),
      completedQuestionIds: [],
      completed: false,
    });

    // Attempt question 1: challenge not completed yet
    const attempt1 = await request(app)
      .post(`/api/v1/questions/${questions[0]._id}/attempt`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        mode: 'daily',
        challengeId: challenge._id.toString(),
        selfRating: 'knew',
        timeSpentSec: 10,
      });

    expect(attempt1.status).toBe(200);
    expect(attempt1.body.challengeCompleted).toBe(false);
    expect(attempt1.body.streak).toBeUndefined();

    // Complete questions 2, 3, 4
    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post(`/api/v1/questions/${questions[i]._id}/attempt`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          mode: 'daily',
          challengeId: challenge._id.toString(),
          selfRating: 'knew',
          timeSpentSec: 10,
        });
    }

    // Attempt question 5: challenge BECOMES completed!
    const attempt5 = await request(app)
      .post(`/api/v1/questions/${questions[4]._id}/attempt`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        mode: 'daily',
        challengeId: challenge._id.toString(),
        selfRating: 'knew',
        timeSpentSec: 10,
      });

    expect(attempt5.status).toBe(200);
    expect(attempt5.body.challengeCompleted).toBe(true);
    expect(attempt5.body.streak).toBeDefined();
    expect(attempt5.body.streak.current).toBe(1);
    expect(attempt5.body.streak.longest).toBe(1);
    expect(attempt5.body.streak.increased).toBe(true);
  });

  it('PATCH /users/me cannot change streak fields', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        streak: { current: 99, longest: 99 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401 without a token', async () => {
    const res = await request(app).get('/api/v1/streak');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
