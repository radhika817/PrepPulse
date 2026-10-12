import express from 'express';
import { getMe, updateMe } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/auth.validator.js';

const router = express.Router();

// All /users routes require authentication
router.use(authenticate);

// GET /api/v1/users/me
router.get('/me', getMe);

// PATCH /api/v1/users/me
router.patch('/me', validateBody(updateProfileSchema), updateMe);

export default router;
