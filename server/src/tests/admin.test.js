import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_123';
process.env.JWT_EXPIRES_IN = '1d';

import jwt from 'jsonwebtoken';
import app from '../app.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { UserQuestionState } from '../models/UserQuestionState.js';
import { DailyChallenge } from '../models/DailyChallenge.js';
import { makeAdmin } from '../scripts/makeAdmin.js';

let mongoServer;
let studentUser;
let adminUser;
let studentToken;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await Question.init();
  await User.init();
  await UserQuestionState.init();
  await DailyChallenge.init();

  // Create test users
  studentUser = await User.create({
    name: 'Regular Student',
    email: 'student@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'student',
  });

  adminUser = await User.create({
    name: 'PrepPulse Admin',
    email: 'admin@example.com',
    passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
    role: 'admin',
  });

  studentToken = jwt.sign(
    { userId: studentUser._id.toString(), role: studentUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  adminToken = jwt.sign(
    { userId: adminUser._id.toString(), role: adminUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Question.deleteMany({});
  await UserQuestionState.deleteMany({});
  await DailyChallenge.deleteMany({});
});

describe('Phase 12: Admin Question Management & Security Tests', () => {
  describe('1. Authentication & RBAC Protection', () => {
    it('returns 401 when no token is provided on admin routes', async () => {
      const res1 = await request(app).get('/api/v1/admin/questions');
      expect(res1.status).toBe(401);

      const res2 = await request(app).get('/api/v1/admin/questions/stats');
      expect(res2.status).toBe(401);

      const res3 = await request(app).post('/api/v1/admin/questions').send({});
      expect(res3.status).toBe(401);

      const res4 = await request(app).post('/api/v1/admin/questions/bulk-status').send({});
      expect(res4.status).toBe(401);

      const res5 = await request(app).post('/api/v1/admin/questions/import').send({});
      expect(res5.status).toBe(401);
    });

    it('returns 403 on all admin routes when accessed with student role token', async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();

      const endpoints = [
        { method: 'get', url: '/api/v1/admin/questions' },
        { method: 'get', url: '/api/v1/admin/questions/stats' },
        { method: 'get', url: `/api/v1/admin/questions/${dummyId}` },
        { method: 'post', url: '/api/v1/admin/questions' },
        { method: 'patch', url: `/api/v1/admin/questions/${dummyId}` },
        { method: 'post', url: '/api/v1/admin/questions/bulk-status' },
        { method: 'post', url: '/api/v1/admin/questions/import' },
      ];

      for (const ep of endpoints) {
        const req = request(app)[ep.method](ep.url).set('Authorization', `Bearer ${studentToken}`);
        const res = await req.send({});
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('2. Question CRUD & Validation via Admin API', () => {
    it('admin can create a question with default reviewStatus "draft"', async () => {
      const newQ = {
        category: 'OS',
        topic: 'Virtual Memory',
        difficulty: 'medium',
        type: 'mcq',
        question: 'What is thrashing in operating systems?',
        options: [
          'High paging activity causing CPU underutilization',
          'A disk defragmentation strategy',
          'Fast context switching mechanism',
          'A dead-lock avoidance algorithm',
        ],
        answer: 'High paging activity causing CPU underutilization',
        explanation: 'Thrashing occurs when the system spends more time paging than executing.',
        followUp: 'How can thrashing be prevented using the working set model?',
        sourceType: 'ai_draft',
      };

      const res = await request(app)
        .post('/api/v1/admin/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newQ);

      expect(res.status).toBe(201);
      expect(res.body.question).toBeDefined();
      expect(res.body.question.reviewStatus).toBe('draft');
      expect(res.body.question.sourceType).toBe('ai_draft');
      expect(res.body.question.answer).toBe(newQ.answer);
      expect(res.body.question.explanation).toBe(newQ.explanation);
      expect(res.body.question.followUp).toBe(newQ.followUp);
    });

    it('rejects duplicate question creation with 409 DUPLICATE_QUESTION', async () => {
      await Question.create({
        category: 'DBMS',
        topic: 'Indexing',
        difficulty: 'easy',
        type: 'short',
        question: 'What is a B-Tree index?',
        normalizedQuestion: 'what is a b-tree index?',
        answer: 'A balanced tree data structure.',
        reviewStatus: 'approved',
      });

      const res = await request(app)
        .post('/api/v1/admin/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'DBMS',
          topic: 'Indexing',
          difficulty: 'easy',
          type: 'short',
          question: '  What is a B-Tree   Index?  ',
          answer: 'Another answer description.',
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('DUPLICATE_QUESTION');
    });

    it('rejects invalid MCQ question when answer is not in options with 400', async () => {
      const invalidMcq = {
        category: 'CN',
        topic: 'Routing',
        difficulty: 'medium',
        type: 'mcq',
        question: 'Which protocol uses distance vector routing?',
        options: ['OSPF', 'BGP', 'IS-IS'],
        answer: 'RIP', // not in options!
        explanation: 'RIP uses distance vector algorithm.',
      };

      const res = await request(app)
        .post('/api/v1/admin/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidMcq);

      expect(res.status).toBe(400);
    });

    it('admin can list, search, and filter questions with pagination', async () => {
      await Question.create([
        {
          category: 'OS',
          topic: 'Deadlock',
          difficulty: 'hard',
          type: 'short',
          question: 'Define Coffman conditions for deadlock.',
          answer: 'Mutual exclusion, hold and wait, no preemption, circular wait.',
          reviewStatus: 'approved',
          sourceType: 'own',
        },
        {
          category: 'DSA',
          topic: 'Graphs',
          difficulty: 'medium',
          type: 'short',
          question: 'Explain Dijkstra shortest path algorithm.',
          answer: 'Greedy algorithm for single-source shortest paths on non-negative edge weights.',
          reviewStatus: 'draft',
          sourceType: 'ai_draft',
        },
      ]);

      const listRes = await request(app)
        .get('/api/v1/admin/questions?reviewStatus=draft')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.items).toHaveLength(1);
      expect(listRes.body.items[0].topic).toBe('Graphs');
      expect(listRes.body.items[0].answer).toBeDefined(); // Admin gets answer
      expect(listRes.body.total).toBe(1);
      expect(listRes.body.page).toBe(1);
    });

    it('admin can get aggregated question statistics', async () => {
      await Question.create([
        {
          category: 'OOP',
          topic: 'Polymorphism',
          difficulty: 'easy',
          type: 'short',
          question: 'What is runtime polymorphism?',
          answer: 'Method overriding resolved via vtable at runtime.',
          reviewStatus: 'approved',
          sourceType: 'own',
        },
        {
          category: 'OOP',
          topic: 'Encapsulation',
          difficulty: 'easy',
          type: 'short',
          question: 'What is data hiding?',
          answer: 'Protecting object internal state using private access modifiers.',
          reviewStatus: 'draft',
          sourceType: 'ai_draft',
        },
      ]);

      const statsRes = await request(app)
        .get('/api/v1/admin/questions/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.total).toBe(2);
      expect(statsRes.body.reviewStatus.approved).toBe(1);
      expect(statsRes.body.reviewStatus.draft).toBe(1);
      expect(statsRes.body.sourceType.ai_draft).toBe(1);
      expect(statsRes.body.aiDraftsAwaitingReview).toBe(1);
    });

    it('admin can edit fields and reviewStatus, setting reviewedBy and reviewedAt', async () => {
      const q = await Question.create({
        category: 'DSA',
        topic: 'Trees',
        difficulty: 'easy',
        type: 'short',
        question: 'What is a binary search tree property?',
        answer: 'Left child < parent < right child.',
        reviewStatus: 'draft',
      });

      const patchRes = await request(app)
        .patch(`/api/v1/admin/questions/${q._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          difficulty: 'medium',
          reviewStatus: 'approved',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.question.difficulty).toBe('medium');
      expect(patchRes.body.question.reviewStatus).toBe('approved');
      expect(patchRes.body.question.reviewedBy).toBeDefined();
      expect(patchRes.body.question.reviewedBy._id.toString()).toBe(adminUser._id.toString());
      expect(patchRes.body.question.reviewedAt).toBeDefined();
    });

    it('rejects editing question text to collide with an existing question (409)', async () => {
      const q1 = await Question.create({
        category: 'SQL',
        topic: 'Joins',
        difficulty: 'easy',
        type: 'short',
        question: 'What is an inner join in SQL?',
        normalizedQuestion: 'what is an inner join in sql?',
        answer: 'Returns records that have matching values in both tables.',
        reviewStatus: 'approved',
      });

      const q2 = await Question.create({
        category: 'SQL',
        topic: 'Joins',
        difficulty: 'easy',
        type: 'short',
        question: 'What is a cross join?',
        normalizedQuestion: 'what is a cross join?',
        answer: 'Returns Cartesian product of rows.',
        reviewStatus: 'approved',
      });

      const patchRes = await request(app)
        .patch(`/api/v1/admin/questions/${q2._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          question: 'What is an inner join in SQL?',
        });

      expect(patchRes.status).toBe(409);
      expect(patchRes.body.error?.code).toBe('DUPLICATE_QUESTION');
    });

    it('admin can bulk update question reviewStatus', async () => {
      const q1 = await Question.create({
        category: 'CN',
        topic: 'TCP',
        difficulty: 'medium',
        type: 'short',
        question: 'What is the TCP 3-way handshake?',
        answer: 'SYN, SYN-ACK, ACK.',
        reviewStatus: 'draft',
      });
      const q2 = await Question.create({
        category: 'CN',
        topic: 'UDP',
        difficulty: 'easy',
        type: 'short',
        question: 'Why is UDP considered unreliable?',
        answer: 'No acknowledgement or retransmission mechanism.',
        reviewStatus: 'draft',
      });

      const bulkRes = await request(app)
        .post('/api/v1/admin/questions/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ids: [q1._id.toString(), q2._id.toString()],
          reviewStatus: 'approved',
        });

      expect(bulkRes.status).toBe(200);
      expect(bulkRes.body.count).toBe(2);
      expect(bulkRes.body.reviewStatus).toBe('approved');

      const updatedQ1 = await Question.findById(q1._id);
      expect(updatedQ1.reviewStatus).toBe('approved');
      expect(updatedQ1.reviewedBy.toString()).toBe(adminUser._id.toString());
      expect(updatedQ1.reviewedAt).toBeDefined();
    });
  });

  describe('3. Batch JSON Import', () => {
    it('imports mixed valid, duplicate, and invalid items without failing the batch and saves all as draft', async () => {
      // Pre-existing question in database
      await Question.create({
        category: 'DBMS',
        topic: 'Transactions',
        difficulty: 'medium',
        type: 'short',
        question: 'What are ACID properties in database systems?',
        normalizedQuestion: 'what are acid properties in database systems?',
        answer: 'Atomicity, Consistency, Isolation, Durability.',
        reviewStatus: 'approved',
      });

      const importPayload = {
        questions: [
          // Item 0: Valid question (marked approved in file, should still be saved as draft)
          {
            category: 'OS',
            topic: 'Semaphores',
            difficulty: 'medium',
            type: 'short',
            question: 'What is a counting semaphore?',
            answer: 'A synchronization tool using integer counter for resource units.',
            reviewStatus: 'approved', // must be overridden to draft
          },
          // Item 1: Duplicate of DB item
          {
            category: 'DBMS',
            topic: 'Transactions',
            difficulty: 'easy',
            type: 'short',
            question: 'What are acid properties in database systems?',
            answer: 'Same question duplicate.',
          },
          // Item 2: Invalid MCQ (answer not matching options)
          {
            category: 'CPP',
            topic: 'Pointers',
            difficulty: 'easy',
            type: 'mcq',
            question: 'What is a dangling pointer in C++?',
            options: ['Pointer to freed memory', 'Null pointer', 'Void pointer'],
            answer: 'Wild pointer', // Invalid! Not in options
            explanation: 'Dangling pointer points to deallocated memory.',
          },
          // Item 3: Duplicate within the same batch (identical to Item 0)
          {
            category: 'OS',
            topic: 'Semaphores',
            difficulty: 'medium',
            type: 'short',
            question: 'what is a counting semaphore?',
            answer: 'A second copy within the batch.',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/admin/questions/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(importPayload);

      expect(res.status).toBe(200);
      expect(res.body.inserted).toBe(1);
      expect(res.body.skippedDuplicates).toBe(2); // 1 DB duplicate + 1 batch duplicate
      expect(res.body.invalid).toHaveLength(1);
      expect(res.body.invalid[0].index).toBe(2);
      expect(res.body.invalid[0].errors.length).toBeGreaterThan(0);

      // Verify inserted question was saved as 'draft'
      const saved = await Question.findOne({ topic: 'Semaphores' });
      expect(saved).toBeDefined();
      expect(saved.reviewStatus).toBe('draft');
      expect(saved.reviewedBy).toBeNull();
      expect(saved.reviewedAt).toBeNull();
    });
  });

  describe('4. Security & Data Leakage Prevention', () => {
    it('non-admin question endpoints never include answer, explanation, or followUp', async () => {
      const q = await Question.create({
        category: 'DSA',
        topic: 'Arrays',
        difficulty: 'easy',
        type: 'short',
        question: 'Explain two pointer technique.',
        answer: 'SECRET_ANSWER_DATA',
        explanation: 'SECRET_EXPLANATION_DATA',
        followUp: 'SECRET_FOLLOW_UP_DATA',
        reviewStatus: 'approved',
      });

      // GET /api/v1/questions
      const listRes = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(listRes.status).toBe(200);
      const studentQ = listRes.body.items[0];
      expect(studentQ.answer).toBeUndefined();
      expect(studentQ.explanation).toBeUndefined();
      expect(studentQ.followUp).toBeUndefined();

      // GET /api/v1/questions/:id
      const detailRes = await request(app)
        .get(`/api/v1/questions/${q._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.question.answer).toBeUndefined();
      expect(detailRes.body.question.explanation).toBeUndefined();
      expect(detailRes.body.question.followUp).toBeUndefined();

      // Admin endpoint GET /api/v1/admin/questions/:id DOES include them
      const adminDetailRes = await request(app)
        .get(`/api/v1/admin/questions/${q._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminDetailRes.status).toBe(200);
      expect(adminDetailRes.body.question.answer).toBe('SECRET_ANSWER_DATA');
      expect(adminDetailRes.body.question.explanation).toBe('SECRET_EXPLANATION_DATA');
      expect(adminDetailRes.body.question.followUp).toBe('SECRET_FOLLOW_UP_DATA');
    });

    it('rejected and draft questions never appear to normal users in /questions, /daily, /revision or /bookmarks', async () => {
      // 1. Create a draft question and a rejected question
      const draftQ = await Question.create({
        category: 'WEB',
        topic: 'DOM',
        difficulty: 'easy',
        type: 'short',
        question: 'What is the virtual DOM in React?',
        answer: 'In-memory representation of real DOM.',
        reviewStatus: 'draft',
      });

      const rejectedQ = await Question.create({
        category: 'WEB',
        topic: 'CSS',
        difficulty: 'easy',
        type: 'short',
        question: 'What is CSS box model?',
        answer: 'Content, padding, border, margin.',
        reviewStatus: 'rejected',
      });

      // User bookmarks both before rejection/approval (or state was created)
      await UserQuestionState.create([
        {
          userId: studentUser._id,
          questionId: rejectedQ._id,
          bookmarked: true,
          nextReviewAt: new Date(Date.now() - 10000), // Due for revision!
        },
        {
          userId: studentUser._id,
          questionId: draftQ._id,
          bookmarked: true,
          nextReviewAt: new Date(Date.now() - 10000), // Due for revision!
        },
      ]);

      // Check /api/v1/questions - neither draft nor rejected should appear
      const qRes = await request(app)
        .get('/api/v1/questions')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(qRes.status).toBe(200);
      expect(qRes.body.items).toHaveLength(0);

      // Check /api/v1/bookmarks - silently disappears instead of error
      const bookmarkRes = await request(app)
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(bookmarkRes.status).toBe(200);
      expect(bookmarkRes.body.items).toHaveLength(0);

      // Check /api/v1/revision - silently disappears instead of error
      const revisionRes = await request(app)
        .get('/api/v1/revision')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(revisionRes.status).toBe(200);
      expect(revisionRes.body.items).toHaveLength(0);

      // Check /api/v1/questions/:id directly for rejected question -> 404
      const singleRes = await request(app)
        .get(`/api/v1/questions/${rejectedQ._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(singleRes.status).toBe(404);
    });

    it('PATCH /users/me still cannot change user role', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Hacker Student',
          role: 'admin',
        });

      // User schema/validator strictly rejects unauthorized field 'role' with 400
      expect(res.status).toBe(400);

      const refreshed = await User.findById(studentUser._id);
      expect(refreshed.role).toBe('student');
    });
  });

  describe('5. Admin Promotion Script Logic', () => {
    it('makeAdmin function successfully promotes an existing student user to admin', async () => {
      const promoUser = await User.create({
        name: 'Promote Target',
        email: 'target@example.com',
        passwordHash: '$2b$12$dummyhashfordirecttestingpurposesonly1234567890',
        role: 'student',
      });

      const result = await makeAdmin('  TARGET@example.com  ');
      expect(result.user.role).toBe('admin');
      expect(result.user.email).toBe('target@example.com');

      const inDb = await User.findById(promoUser._id);
      expect(inDb.role).toBe('admin');
    });

    it('makeAdmin throws clear error if user does not exist or email is missing', async () => {
      await expect(makeAdmin('doesnotexist@example.com')).rejects.toThrow(
        'User with email "doesnotexist@example.com" does not exist.'
      );
      await expect(makeAdmin('')).rejects.toThrow('Email is required');
    });
  });
});
