import { User } from '../models/User.js';
import { DailyChallenge } from '../models/DailyChallenge.js';

/**
 * Updates a user's streak atomically when today's daily challenge is completed.
 * Implements SYSTEM_DESIGN.md section 5.3:
 * - last == today: no change, increased = false
 * - last == yesterday: current += 1, increased = true
 * - otherwise: current = 1, increased = true
 * - longest = max(longest, current), lastCompletedDate = today
 *
 * Uses findOneAndUpdate with filter { 'streak.lastCompletedDate': { $ne: todayKey } }
 * to guarantee that concurrent completions for the same day count only once.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId - User ID
 * @param {string} todayKey - Date string (YYYY-MM-DD) for today in user's timezone
 * @param {string} yesterdayKey - Date string (YYYY-MM-DD) for yesterday in user's timezone
 * @returns {Promise<{ current: number, longest: number, lastCompletedDate: string, increased: boolean }>}
 */
export const updateStreakOnCompletion = async (userId, todayKey, yesterdayKey) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const last = user.streak?.lastCompletedDate || null;
  if (last === todayKey) {
    return {
      current: user.streak?.current || 0,
      longest: user.streak?.longest || 0,
      lastCompletedDate: last,
      increased: false,
    };
  }

  let newCurrent = 1;
  if (last === yesterdayKey) {
    newCurrent = (user.streak?.current || 0) + 1;
  }
  const newLongest = Math.max(user.streak?.longest || 0, newCurrent);

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      'streak.lastCompletedDate': { $ne: todayKey },
    },
    {
      $set: {
        'streak.current': newCurrent,
        'streak.longest': newLongest,
        'streak.lastCompletedDate': todayKey,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    // Another concurrent request updated it to todayKey first
    const freshUser = await User.findById(userId);
    return {
      current: freshUser.streak?.current || 0,
      longest: freshUser.streak?.longest || 0,
      lastCompletedDate: freshUser.streak?.lastCompletedDate || todayKey,
      increased: false,
    };
  }

  return {
    current: updatedUser.streak.current,
    longest: updatedUser.streak.longest,
    lastCompletedDate: updatedUser.streak.lastCompletedDate,
    increased: true,
  };
};

/**
 * Returns the effective streak values to display to the user.
 * If lastCompletedDate is neither today nor yesterday, the effective current streak is 0.
 * Does not write to the database; the real reset happens on the next completion.
 *
 * @param {Object} user - User document or plain object
 * @param {string} todayKey - Date string (YYYY-MM-DD) for today in user's timezone
 * @param {string} yesterdayKey - Date string (YYYY-MM-DD) for yesterday in user's timezone
 * @returns {{ current: number, longest: number, lastCompletedDate: string|null }}
 */
export const getEffectiveStreak = (user, todayKey, yesterdayKey) => {
  const current = user?.streak?.current || 0;
  const longest = user?.streak?.longest || 0;
  const last = user?.streak?.lastCompletedDate || null;

  if (!last || (last !== todayKey && last !== yesterdayKey)) {
    return {
      current: 0,
      longest,
      lastCompletedDate: last,
    };
  }

  return {
    current,
    longest,
    lastCompletedDate: last,
  };
};

/**
 * Returns an array of { date, completed } objects for the last N calendar days ending at endDateKey.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId - User ID
 * @param {string} endDateKey - End date string (YYYY-MM-DD) in user's timezone
 * @param {number} [days=28] - Number of days to include
 * @returns {Promise<Array<{ date: string, completed: boolean }>>}
 */
export const getRecentActivity = async (userId, endDateKey, days = 28) => {
  const [year, month, day] = endDateKey.split('-').map(Number);
  const dateList = [];

  for (let i = days - 1; i >= 0; i--) {
    const utcDate = new Date(Date.UTC(year, month - 1, day - i));
    const y = utcDate.getUTCFullYear();
    const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(utcDate.getUTCDate()).padStart(2, '0');
    dateList.push(`${y}-${m}-${d}`);
  }

  const challenges = await DailyChallenge.find({
    userId,
    date: { $in: dateList },
    completed: true,
  })
    .select('date')
    .lean();

  const completedDates = new Set(challenges.map((c) => c.date));

  return dateList.map((date) => ({
    date,
    completed: completedDates.has(date),
  }));
};

export default {
  updateStreakOnCompletion,
  getEffectiveStreak,
  getRecentActivity,
};
