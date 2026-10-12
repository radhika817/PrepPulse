import mongoose from 'mongoose';
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

/**
 * GET /api/v1/questions/meta
 * Returns list of categories and distinct topics for each category
 * (approved questions only) for filter dropdowns.
 */
export const getQuestionsMeta = async (req, res, next) => {
  try {
    const meta = await Question.aggregate([
      { $match: { reviewStatus: 'approved' } },
      { $group: { _id: '$category', topics: { $addToSet: '$topic' } } },
      { $project: { _id: 0, category: '$_id', topics: 1 } },
      { $sort: { category: 1 } },
    ]);

    // Sort topics alphabetically within each category
    meta.forEach((group) => {
      if (Array.isArray(group.topics)) {
        group.topics.sort((a, b) => a.localeCompare(b));
      }
    });

    // Sort categories in logical curriculum order
    const categoryOrder = {
      DSA: 1,
      DBMS: 2,
      OS: 3,
      CN: 4,
      OOP: 5,
      SQL: 6,
      WEB: 7,
      APTITUDE: 8,
      HR: 9,
    };
    meta.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));

    return res.json({ categories: meta });
  } catch (error) {
    next(error);
  }
};


/**
 * GET /api/v1/questions/:id
 * Retrieve a single approved question by ID.
 * Returns same fields as list item, including isBookmarked for current user.
 * Answer and explanation are strictly excluded.
 */
export const getQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid question ID format',
        },
      });
    }

    const question = await Question.findOne({
      _id: id,
      reviewStatus: 'approved',
    })
      .select('-explanation -answer -normalizedQuestion -__v')
      .lean();

    if (!question) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found or not approved',
        },
      });
    }

    // Check if bookmarked by current user
    const bookmark = await UserQuestionState.findOne({
      userId: req.user._id,
      questionId: id,
      bookmarked: true,
    })
      .select('_id')
      .lean();

    const { answer: _ans, explanation: _exp, ...cleanQuestion } = question;

    return res.json({
      ...cleanQuestion,
      isBookmarked: !!bookmark,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getQuestions,
  getQuestionsMeta,
  getQuestionById,
};

