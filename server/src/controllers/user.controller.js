import { updateUserProfile } from '../services/auth.service.js';
import { getEffectiveStreak } from '../services/streak.service.js';
import { getTodayKey, getYesterdayKey } from '../utils/date.util.js';

/**
 * GET /api/v1/users/me
 * Returns the currently authenticated user profile and effective streak info.
 */
export const getMe = async (req, res, next) => {
  try {
    const userObj = req.user.toJSON ? req.user.toJSON() : req.user;
    const todayKey = getTodayKey(req.user.timezone);
    const yesterdayKey = getYesterdayKey(req.user.timezone);
    const effectiveStreak = getEffectiveStreak(req.user, todayKey, yesterdayKey);

    const userWithEffectiveStreak = {
      ...userObj,
      streak: {
        ...userObj.streak,
        current: effectiveStreak.current,
        longest: effectiveStreak.longest,
        lastCompletedDate: effectiveStreak.lastCompletedDate,
      },
    };

    res.status(200).json({ user: userWithEffectiveStreak });
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
    const userObj = updatedUser.toJSON ? updatedUser.toJSON() : updatedUser;
    const todayKey = getTodayKey(updatedUser.timezone);
    const yesterdayKey = getYesterdayKey(updatedUser.timezone);
    const effectiveStreak = getEffectiveStreak(updatedUser, todayKey, yesterdayKey);

    const userWithEffectiveStreak = {
      ...userObj,
      streak: {
        ...userObj.streak,
        current: effectiveStreak.current,
        longest: effectiveStreak.longest,
        lastCompletedDate: effectiveStreak.lastCompletedDate,
      },
    };

    res.status(200).json({ user: userWithEffectiveStreak });
  } catch (error) {
    next(error);
  }
};

export default { getMe, updateMe };
