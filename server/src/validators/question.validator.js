import { z } from 'zod';

/**
 * Zod validation schema for a Question.
 * Enforces business rules matching SYSTEM_DESIGN.md and Question Mongoose model:
 * - Category must be one of the defined 9 categories
 * - MCQ questions must provide at least 2 options, and the options array must contain the answer
 * - coding_link questions must provide a link
 */
export const questionSchema = z
  .object({
    category: z.enum([
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
    ]),
    topic: z
      .string({ required_error: 'Topic is required' })
      .trim()
      .min(1, 'Topic cannot be empty'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
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
    sourceType: z.enum(['own', 'ai_draft', 'licensed']).default('own'),
    sourceNote: z.string().default(''),
    reviewStatus: z.enum(['draft', 'approved', 'rejected']).default('approved'),
    companyTags: z.array(z.string().trim()).default([]),
  })
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

export default questionSchema;
