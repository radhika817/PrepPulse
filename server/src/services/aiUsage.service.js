import { AiUsage } from '../models/AiUsage.js';
import { getTodayKey } from '../utils/date.util.js';
import { getAiConfig } from '../config/ai.config.js';

/**
 * Atomically checks and increments a user's daily AI request usage.
 *
 * Guarantees:
 * - If user is under daily limit: increments count by 1 and returns allowed: true.
 * - If user has reached or exceeded limit: does not increment and returns allowed: false.
 * - Concurrency safe: simultaneous requests at the limit cannot exceed it.
 *
 * @param {string|mongoose.Types.ObjectId} userId - User's ObjectId
 * @param {string} [timezone] - User's IANA timezone
 * @param {number} [overrideLimit] - Optional limit override (for tests)
 * @returns {Promise<{ allowed: boolean, remainingToday: number, count: number }>}
 */
export const checkAndIncrementDailyUsage = async (userId, timezone, overrideLimit) => {
  const config = getAiConfig();
  const limit = overrideLimit ?? config.dailyLimit;
  const todayKey = getTodayKey(timezone);

  // 1. Ensure the usage record exists for (userId, date) without incrementing
  try {
    await AiUsage.updateOne(
      { userId, date: todayKey },
      { $setOnInsert: { count: 0 } },
      { upsert: true }
    );
  } catch (err) {
    // Handle potential duplicate key race on concurrent first insert
    if (err.code !== 11000) {
      throw err;
    }
  }

  // 2. Atomically increment count strictly if count < limit
  const updated = await AiUsage.findOneAndUpdate(
    { userId, date: todayKey, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { new: true }
  );

  if (!updated) {
    // Limit reached or exceeded
    const currentDoc = await AiUsage.findOne({ userId, date: todayKey });
    const currentCount = currentDoc?.count ?? limit;
    return {
      allowed: false,
      remainingToday: 0,
      count: currentCount,
    };
  }

  return {
    allowed: true,
    remainingToday: Math.max(0, limit - updated.count),
    count: updated.count,
  };
};

/**
 * Gets remaining AI requests for today without incrementing count.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} [timezone]
 * @param {number} [overrideLimit]
 * @returns {Promise<number>}
 */
export const getRemainingDailyUsage = async (userId, timezone, overrideLimit) => {
  const config = getAiConfig();
  const limit = overrideLimit ?? config.dailyLimit;
  const todayKey = getTodayKey(timezone);

  const doc = await AiUsage.findOne({ userId, date: todayKey });
  const currentCount = doc?.count || 0;
  return Math.max(0, limit - currentCount);
};

export default {
  checkAndIncrementDailyUsage,
  getRemainingDailyUsage,
};
