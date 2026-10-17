import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAiConfigured, getAiConfigReason } from '../config/ai.config.js';

const router = express.Router();

// All feature flag routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/features
 * Returns enabled runtime feature flags.
 * aiFeedback is true only when LLM_API_KEY and model are validly configured.
 * In development mode, includes aiFeedbackReason for developer debugging.
 * In production mode, returns strictly the boolean flag.
 * Never leaks the key or provider configuration.
 */
router.get('/', (req, res) => {
  const isConfigured = isAiConfigured();
  const isDev = process.env.NODE_ENV !== 'production';

  const response = {
    aiFeedback: isConfigured,
  };

  if (isDev) {
    response.aiFeedbackReason = getAiConfigReason();
  }

  return res.status(200).json(response);
});

export default router;
