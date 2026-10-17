import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_revision_123';
process.env.JWT_EXPIRES_IN = '1d';

import app from '../app.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { UserQuestionState } from '../models/UserQuestionState.js';
import { DailyChallenge } from '../models/DailyChallenge.js';
import { calculateNextReview, REVISION_INTERVALS } from '../services/revision.service.js';
import { getTodayKey } from '../utils/date.util.js';

let mongoServer;
let studentUser;
let studentToken;
let otherUser;
let otherToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await User.init();
  await Question.init();
  await Attempt.init();
  await UserQuestionState.init();
  await DailyChallenge.init();

  studentUser = await User.create({
    name: 'Revision Student',
    email: 'revision.student@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
    timezone: 'UTC',
  });

  studentToken = jwt.sign(
    { userId: studentUser._id.toString(), role: studentUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  otherUser = await User.create({
    name: 'Other Student',
    email: 'other.student@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
    timezone: 'UTC',
  });

  otherToken = jwt.sign(
    { userId: otherUser._id.toString(), role: otherUser.role },
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
  await Question.deleteMany({});
  await Attempt.deleteMany({});
  await UserQuestionState.deleteMany({});
  await DailyChallenge.deleteMany({});
});

describe('calculateNextReview Unit Tests', () => {
  const fixedNow = new Date('2026-10-17T10:00:00.000Z');

  it('missed rating sets box = 0 and is due after exactly 10 minutes and not before', () => {
    const result = calculateNextReview(2, 'missed', fixedNow);
    expect(result.box).toBe(0);
    expect(result.nextReviewAt).toEqual(new Date('2026-10-17T10:10:00.000Z'));

    // Verify interval constant
    expect(REVISION_INTERVALS.MISSED_MS).toBe(10 * 60 * 1000);

    // 9 minutes 59 seconds: not due yet
    const beforeDue = new Date('2026-10-17T10:09:59.000Z');
    expect(beforeDue.getTime()).toBeLessThan(result.nextReviewAt.getTime());

    // 10 minutes exactly: due
    const atDue = new Date('2026-10-17T10:10:00.000Z');
    expect(atDue.getTime()).toBeGreaterThanOrEqual(result.nextReviewAt.getTime());
  });

  it('partly rating behavior is unchanged (+3 days, box = max(box, 1))', () => {
    const resBox0 = calculateNextReview(0, 'partly', fixedNow);
    expect(resBox0.box).toBe(1);
    expect(resBox0.nextReviewAt).toEqual(new Date('2026-10-20T10:00:00.000Z'));

    const resBox2 = calculateNextReview(2, 'partly', fixedNow);
    expect(resBox2.box).toBe(2);
    expect(resBox2.nextReviewAt).toEqual(new Date('2026-10-20T10:00:00.000Z'));
  });

  it('knew rating behavior is unchanged (+1d box 1, +3d box 2, +7d box 3, null after box 3)', () => {
    const res1 = calculateNextReview(0, 'knew', fixedNow);
    expect(res1.box).toBe(1);
    expect(res1.nextReviewAt).toEqual(new Date('2026-10-18T10:00:00.000Z'));

    const res2 = calculateNextReview(1, 'knew', fixedNow);
    expect(res2.box).toBe(2);
    expect(res2.nextReviewAt).toEqual(new Date('2026-10-20T10:00:00.000Z'));

    const res3 = calculateNextReview(2, 'knew', fixedNow);
    expect(res3.box).toBe(3);
    expect(res3.nextReviewAt).toEqual(new Date('2026-10-24T10:00:00.000Z'));

    const resMastered = calculateNextReview(3, 'knew', fixedNow);
    expect(resMastered.box).toBe(3);
    expect(resMastered.nextReviewAt).toBeNull();
  });
});

describe('Daily mode attempt with selfRating missed', () => {
  it('creates or updates UserQuestionState exactly like practice mode (lastRating, box, nextReviewAt, timesSeen)', async () => {
    const questions = [];
    for (let i = 1; i <= 5; i++) {
      const q = await Question.create({
        category: 'OS',
        topic: 'Virtual Memory',
        difficulty: 'medium',
        type: 'short',
        question: `What is concept ${i} in OS?`,
        answer: `Answer for concept ${i}.`,
        tags: ['os'],
        reviewStatus: 'approved',
      });
      questions.push(q);
    }

    const targetQuestion = questions[0];
    const todayKey = getTodayKey('UTC');
    const challenge = await DailyChallenge.create({
      userId: studentUser._id,
      date: todayKey,
      questionIds: questions.map((q) => q._id),
      completed: false,
      completedCount: 0,
    });

    const res = await request(app)
      .post(`/api/v1/questions/${targetQuestion._id}/attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        mode: 'daily',
        challengeId: challenge._id.toString(),
        selfRating: 'missed',
        timeSpentSec: 20,
      });

    expect(res.status).toBe(200);

    const state = await UserQuestionState.findOne({
      userId: studentUser._id,
      questionId: targetQuestion._id,
    });

    expect(state).not.toBeNull();
    expect(state.lastRating).toBe('missed');
    expect(state.box).toBe(0);
    expect(state.timesSeen).toBe(1);
    expect(state.nextReviewAt).toBeDefined();

    // Verify scheduled for ~10 minutes in future
    const diffMs = new Date(state.nextReviewAt).getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(9 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(10 * 60 * 1000 + 2000);
  });
});

describe('POST /api/v1/questions/:id/revise-later', () => {
  it('returns 401 when called without authentication', async () => {
    const validId = new mongoose.Types.ObjectId();
    const res = await request(app).post(`/api/v1/questions/${validId}/revise-later`);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid ObjectId format', async () => {
    const res = await request(app)
      .post('/api/v1/questions/invalid-id/revise-later')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('returns 404 if question does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/v1/questions/${nonExistentId}/revise-later`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUESTION_NOT_FOUND');
  });

  it('returns 404 if question is draft or rejected', async () => {
    const draftQuestion = await Question.create({
      category: 'OS',
      topic: 'Deadlocks',
      difficulty: 'medium',
      type: 'short',
      question: 'What are the four conditions for deadlock?',
      answer: 'Mutual exclusion, hold and wait, no preemption, circular wait.',
      tags: ['os'],
      reviewStatus: 'draft',
    });

    const res = await request(app)
      .post(`/api/v1/questions/${draftQuestion._id}/revise-later`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(404);
  });

  it('creates state with nextReviewAt = now when no state existed', async () => {
    const approvedQuestion = await Question.create({
      category: 'DSA',
      topic: 'Trees',
      difficulty: 'easy',
      type: 'short',
      question: 'What is a balanced binary tree?',
      answer: 'Height diff <= 1',
      tags: ['trees'],
      reviewStatus: 'approved',
    });

    const res = await request(app)
      .post(`/api/v1/questions/${approvedQuestion._id}/revise-later`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Saved for revision');

    const state = await UserQuestionState.findOne({
      userId: studentUser._id,
      questionId: approvedQuestion._id,
    });
    expect(state).not.toBeNull();
    expect(state.box).toBe(0);
    expect(new Date(state.nextReviewAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('keeps earlier overdue date if question is already overdue', async () => {
    const approvedQuestion = await Question.create({
      category: 'DSA',
      topic: 'Sorting',
      difficulty: 'easy',
      type: 'short',
      question: 'What is mergesort complexity?',
      answer: 'O(n log n)',
      tags: ['sorting'],
      reviewStatus: 'approved',
    });

    const overdueDate = new Date(Date.now() - 3600000); // 1 hour ago
    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: approvedQuestion._id,
      bookmarked: true,
      box: 2,
      timesSeen: 4,
      lastRating: 'partly',
      nextReviewAt: overdueDate,
    });

    const res = await request(app)
      .post(`/api/v1/questions/${approvedQuestion._id}/revise-later`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(new Date(res.body.nextReviewAt).getTime()).toBe(overdueDate.getTime());

    const state = await UserQuestionState.findOne({
      userId: studentUser._id,
      questionId: approvedQuestion._id,
    });
    // Earlier date kept, box, bookmark, timesSeen, and lastRating unchanged
    expect(new Date(state.nextReviewAt).getTime()).toBe(overdueDate.getTime());
    expect(state.box).toBe(2);
    expect(state.bookmarked).toBe(true);
    expect(state.timesSeen).toBe(4);
    expect(state.lastRating).toBe('partly');
  });

  it('moves future nextReviewAt to now when revising later', async () => {
    const approvedQuestion = await Question.create({
      category: 'DSA',
      topic: 'Hashing',
      difficulty: 'medium',
      type: 'short',
      question: 'How do hash collisions occur?',
      answer: 'Two keys hash to same index.',
      tags: ['hashing'],
      reviewStatus: 'approved',
    });

    const futureDate = new Date(Date.now() + 5 * 24 * 3600000); // 5 days in future
    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: approvedQuestion._id,
      bookmarked: false,
      box: 1,
      timesSeen: 2,
      nextReviewAt: futureDate,
    });

    const beforeCall = Date.now();
    const res = await request(app)
      .post(`/api/v1/questions/${approvedQuestion._id}/revise-later`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const updatedMs = new Date(res.body.nextReviewAt).getTime();
    expect(updatedMs).toBeGreaterThanOrEqual(beforeCall - 1000);
    expect(updatedMs).toBeLessThanOrEqual(Date.now() + 1000);
    expect(updatedMs).toBeLessThan(futureDate.getTime());
  });
});

describe('GET /api/v1/revision/count', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).get('/api/v1/revision/count');
    expect(res.status).toBe(401);
  });

  it('returns { due, upcoming } counts and respects user isolation and question approval', async () => {
    const qApproved1 = await Question.create({
      category: 'DBMS',
      topic: 'Indexing',
      difficulty: 'medium',
      type: 'short',
      question: 'Question 1',
      answer: 'Answer 1',
      tags: ['db'],
      reviewStatus: 'approved',
    });

    const qApproved2 = await Question.create({
      category: 'DBMS',
      topic: 'Transactions',
      difficulty: 'hard',
      type: 'short',
      question: 'Question 2',
      answer: 'Answer 2',
      tags: ['db'],
      reviewStatus: 'approved',
    });

    const qDraft = await Question.create({
      category: 'DBMS',
      topic: 'ACID',
      difficulty: 'easy',
      type: 'short',
      question: 'Draft Question',
      answer: 'Draft Answer',
      tags: ['db'],
      reviewStatus: 'draft',
    });

    // StudentUser: 1 due approved, 1 upcoming approved, 1 due draft (must be excluded)
    await UserQuestionState.create([
      {
        userId: studentUser._id,
        questionId: qApproved1._id,
        nextReviewAt: new Date(Date.now() - 60000), // Due
        box: 0,
      },
      {
        userId: studentUser._id,
        questionId: qApproved2._id,
        nextReviewAt: new Date(Date.now() + 600000), // Upcoming
        box: 1,
      },
      {
        userId: studentUser._id,
        questionId: qDraft._id,
        nextReviewAt: new Date(Date.now() - 60000), // Due but draft -> exclude!
        box: 0,
      },
    ]);

    // OtherUser: 2 due approved, 0 upcoming
    await UserQuestionState.create([
      {
        userId: otherUser._id,
        questionId: qApproved1._id,
        nextReviewAt: new Date(Date.now() - 120000), // Due
        box: 0,
      },
      {
        userId: otherUser._id,
        questionId: qApproved2._id,
        nextReviewAt: new Date(Date.now() - 30000), // Due
        box: 0,
      },
    ]);

    // Check studentUser counts
    const resStudent = await request(app)
      .get('/api/v1/revision/count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resStudent.status).toBe(200);
    expect(resStudent.body).toEqual({ due: 1, upcoming: 1 });

    // Check otherUser counts (user isolation)
    const resOther = await request(app)
      .get('/api/v1/revision/count')
      .set('Authorization', `Bearer ${otherToken}`);

    expect(resOther.status).toBe(200);
    expect(resOther.body).toEqual({ due: 2, upcoming: 0 });
  });
});

describe('GET /api/v1/revision (Due and Upcoming scopes)', () => {
  it('returns due questions by default or with scope=due, hiding answer and explanation', async () => {
    const dueQuestion = await Question.create({
      category: 'DBMS',
      topic: 'Indexing',
      difficulty: 'medium',
      type: 'short',
      question: 'What is a B-Tree index?',
      answer: 'A self-balancing tree data structure that maintains sorted data.',
      explanation: 'Detailed explanation that should be hidden.',
      followUp: 'Hidden follow up.',
      tags: ['db'],
      reviewStatus: 'approved',
    });

    const upcomingQuestion = await Question.create({
      category: 'DBMS',
      topic: 'Normalization',
      difficulty: 'easy',
      type: 'short',
      question: 'What is 3NF?',
      answer: 'Every non-key attribute must be non-transitively dependent.',
      tags: ['db'],
      reviewStatus: 'approved',
    });

    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: dueQuestion._id,
      nextReviewAt: new Date(Date.now() - 3600000),
      box: 1,
    });

    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: upcomingQuestion._id,
      nextReviewAt: new Date(Date.now() + 3 * 24 * 3600000),
      box: 2,
    });

    const resDefault = await request(app)
      .get('/api/v1/revision')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resDefault.status).toBe(200);
    expect(resDefault.body.items).toHaveLength(1);
    expect(resDefault.body.items[0]._id).toBe(dueQuestion._id.toString());
    expect(resDefault.body.items[0].answer).toBeUndefined();
    expect(resDefault.body.items[0].explanation).toBeUndefined();
    expect(resDefault.body.items[0].followUp).toBeUndefined();
    expect(resDefault.body.items[0].box).toBe(1);

    const resDue = await request(app)
      .get('/api/v1/revision?scope=due')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resDue.status).toBe(200);
    expect(resDue.body.items).toHaveLength(1);
    expect(resDue.body.items[0]._id).toBe(dueQuestion._id.toString());
  });

  it('returns upcoming questions when scope=upcoming, hiding answer and explanation', async () => {
    const dueQuestion = await Question.create({
      category: 'CN',
      topic: 'TCP',
      difficulty: 'medium',
      type: 'short',
      question: 'Explain TCP 3-way handshake.',
      answer: 'SYN, SYN-ACK, ACK',
      explanation: 'Secret explanation',
      tags: ['networks'],
      reviewStatus: 'approved',
    });

    const upcomingQuestion = await Question.create({
      category: 'CN',
      topic: 'DNS',
      difficulty: 'easy',
      type: 'short',
      question: 'What is DNS?',
      answer: 'Domain Name System',
      explanation: 'Secret DNS details',
      tags: ['networks'],
      reviewStatus: 'approved',
    });

    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: dueQuestion._id,
      nextReviewAt: new Date(Date.now() - 10000),
      box: 0,
    });

    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: upcomingQuestion._id,
      nextReviewAt: new Date(Date.now() + 2 * 24 * 3600000),
      box: 1,
    });

    const resUpcoming = await request(app)
      .get('/api/v1/revision?scope=upcoming')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resUpcoming.status).toBe(200);
    expect(resUpcoming.body.items).toHaveLength(1);
    expect(resUpcoming.body.items[0]._id).toBe(upcomingQuestion._id.toString());
    expect(resUpcoming.body.items[0].answer).toBeUndefined();
    expect(resUpcoming.body.items[0].explanation).toBeUndefined();
    expect(resUpcoming.body.items[0].box).toBe(1);
  });
});
