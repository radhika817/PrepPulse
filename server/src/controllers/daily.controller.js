import { getOrCreateTodayChallenge } from '../services/dailyChallenge.service.js';
import { Question } from '../models/Question.js';
import { UserQuestionState } from '../models/UserQuestionState.js';

/**
 * GET /api/v1/daily
 * Retrieves today's 5-question daily challenge (generating it if not yet created).
 * Returns: { date, challengeId, completed, completedCount, questions }
 * Each question has same fields as list item (answer/explanation strictly excluded)
 * plus isDone (true if completed).
 */
export const getDailyChallenge = async (req, res, next) => {
  try {
    const challenge = await getOrCreateTodayChallenge(req.user);

    // Fetch questions in bulk, strictly excluding answers and explanations
    const rawQuestions = await Question.find({
      _id: { $in: challenge.questionIds },
      reviewStatus: 'approved',
    })
      .select('-explanation -answer -normalizedQuestion -__v')
      .lean();

    const questionMap = new Map(
      rawQuestions.map((q) => [q._id.toString(), q])
    );

    const completedSet = new Set(
      (challenge.completedQuestionIds || []).map((id) => id.toString())
    );

    // Fetch bookmark state for current user
    const bookmarks = await UserQuestionState.find({
      userId: req.user._id,
      questionId: { $in: challenge.questionIds },
      bookmarked: true,
    })
      .select('questionId')
      .lean();

    const bookmarkedSet = new Set(
      bookmarks.map((b) => b.questionId.toString())
    );

    // Preserve the exact 5-question order defined in challenge.questionIds
    const questions = challenge.questionIds
      .map((id) => questionMap.get(id.toString()))
      .filter(Boolean)
      .map((q) => {
        const { answer: _ans, explanation: _exp, ...cleanQ } = q;
        return {
          ...cleanQ,
          isBookmarked: bookmarkedSet.has(q._id.toString()),
          isDone: completedSet.has(q._id.toString()),
        };
      });

    return res.json({
      date: challenge.date,
      challengeId: challenge._id,
      completed: Boolean(challenge.completed),
      completedCount: (challenge.completedQuestionIds || []).length,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDailyChallenge,
};
