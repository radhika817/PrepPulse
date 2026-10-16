import mongoose from 'mongoose';
import { Question } from '../models/Question.js';

/**
 * GET /api/v1/admin/questions
 * List questions with all fields (including answer, explanation, followUp),
 * supporting filters for reviewStatus, category, topic, difficulty, sourceType, search (q), and pagination.
 */
export const getAdminQuestions = async (req, res, next) => {
  try {
    const { reviewStatus, category, topic, difficulty, sourceType, q, page, limit } = req.query;

    const filter = {};
    if (reviewStatus) filter.reviewStatus = reviewStatus;
    if (category) filter.category = category;
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (sourceType) filter.sourceType = sourceType;
    if (q) filter.$text = { $search: q };

    const skip = (page - 1) * limit;
    const total = await Question.countDocuments(filter);

    let mongoQuery = Question.find(filter);
    if (q) {
      mongoQuery = mongoQuery
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      mongoQuery = mongoQuery.sort({ createdAt: -1 });
    }

    // Admin view: explicitly select answer and followUp (which have select: false by default)
    mongoQuery = mongoQuery
      .select('+answer +followUp')
      .populate('reviewedBy', 'name email role')
      .skip(skip)
      .limit(limit)
      .lean();

    const items = await mongoQuery;
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
 * GET /api/v1/admin/questions/stats
 * Aggregated counts grouped by reviewStatus, sourceType, and category,
 * plus total questions and AI drafts awaiting review.
 */
export const getAdminQuestionStats = async (req, res, next) => {
  try {
    const [statusStats, sourceStats, categoryStats, aiDraftsAwaitingReview, total] = await Promise.all([
      Question.aggregate([
        { $group: { _id: '$reviewStatus', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $group: { _id: '$sourceType', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Question.countDocuments({ sourceType: 'ai_draft', reviewStatus: 'draft' }),
      Question.countDocuments({}),
    ]);

    const reviewStatus = { draft: 0, approved: 0, rejected: 0 };
    statusStats.forEach((s) => {
      if (s._id) reviewStatus[s._id] = s.count;
    });

    const sourceType = { own: 0, ai_draft: 0, licensed: 0 };
    sourceStats.forEach((s) => {
      if (s._id) sourceType[s._id] = s.count;
    });

    const category = {};
    categoryStats.forEach((c) => {
      if (c._id) category[c._id] = c.count;
    });

    return res.json({
      total,
      reviewStatus,
      sourceType,
      category,
      aiDraftsAwaitingReview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/questions/:id
 * Retrieve a single question by ID with all fields including answer, explanation, followUp, and reviewer details.
 */
export const getAdminQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid question ID format',
        },
      });
    }

    const question = await Question.findById(id)
      .select('+answer +followUp')
      .populate('reviewedBy', 'name email role')
      .lean();

    if (!question) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    return res.json({ question });
  } catch (error) {
    next(error);
  }
};
