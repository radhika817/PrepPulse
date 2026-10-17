import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAiConfigured } from '../config/ai.config.js';

const router = express.Router();

// All feature flag routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/features
 * Returns enabled runtime feature flags.
 * aiFeedback is true only when LLM_API_KEY and model are validly configured.
 * Never leaks the key or provider configuration.
 */
router.get('/', (req, res) => {
  res.json({
    aiFeedback: isAiConfigured(),
  });
});

export default router;
