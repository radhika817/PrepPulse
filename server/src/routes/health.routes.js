import express from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = express.Router();

// GET /api/v1/health -> { status: "ok" }
router.get('/', getHealth);

export default router;
