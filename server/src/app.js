import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import apiLimiter from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

// Create Express application
const app = express();

// Trust reverse proxy hops (e.g. Render, Vercel) for accurate client IP in express-rate-limit
app.set('trust proxy', 1);

// 1. Security HTTP headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS) restricted strictly to CLIENT_URL list
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, health checks)
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      // In development / test, allow localhost origins if not explicitly listed
      if (
        process.env.NODE_ENV !== 'production' &&
        (normalizedOrigin.startsWith('http://localhost:') ||
          normalizedOrigin.startsWith('http://127.0.0.1:'))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Rate limiting for API routes
app.use('/api', apiLimiter);

// 5. Mount API routes at /api/v1
app.use('/api/v1', apiRoutes);

// 6. 404 handler for unmapped routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// 7. Central error handling middleware
app.use(errorHandler);

export default app;
