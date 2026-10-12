import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { questionQuerySchema } from '../validators/question.query.validator.js';
import {
  getQuestions,
  getQuestionsMeta,
  getQuestionById,
} from '../controllers/question.controller.js';

const router = express.Router();

// All question routes require authentication
router.use(authenticate);

// GET /api/v1/questions - paginated list with search, filters and isBookmarked
router.get('/', validateQuery(questionQuerySchema), getQuestions);

// GET /api/v1/questions/meta - distinct categories and topics for filter dropdowns
// Note: Registered BEFORE /:id so 'meta' is not captured as an ObjectId param
router.get('/meta', getQuestionsMeta);

// GET /api/v1/questions/:id - single question details (excluding answer/explanation)
router.get('/:id', getQuestionById);

export default router;

