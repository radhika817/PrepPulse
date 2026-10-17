import { z } from 'zod';

/**
 * Validator schema for AI Feedback request body.
 * Expects { userAnswer } with trimmed length between 20 and 2000 characters.
 * Rejects unknown fields.
 */
export const aiFeedbackInputSchema = z
  .object({
    userAnswer: z
      .string({ required_error: 'userAnswer is required' })
      .trim()
      .min(20, 'Answer must be at least 20 characters long')
      .max(2000, 'Answer cannot exceed 2000 characters'),
  })
  .strict();

export default {
  aiFeedbackInputSchema,
};
