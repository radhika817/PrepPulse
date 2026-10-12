import { updateUserProfile } from '../services/auth.service.js';

/**
 * GET /api/v1/users/me
 * Returns the currently authenticated user profile and streak info.
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user is attached by the authenticate middleware
    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/me
 * Updates the user's name or timezone only.
 */
export const updateMe = async (req, res, next) => {
  try {
    const updatedUser = await updateUserProfile(req.user._id, req.body);
    res.status(200).json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export default { getMe, updateMe };
