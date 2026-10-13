import { UserQuestionState } from '../models/UserQuestionState.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the next Leitner box and nextReviewAt timestamp based on user's self-rating.
 * Revision rules (SYSTEM_DESIGN.md section 5.5):
 * - missed: box = 0, nextReviewAt = now + 1 day
 * - partly: box = Math.max(box, 1), nextReviewAt = now + 3 days
 * - knew: box += 1; next review after 1, 3, 7 days by box (box 1: +1d, box 2: +3d, box 3: +7d);
 *   after box 3, nextReviewAt = null (mastered).
 *
 * @param {number} currentBox - Current Leitner box (0 to 3)
 * @param {'knew'|'partly'|'missed'} rating - User's self-rating
 * @param {Date} [now] - Current timestamp (default: Date.now)
 * @returns {{ box: number, nextReviewAt: Date | null }}
 */
export const calculateNextReview = (currentBox = 0, rating, now = new Date()) => {
  const baseTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (rating === 'missed') {
    return {
      box: 0,
      nextReviewAt: new Date(baseTime + 1 * ONE_DAY_MS),
    };
  }

  if (rating === 'partly') {
    return {
      box: Math.max(currentBox || 0, 1),
      nextReviewAt: new Date(baseTime + 3 * ONE_DAY_MS),
    };
  }

  if (rating === 'knew') {
    const nextBox = (currentBox || 0) + 1;
    if (nextBox === 1) {
      return {
        box: 1,
        nextReviewAt: new Date(baseTime + 1 * ONE_DAY_MS),
      };
    }
    if (nextBox === 2) {
      return {
        box: 2,
        nextReviewAt: new Date(baseTime + 3 * ONE_DAY_MS),
      };
    }
    if (nextBox === 3) {
      return {
        box: 3,
        nextReviewAt: new Date(baseTime + 7 * ONE_DAY_MS),
      };
    }
    // Mastered after box 3 (capped at 3 per UserQuestionState schema)
    return {
      box: 3,
      nextReviewAt: null,
    };
  }

  return {
    box: currentBox,
    nextReviewAt: null,
  };
};

/**
 * Updates UserQuestionState for a specific user and question upon attempt.
 * Preserves the existing bookmarked flag, increments timesSeen, updates lastRating,
 * Leitner box, and nextReviewAt.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string|mongoose.Types.ObjectId} questionId
 * @param {'knew'|'partly'|'missed'} rating
 * @returns {Promise<Document>} Updated UserQuestionState document
 */
export const updateRevisionState = async (userId, questionId, rating) => {
  let state = await UserQuestionState.findOne({ userId, questionId });

  if (!state) {
    state = new UserQuestionState({
      userId,
      questionId,
      bookmarked: false,
      timesSeen: 0,
      box: 0,
    });
  }

  const { box, nextReviewAt } = calculateNextReview(state.box, rating);

  state.timesSeen = (state.timesSeen || 0) + 1;
  state.lastRating = rating;
  state.box = box;
  state.nextReviewAt = nextReviewAt;

  await state.save();
  return state;
};

export default {
  calculateNextReview,
  updateRevisionState,
};
