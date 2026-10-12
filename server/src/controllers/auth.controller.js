import { registerUser, loginUser } from '../services/auth.service.js';

/**
 * POST /api/v1/auth/register
 * Creates a new student user and returns user profile + JWT token.
 */
export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Validates credentials and returns user profile + JWT token.
 */
export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default { register, login };
