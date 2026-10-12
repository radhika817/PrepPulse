import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Authentication middleware.
 * - Extracts Bearer token from Authorization header
 * - Verifies JWT against JWT_SECRET
 * - Loads user from database (without exposing passwordHash)
 * - Attaches user to req.user or returns 401
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing',
        },
      });
    }

    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_preppulse';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token payload',
        },
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account not found',
        },
      });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware.
 * Returns 403 Forbidden if req.user does not have the specified role.
 */
export const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Forbidden: requires '${role}' role`,
      },
    });
  }
  next();
};

export default { authenticate, requireRole };
