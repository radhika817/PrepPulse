import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { streakQuerySchema } from '../validators/streak.validator.js';
import { getStreakData } from '../controllers/streak.controller.js';

const router = express.Router();

/**
 * GET /api/v1/streak
 * Returns current effective streak, longest streak, and recent activity.
 * Query: ?days=28 (between 7 and 90, optional)
 */
router.get('/', authenticate, validateQuery(streakQuerySchema), getStreakData);

export default router;
