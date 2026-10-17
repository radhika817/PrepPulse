import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import questionRoutes from './question.routes.js';
import dailyRoutes from './daily.routes.js';
import streakRoutes from './streak.routes.js';
import adminRoutes from './admin.routes.js';
import featureRoutes from './feature.routes.js';
import { getBookmarks, getRevisionQuestions } from '../controllers/question.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { paginationQuerySchema } from '../validators/question.query.validator.js';

const router = express.Router();

// Mount API v1 sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/questions', questionRoutes);
router.use('/daily', dailyRoutes);
router.use('/streak', streakRoutes);
router.use('/admin', adminRoutes);
router.use('/features', featureRoutes);

// GET /api/v1/bookmarks - paginated list of bookmarked questions for current user
router.get('/bookmarks', authenticate, validateQuery(paginationQuerySchema), getBookmarks);

// GET /api/v1/revision - questions due for recall review for current user
router.get('/revision', authenticate, getRevisionQuestions);

export default router;


