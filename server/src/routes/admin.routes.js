import express from 'express';
import { z } from 'zod';
import {
  getAdminQuestions,
  getAdminQuestionStats,
  getAdminQuestionById,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { validateQuery } from '../middleware/validate.js';

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

// GET /api/v1/admin/questions/stats (registered before /:id to avoid param capture)
router.get('/questions/stats', getAdminQuestionStats);

// GET /api/v1/admin/questions
router.get('/questions', validateQuery(adminQuestionsQuerySchema), getAdminQuestions);

// GET /api/v1/admin/questions/:id
router.get('/questions/:id', getAdminQuestionById);

export default router;
