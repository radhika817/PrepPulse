import express from 'express';
import healthRoutes from './health.routes.js';

const router = express.Router();

// Mount API v1 sub-routers
router.use('/health', healthRoutes);

export default router;
