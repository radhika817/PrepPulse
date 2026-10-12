import { Question } from '../models/Question.js';
import { UserQuestionState } from '../models/UserQuestionState.js';

/**
 * GET /api/v1/questions
 * List approved questions with filters (category, topic, difficulty),
 * full-text search (q), pagination, and isBookmarked indicator for current user.
 * Answer and explanation are strictly excluded.
 */
export const getQuestions = async (req, res, next) => {
  try {
    const { category, topic, difficulty, q, page, limit } = req.query;

    // Build query filter: only approved questions are served to students
    const filter = { reviewStatus: 'approved' };

    if (category) {
      filter.category = category;
    }

    if (topic) {
      filter.topic = topic;
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    if (q) {
      // Use existing text index on question and tags
      filter.$text = { $search: q };
    }

    const skip = (page - 1) * limit;

    // Total count matching the filter
    const total = await Question.countDocuments(filter);

    // Build Mongoose query
    let mongoQuery = Question.find(filter);

    if (q) {
      // Project textScore for relevance sorting when search query is active
      mongoQuery = mongoQuery
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      mongoQuery = mongoQuery.sort({ createdAt: -1 });
    }

    // Exclude answer (also select: false on schema) and explanation explicitly
    mongoQuery = mongoQuery
      .select('-explanation -answer -normalizedQuestion -__v')
      .skip(skip)
      .limit(limit)
      .lean();

    const questions = await mongoQuery;

    // Retrieve bookmarks for current user to compute isBookmarked
    const questionIds = questions.map((item) => item._id);
    const bookmarks = await UserQuestionState.find({
      userId: req.user._id,
      questionId: { $in: questionIds },
      bookmarked: true,
    })
      .select('questionId')
      .lean();

    const bookmarkedSet = new Set(bookmarks.map((b) => b.questionId.toString()));

    // Shape items ensuring no explanation or answer can ever leak
    const items = questions.map((item) => {
      const { answer: _ans, explanation: _exp, score: _score, ...cleanItem } = item;
      return {
        ...cleanItem,
        isBookmarked: bookmarkedSet.has(item._id.toString()),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      items,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getQuestions,
};
