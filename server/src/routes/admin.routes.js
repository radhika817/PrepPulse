import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  getAdminQuestions,
  getAdminQuestionStats,
  getAdminQuestionById,
  createAdminQuestion,
  updateAdminQuestion,
  bulkUpdateQuestionsStatus,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { validateQuery, validateBody } from '../middleware/validate.js';

const router = express.Router();

// Strict rate limiting and admin-only authentication
router.use(apiLimiter);
router.use(authenticate, requireRole('admin'));

// Allowed categories matching SYSTEM_DESIGN.md
export const VALID_CATEGORIES = [
  'OS',
  'DSA',
  'OOP',
  'CPP',
  'DBMS',
  'SQL',
  'CN',
  'COA',
  'WEB',
  'SYSDESIGN',
  'APTITUDE',
  'HR',
];

export const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
export const VALID_REVIEW_STATUSES = ['draft', 'approved', 'rejected'];
export const VALID_SOURCE_TYPES = ['own', 'ai_draft', 'licensed'];

/**
 * Validation schema for admin question query parameters
 */
export const adminQuestionsQuerySchema = z
  .object({
    reviewStatus: z
      .preprocess((val) => (val === '' ? undefined : val), z.enum(VALID_REVIEW_STATUSES))
      .optional(),
    category: z
      .preprocess((val) => (val === '' ? undefined : val), z.enum(VALID_CATEGORIES))
      .optional(),
    topic: z
      .preprocess(
        (val) => (val === '' ? undefined : typeof val === 'string' ? val.trim() : val),
        z.string().min(1, 'Topic cannot be empty')
      )
      .optional(),
    difficulty: z
      .preprocess((val) => (val === '' ? undefined : val), z.enum(VALID_DIFFICULTIES))
      .optional(),
    sourceType: z
      .preprocess((val) => (val === '' ? undefined : val), z.enum(VALID_SOURCE_TYPES))
      .optional(),
    q: z
      .preprocess(
        (val) => (val === '' ? undefined : typeof val === 'string' ? val.trim() : val),
        z.string()
      )
      .optional(),
    page: z
      .preprocess(
        (val) => (val === undefined || val === '' ? 1 : val),
        z.coerce.number().int().min(1, 'Page must be at least 1')
      )
      .default(1),
    limit: z
      .preprocess(
        (val) => (val === undefined || val === '' ? 10 : val),
        z.coerce
          .number()
          .int()
          .min(1, 'Limit must be at least 1')
          .max(50, 'Limit cannot exceed 50')
      )
      .default(10),
  })
  .strict();

/**
 * Validation schema for creating a question via admin API
 */
export const adminCreateQuestionSchema = z
  .object({
    category: z.enum(VALID_CATEGORIES),
    topic: z.string({ required_error: 'Topic is required' }).trim().min(1, 'Topic cannot be empty'),
    difficulty: z.enum(VALID_DIFFICULTIES),
    type: z.enum(['mcq', 'short', 'coding_link', 'hr']),
    question: z
      .string({ required_error: 'Question is required' })
      .trim()
      .min(5, 'Question text must be at least 5 characters long'),
    options: z.array(z.string().trim()).default([]),
    answer: z
      .string({ required_error: 'Answer is required' })
      .trim()
      .min(1, 'Answer cannot be empty'),
    explanation: z.string().trim().optional().default(''),
    followUp: z.string().trim().optional().nullable(),
    link: z.string().url('Link must be a valid URL').nullable().optional().default(null),
    tags: z.array(z.string().trim()).default([]),
    sourceType: z.enum(VALID_SOURCE_TYPES).default('own'),
    sourceNote: z.string().default(''),
    reviewStatus: z.enum(VALID_REVIEW_STATUSES).default('draft'),
    companyTags: z.array(z.string().trim()).default([]),
  })
  .strict()
  .refine(
    (data) => {
      if (data.type === 'mcq') {
        return Array.isArray(data.options) && data.options.length >= 2;
      }
      return true;
    },
    {
      message: 'MCQ questions must provide at least 2 options',
      path: ['options'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'mcq') {
        return data.options.some(
          (opt) => opt.trim().toLowerCase() === data.answer.trim().toLowerCase()
        );
      }
      return true;
    },
    {
      message: 'The correct answer must be one of the provided options for MCQ',
      path: ['answer'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'coding_link') {
        return !!data.link;
      }
      return true;
    },
    {
      message: 'A valid link is required for coding_link question type',
      path: ['link'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'mcq') {
        return typeof data.explanation === 'string' && data.explanation.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Explanation is required for MCQ questions',
      path: ['explanation'],
    }
  );

/**
 * Validation schema for updating a question via admin API
 */
export const adminUpdateQuestionSchema = z
  .object({
    category: z.enum(VALID_CATEGORIES).optional(),
    topic: z.string().trim().min(1, 'Topic cannot be empty').optional(),
    difficulty: z.enum(VALID_DIFFICULTIES).optional(),
    type: z.enum(['mcq', 'short', 'coding_link', 'hr']).optional(),
    question: z.string().trim().min(5, 'Question text must be at least 5 characters long').optional(),
    options: z.array(z.string().trim()).optional(),
    answer: z.string().trim().min(1, 'Answer cannot be empty').optional(),
    explanation: z.string().trim().optional(),
    followUp: z.string().trim().optional().nullable(),
    link: z.string().url('Link must be a valid URL').nullable().optional(),
    tags: z.array(z.string().trim()).optional(),
    sourceType: z.enum(VALID_SOURCE_TYPES).optional(),
    sourceNote: z.string().optional(),
    reviewStatus: z.enum(VALID_REVIEW_STATUSES).optional(),
    companyTags: z.array(z.string().trim()).optional(),
  })
  .strict();

/**
 * Validation schema for bulk status update
 */
export const adminBulkStatusSchema = z
  .object({
    ids: z
      .array(
        z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
          message: 'Invalid question ID format',
        })
      )
      .min(1, 'At least one question ID is required')
      .max(100, 'Cannot update more than 100 questions at once'),
    reviewStatus: z.enum(VALID_REVIEW_STATUSES),
  })
  .strict();

// GET /api/v1/admin/questions/stats (registered before /:id to avoid param capture)
router.get('/questions/stats', getAdminQuestionStats);

// GET /api/v1/admin/questions
router.get('/questions', validateQuery(adminQuestionsQuerySchema), getAdminQuestions);

// POST /api/v1/admin/questions/bulk-status
router.post('/questions/bulk-status', validateBody(adminBulkStatusSchema), bulkUpdateQuestionsStatus);

// GET /api/v1/admin/questions/:id
router.get('/questions/:id', getAdminQuestionById);

// POST /api/v1/admin/questions
router.post('/questions', validateBody(adminCreateQuestionSchema), createAdminQuestion);

// PATCH /api/v1/admin/questions/:id
router.patch('/questions/:id', validateBody(adminUpdateQuestionSchema), updateAdminQuestion);

export default router;
