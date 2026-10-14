import { z } from 'zod';

/**
 * Validation schema for query parameters on GET /api/v1/streak
 * - days: optional integer between 7 and 90, default 28
 */
export const streakQuerySchema = z.object({
  days: z
    .preprocess(
      (val) => (val === undefined || val === '' ? 28 : val),
      z.coerce
        .number()
        .int('Days must be an integer')
        .min(7, 'Days must be at least 7')
        .max(90, 'Days cannot exceed 90')
    )
    .default(28),
});

export default streakQuerySchema;
