import { z } from 'zod';

/**
 * Allowed question categories matching Question Mongoose model and SYSTEM_DESIGN.md
 */
export const VALID_CATEGORIES = [
  'DSA',
  'DBMS',
  'OS',
  'CN',
  'OOP',
  'SQL',
  'WEB',
  'APTITUDE',
  'HR',
];

/**
 * Allowed difficulty levels
 */
export const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Schema to validate query parameters for GET /api/v1/questions
 * - category: optional, rejects unknown categories
 * - topic: optional string
 * - difficulty: optional, rejects unknown difficulty levels
 * - q: optional search text
 * - page: integer >= 1, defaults to 1
 * - limit: integer between 1 and 50, defaults to 10
 */
export const questionQuerySchema = z.object({
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
      z.coerce.number().int().min(1, 'Limit must be at least 1').max(50, 'Limit cannot exceed 50')
    )
    .default(10),
});

/**
 * Schema to validate pagination query parameters (e.g. for GET /api/v1/bookmarks)
 */
export const paginationQuerySchema = z.object({
  page: z
    .preprocess(
      (val) => (val === undefined || val === '' ? 1 : val),
      z.coerce.number().int().min(1, 'Page must be at least 1')
    )
    .default(1),
  limit: z
    .preprocess(
      (val) => (val === undefined || val === '' ? 10 : val),
      z.coerce.number().int().min(1, 'Limit must be at least 1').max(50, 'Limit cannot exceed 50')
    )
    .default(10),
});

export default questionQuerySchema;
