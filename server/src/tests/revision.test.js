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

let mongoServer;
let studentUser;
let studentToken;

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

  it('successfully schedules question for revision without creating an attempt or affecting streak/daily challenge', async () => {
    const approvedQuestion = await Question.create({
      category: 'DSA',
      topic: 'Trees',
      difficulty: 'easy',
      type: 'short',
      question: 'What is a balanced binary tree?',
      answer: 'A tree where the height difference between left and right subtrees is at most 1.',
      explanation: 'Balanced trees ensure O(log n) operations.',
      tags: ['trees', 'dsa'],
      reviewStatus: 'approved',
    });

    const res = await request(app)
      .post(`/api/v1/questions/${approvedQuestion._id}/revise-later`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Saved for revision');
    expect(res.body.questionId).toBe(approvedQuestion._id.toString());
    expect(res.body.nextReviewAt).toBeDefined();

    // Verify UserQuestionState was updated/created
    const state = await UserQuestionState.findOne({
      userId: studentUser._id,
      questionId: approvedQuestion._id,
    });
    expect(state).not.toBeNull();
    expect(state.box).toBe(0);
    expect(new Date(state.nextReviewAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000);

    // Verify NO Attempt document was created
    const attemptsCount = await Attempt.countDocuments();
    expect(attemptsCount).toBe(0);

    // Verify NO DailyChallenge progress was affected
    const dailyCount = await DailyChallenge.countDocuments();
    expect(dailyCount).toBe(0);
  });

  it('preserves existing bookmark status and existing box when revising later', async () => {
    const approvedQuestion = await Question.create({
      category: 'DSA',
      topic: 'Sorting',
      difficulty: 'easy',
      type: 'short',
      question: 'What is quicksort average complexity?',
      answer: 'O(n log n)',
      tags: ['sorting'],
      reviewStatus: 'approved',
    });

    // Seed existing state with bookmark = true and box = 2
    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: approvedQuestion._id,
      bookmarked: true,
      box: 2,
      timesSeen: 3,
      nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
    });

    const res = await request(app)
      .post(`/api/v1/questions/${approvedQuestion._id}/revise-later`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.box).toBe(2);

    const updatedState = await UserQuestionState.findOne({
      userId: studentUser._id,
      questionId: approvedQuestion._id,
    });
    expect(updatedState.bookmarked).toBe(true); // Preserved!
    expect(updatedState.box).toBe(2); // Preserved!
    expect(new Date(updatedState.nextReviewAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe('GET /api/v1/revision (Due and Upcoming scopes)', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).get('/api/v1/revision');
    expect(res.status).toBe(401);
  });

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

    // Due state (nextReviewAt in past)
    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: dueQuestion._id,
      nextReviewAt: new Date(Date.now() - 3600000), // 1 hour ago
      box: 1,
    });

    // Upcoming state (nextReviewAt in future)
    await UserQuestionState.create({
      userId: studentUser._id,
      questionId: upcomingQuestion._id,
      nextReviewAt: new Date(Date.now() + 3 * 24 * 3600000), // 3 days in future
      box: 2,
    });

    // Test default scope
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

    // Test explicit scope=due
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
