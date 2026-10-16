import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Generates a signed JWT token for an authenticated user.
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_preppulse';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Registers a new user.
 * - Lowercases email
 * - Hashes password with bcrypt (salt cost 12)
 * - Persists user and returns { user, token } without passwordHash
 */
export const registerUser = async ({ name, email, password, timezone }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user with identical email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    error.code = 'DUPLICATE_EMAIL';
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Create new user (role defaults to student, streak defaults to 0)
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    timezone: timezone || 'Asia/Kolkata',
  });

  const token = generateToken(newUser);

  return {
    user: newUser,
    token,
  };
};

/**
 * Authenticates user credentials.
 * Returns the exact same generic error for wrong email or wrong password.
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Explicitly select passwordHash since it is hidden by default
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.warn(`⚠️ [Auth Debug] Login failed: User not found for email "${normalizedEmail}"`);
    }
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.warn(`⚠️ [Auth Debug] Login failed: Password mismatch for email "${normalizedEmail}"`);
    }
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = generateToken(user);

  return {
    user,
    token,
  };
};

/**
 * Updates user profile: only name and timezone can be modified.
 * Protects role, email, streak, and passwordHash.
 */
export const updateUserProfile = async (userId, updateFields) => {
  const safeUpdates = {};

  if (updateFields.name !== undefined) {
    safeUpdates.name = updateFields.name.trim();
  }
  if (updateFields.timezone !== undefined) {
    safeUpdates.timezone = updateFields.timezone.trim();
  }

  const updatedUser = await User.findByIdAndUpdate(userId, safeUpdates, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return updatedUser;
};

export default {
  generateToken,
  registerUser,
  loginUser,
  updateUserProfile,
};
