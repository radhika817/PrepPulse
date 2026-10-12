import express from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply stricter rate limiting to authentication routes
router.use(authLimiter);

// POST /api/v1/auth/register
router.post('/register', validateBody(registerSchema), register);

// POST /api/v1/auth/login
router.post('/login', validateBody(loginSchema), login);

export default router;
