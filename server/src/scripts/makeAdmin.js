import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Determine directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root (.env) if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';

/**
 * Assigns the 'admin' role to an existing user identified by email.
 * This is the sole mechanism to grant administrative privileges in PrepPulse.
 *
 * @param {string} email - Email address of the user to promote
 * @returns {Promise<{ user: Object, message: string }>} Updated user (without sensitive fields)
 */
export const makeAdmin = async (email) => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Email is required to assign admin role.');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find user by normalized email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error(`User with email "${normalizedEmail}" does not exist.`);
  }

  // Update role to admin
  user.role = 'admin';
  await user.save();

  return {
    user: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
    },
    message: `Successfully granted admin role to user: ${user.email} (${user.name})`,
  };
};

/**
 * CLI runner when executed directly from the terminal.
 * Usage: npm run make-admin -- someone@example.com
 */
const run = async () => {
  const emailArg = process.argv[2];

  if (!emailArg) {
    console.error('❌ Error: Missing email argument.');
    console.error('Usage: npm run make-admin -- someone@example.com');
    process.exit(1);
  }

  try {
    await connectDB();
    const result = await makeAdmin(emailArg);
    console.log(`✅ [Admin] ${result.message}`);
    console.log(`   User ID: ${result.user._id}`);
    console.log(`   Name:    ${result.user.name}`);
    console.log(`   Email:   ${result.user.email}`);
    console.log(`   Role:    ${result.user.role}`);
  } catch (error) {
    console.error(`❌ [Admin] Failed to assign admin role: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly from the CLI
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  run();
}

export default makeAdmin;
