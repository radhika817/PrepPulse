import { z } from 'zod';

/**
 * Zod validation schema for question attempts (POST /api/v1/questions/:id/attempt).
 *
 * Requirements:
 * - Body: { mode: "practice" | "study", selectedOption (mcq only),
 *           selfRating: "knew" | "partly" | "missed",
 *           revealedFirst: boolean, timeSpentSec: number >= 0 }
 * - Unknown fields are strictly rejected (.strict())
 * - isCorrect: accepted as optional if passed by client, but strictly ignored
 *   and recomputed on the server.
 */
export const attemptSchema = z
  .object({
    mode: z
      .enum(['practice', 'study', 'daily'], {
        errorMap: () => ({ message: 'Mode must be "practice", "study", or "daily"' }),
      })
      .default('practice'),
    challengeId: z.string().trim().nullable().optional(),
    selectedOption: z.string().trim().nullable().optional(),
    selfRating: z
      .enum(['knew', 'partly', 'missed'], {
        errorMap: () => ({ message: 'selfRating must be "knew", "partly", or "missed"' }),
      })
      .nullable()
      .optional(),
    revealedFirst: z
      .boolean({
        invalid_type_error: 'revealedFirst must be a boolean',
      })
      .default(false),
    timeSpentSec: z
      .number({
        invalid_type_error: 'timeSpentSec must be a number',
      })
      .min(0, 'timeSpentSec must be greater than or equal to 0')
      .default(0),
    isCorrect: z.boolean().optional(),
  })
  .strict();

export default attemptSchema;
