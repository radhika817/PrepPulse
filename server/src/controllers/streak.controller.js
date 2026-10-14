import { getEffectiveStreak, getRecentActivity } from '../services/streak.service.js';
import { getTodayKey, getYesterdayKey } from '../utils/date.util.js';

/**
 * GET /api/v1/streak
 * Returns current effective streak, longest streak, last completed date,
 * completedToday indicator, and recent activity for the last N days (default 28).
 */
export const getStreakData = async (req, res, next) => {
  try {
    const days = req.query.days || 28;
    const todayKey = getTodayKey(req.user.timezone);
    const yesterdayKey = getYesterdayKey(req.user.timezone);

    const effectiveStreak = getEffectiveStreak(req.user, todayKey, yesterdayKey);
    const recentActivity = await getRecentActivity(req.user._id, todayKey, days);
    const completedToday = req.user.streak?.lastCompletedDate === todayKey;

    return res.json({
      current: effectiveStreak.current,
      longest: effectiveStreak.longest,
      lastCompletedDate: effectiveStreak.lastCompletedDate,
      completedToday,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getStreakData,
};
