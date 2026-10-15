import mongoose from 'mongoose';

/**
 * Global reference to an in-memory MongoDB instance if used in development/testing.
 */
let memoryServer = null;

/**
 * Connects to MongoDB.
 *
 * Rules:
 * - If MONGO_URI is provided: connects to that instance directly.
 * - In production: MONGO_URI is strictly required; missing MONGO_URI aborts with an error.
 * - In development (or test) when MONGO_URI is empty: falls back to MongoMemoryServer
 *   and logs a prominent warning that data will not persist.
 */
export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (uri) {
    try {
      console.log(
        `[DB] Connecting to MongoDB at: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`
      );
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ [DB] Connected to MongoDB successfully.');
      return mongoose.connection;
    } catch (err) {
      console.error(`❌ [DB] Could not connect to configured MONGO_URI: ${err.message}`);
      throw err;
    }
  }

  // If in production and MONGO_URI is missing, refuse to start
  if (nodeEnv === 'production') {
    const errorMsg =
      '❌ [DB] FATAL: MONGO_URI environment variable is missing in production mode. In-memory database is strictly prohibited in production.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Fallback for development / test when MONGO_URI is empty
  console.warn(
    '\n⚠️  ========================================================================' +
    '\n⚠️  [DB] WARNING: MONGO_URI is empty in development mode.' +
    '\n⚠️  Using an in-memory MongoMemoryServer database.' +
    '\n⚠️  DATA WILL NOT PERSIST between server restarts!' +
    '\n⚠️  Set MONGO_URI in server/.env to use persistent MongoDB Atlas or local daemon.' +
    '\n⚠️  ========================================================================\n'
  );

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`✅ [DB] Connected to in-memory development database at: ${memoryUri}`);
    return mongoose.connection;
  } catch (memErr) {
    console.error('❌ [DB] Failed to start in-memory MongoDB fallback:', memErr.message);
    throw memErr;
  }
};

/**
 * Disconnects from MongoDB and stops the in-memory server if running.
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    console.log('🔌 [DB] Disconnected from MongoDB.');
  } catch (err) {
    console.error('❌ [DB] Error during MongoDB disconnection:', err.message);
  }
};
