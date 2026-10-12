import dotenv from 'dotenv';
// Load environment variables from .env file if available
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV || 'development';

// Check JWT_SECRET requirement
if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  console.error(
    '❌ FATAL: JWT_SECRET environment variable is missing in production mode. Refusing to start.'
  );
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.warn(
    '⚠️ [Auth] Warning: JWT_SECRET is not set in environment. Using development fallback secret.'
  );
}

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 PrepPulse API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down PrepPulse server...`);
      server.close(async () => {
        await disconnectDB();
        console.log('✅ Server and database connections closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
