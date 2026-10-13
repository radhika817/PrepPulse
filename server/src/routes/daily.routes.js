import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDailyChallenge } from '../controllers/daily.controller.js';

const router = express.Router();

// All daily challenge routes require authentication
router.use(authenticate);

// GET /api/v1/daily - retrieves today's personalized five-question challenge
router.get('/', getDailyChallenge);

export default router;
