import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { questionQuerySchema } from '../validators/question.query.validator.js';
import { getQuestions } from '../controllers/question.controller.js';

const router = express.Router();

// All question routes require authentication
router.use(authenticate);

// GET /api/v1/questions - paginated list with search, filters and isBookmarked
router.get('/', validateQuery(questionQuerySchema), getQuestions);

export default router;
