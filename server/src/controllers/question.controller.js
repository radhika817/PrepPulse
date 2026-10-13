import mongoose from 'mongoose';
import { Question } from '../models/Question.js';
import { UserQuestionState } from '../models/UserQuestionState.js';
import { Attempt } from '../models/Attempt.js';
import { updateRevisionState } from '../services/revision.service.js';

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

/**
 * POST /api/v1/questions/:id/bookmark
 * Toggles bookmarked status on UserQuestionState document for (userId, questionId),
 * creating it if missing (upsert).
 * Returns { bookmarked: boolean }.
 * 404 if question does not exist.
 */
export const toggleBookmark = async (req, res, next) => {
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

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    let state = await UserQuestionState.findOne({
      userId: req.user._id,
      questionId: id,
    });

    let bookmarked;
    if (!state) {
      state = await UserQuestionState.create({
        userId: req.user._id,
        questionId: id,
        bookmarked: true,
      });
      bookmarked = true;
    } else {
      state.bookmarked = !state.bookmarked;
      await state.save();
      bookmarked = state.bookmarked;
    }

    return res.json({ bookmarked });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bookmarks
 * Paginated list of current user's bookmarked questions,
 * newest bookmark first. Answer and explanation are strictly excluded.
 */
export const getBookmarks = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user._id,
      bookmarked: true,
    };

    const total = await UserQuestionState.countDocuments(filter);

    // Newest bookmark first (sorted by updatedAt descending)
    const states = await UserQuestionState.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'questionId',
        select: '-explanation -answer -normalizedQuestion -__v',
      })
      .lean();

    const items = states
      .filter((s) => s.questionId)
      .map((s) => {
        const q = s.questionId;
        const { answer: _ans, explanation: _exp, ...cleanQ } = q;
        return {
          ...cleanQ,
          isBookmarked: true,
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
 * POST /api/v1/questions/:id/reveal
 * Reveal the model answer and explanation for an approved question without saving any state.
 * Returns { answer, explanation, link (if coding_link) }.
 * 400 for an invalid ObjectId, 404 if not found or not approved.
 */
export const revealQuestion = async (req, res, next) => {
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

    const question = await Question.findOne({
      _id: id,
      reviewStatus: 'approved',
    })
      .select('+answer')
      .lean();

    if (!question) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found or not approved',
        },
      });
    }

    const response = {
      answer: question.answer,
      explanation: question.explanation,
    };

    if (question.type === 'coding_link') {
      response.link = question.link;
    }

/**
 * POST /api/v1/questions/:id/attempt
 * Records a user's attempt on a question (practice or study mode).
 * - For MCQ: selectedOption is required, isCorrect is computed on server,
 *   selfRating is derived from isCorrect (knew/missed) if not provided.
 * - For non-MCQ: selfRating is required.
 * - Saves Attempt document.
 * - Returns { isCorrect (mcq only), answer, explanation, nextReviewAt }
 */
export const attemptQuestion = async (req, res, next) => {
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

    const question = await Question.findOne({
      _id: id,
      reviewStatus: 'approved',
    })
      .select('+answer')
      .lean();

    if (!question) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found or not approved',
        },
      });
    }

    const {
      mode = 'practice',
      selectedOption,
      selfRating,
      revealedFirst = false,
      timeSpentSec = 0,
    } = req.body;

    let computedIsCorrect = null;
    let finalSelfRating = selfRating;

    if (question.type === 'mcq') {
      if (!selectedOption || typeof selectedOption !== 'string' || selectedOption.trim() === '') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'selectedOption is required for MCQ questions',
          },
        });
      }

      // Compute correctness on the SERVER by comparing against model answer; ignore any client-sent isCorrect
      computedIsCorrect =
        question.answer.trim().toLowerCase() === selectedOption.trim().toLowerCase();

      // If selfRating not explicitly provided for MCQ, derive from isCorrect
      if (!finalSelfRating) {
        finalSelfRating = computedIsCorrect ? 'knew' : 'missed';
      }
    } else {
      // For all non-MCQ types (short, hr, coding_link), selfRating is strictly required
      if (!finalSelfRating) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'selfRating is required for non-MCQ questions',
          },
        });
      }
    }

    // Save Attempt document
    await Attempt.create({
      userId: req.user._id,
      questionId: question._id,
      mode,
      selectedOption: question.type === 'mcq' ? selectedOption : null,
      isCorrect: question.type === 'mcq' ? computedIsCorrect : null,
      selfRating: finalSelfRating,
      revealedFirst: Boolean(revealedFirst),
      timeSpentSec: Number(timeSpentSec) || 0,
    });

    // Update revision state (Leitner box, nextReviewAt, timesSeen, lastRating)
    const revisionState = await updateRevisionState(
      req.user._id,
      question._id,
      finalSelfRating
    );

    const response = {
      ...(question.type === 'mcq' ? { isCorrect: computedIsCorrect } : {}),
      answer: question.answer,
      explanation: question.explanation,
      nextReviewAt: revisionState.nextReviewAt,
    };

    return res.json(response);
  } catch (error) {
    next(error);
  }
};

export default {
  getQuestions,
  getQuestionsMeta,
  getQuestionById,
  toggleBookmark,
  getBookmarks,
  revealQuestion,
  attemptQuestion,
};


