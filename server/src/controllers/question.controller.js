import mongoose from 'mongoose';
import { Question } from '../models/Question.js';
import { UserQuestionState } from '../models/UserQuestionState.js';
import { Attempt } from '../models/Attempt.js';
import { DailyChallenge } from '../models/DailyChallenge.js';
import { updateRevisionState } from '../services/revision.service.js';
import { getTodayKey, getYesterdayKey } from '../utils/date.util.js';
import { updateStreakOnCompletion, getEffectiveStreak } from '../services/streak.service.js';
import { isAiConfigured } from '../config/ai.config.js';
import { generateFeedback } from '../services/aiFeedback.service.js';
import { checkAndIncrementDailyUsage } from '../services/aiUsage.service.js';

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

    // Exclude answer and followUp (also select: false on schema) and explanation explicitly
    mongoQuery = mongoQuery
      .select('-explanation -answer -followUp -normalizedQuestion -__v')
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

    // Shape items ensuring no explanation, answer or followUp can ever leak
    const items = questions.map((item) => {
      const { answer: _ans, explanation: _exp, followUp: _fu, score: _score, ...cleanItem } = item;
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
      OS: 1,
      DSA: 2,
      OOP: 3,
      CPP: 4,
      DBMS: 5,
      SQL: 6,
      CN: 7,
      COA: 8,
      WEB: 9,
      SYSDESIGN: 10,
      APTITUDE: 11,
      HR: 12,
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
      .select('-explanation -answer -followUp -normalizedQuestion -__v')
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

    const { answer: _ans, explanation: _exp, followUp: _fu, ...cleanQuestion } = question;

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
        match: { reviewStatus: 'approved' },
        select: '-explanation -answer -followUp -normalizedQuestion -__v',
      })
      .lean();

    const items = states
      .filter((s) => s.questionId)
      .map((s) => {
        const q = s.questionId;
        const { answer: _ans, explanation: _exp, followUp: _fu, ...cleanQ } = q;
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
 * GET /api/v1/revision/count
 * Returns { due, upcoming } revision counts for current user.
 * Silently excludes any question that has become rejected or draft.
 */
export const getRevisionCount = async (req, res, next) => {
  try {
    const now = new Date();
    const result = await UserQuestionState.aggregate([
      {
        $match: {
          userId: req.user._id,
          nextReviewAt: { $ne: null },
        },
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      {
        $unwind: '$question',
      },
      {
        $match: {
          'question.reviewStatus': 'approved',
        },
      },
      {
        $facet: {
          due: [
            { $match: { nextReviewAt: { $lte: now } } },
            { $count: 'count' },
          ],
          upcoming: [
            { $match: { nextReviewAt: { $gt: now } } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const due = result[0]?.due[0]?.count || 0;
    const upcoming = result[0]?.upcoming[0]?.count || 0;

    return res.json({ due, upcoming });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/revision
 * Returns questions due for review (default, nextReviewAt <= now) or upcoming (scope=upcoming, nextReviewAt > now) for current user.
 * Silently drops any question that has become rejected or draft.
 * Answer, explanation, and followUp are strictly excluded.
 */
export const getRevisionQuestions = async (req, res, next) => {
  try {
    const now = new Date();
    const isUpcoming = req.query.scope === 'upcoming';
    const reviewFilter = isUpcoming
      ? { $gt: now, $ne: null }
      : { $lte: now };

    const states = await UserQuestionState.find({
      userId: req.user._id,
      nextReviewAt: reviewFilter,
    })
      .sort({ nextReviewAt: 1 })
      .populate({
        path: 'questionId',
        match: { reviewStatus: 'approved' },
        select: '-explanation -answer -followUp -normalizedQuestion -__v',
      })
      .lean();

    const items = states
      .filter((s) => s.questionId)
      .map((s) => {
        const q = s.questionId;
        const { answer: _ans, explanation: _exp, followUp: _fu, ...cleanQ } = q;
        return {
          ...cleanQ,
          box: s.box,
          nextReviewAt: s.nextReviewAt,
          timesSeen: s.timesSeen,
          lastRating: s.lastRating,
        };
      });

    return res.json({ items });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/questions/:id/revise-later
 * Saves a question for spaced revision review (due immediately).
 * Does NOT create an Attempt, does NOT update daily five, streak, or accuracy.
 * Preserves existing bookmark flag and Leitner box.
 */
export const reviseLaterQuestion = async (req, res, next) => {
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
    });

    if (!question) {
      return res.status(404).json({
        error: {
          code: 'QUESTION_NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    let state = await UserQuestionState.findOne({
      userId: req.user._id,
      questionId: question._id,
    });

    const now = new Date();

    if (!state) {
      state = new UserQuestionState({
        userId: req.user._id,
        questionId: question._id,
        bookmarked: false,
        timesSeen: 0,
        box: 0,
        nextReviewAt: now,
      });
    } else {
      // Set nextReviewAt = earlier of existing nextReviewAt and now (if no date or null, use now)
      if (!state.nextReviewAt || new Date(state.nextReviewAt).getTime() > now.getTime()) {
        state.nextReviewAt = now;
      }
    }

    await state.save();

    return res.json({
      success: true,
      message: 'Saved for revision',
      questionId: question._id,
      nextReviewAt: state.nextReviewAt,
      box: state.box,
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
      .select('+answer +followUp')
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

    if (question.followUp) {
      response.followUp = question.followUp;
    }

    if (question.type === 'coding_link') {
      response.link = question.link;
    }

    return res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Hook triggered when a daily challenge is completed (all 5 questions attempted).
 * Invokes updateStreakOnCompletion with today's and yesterday's dates in user's timezone.
 *
 * @param {Object} user - The authenticated user document
 * @param {Object} challenge - The completed DailyChallenge document
 * @returns {Promise<{ current: number, longest: number, lastCompletedDate: string, increased: boolean }>}
 */
export const onChallengeCompleted = async (user, _challenge) => {
  const todayKey = getTodayKey(user.timezone);
  const yesterdayKey = getYesterdayKey(user.timezone);
  return await updateStreakOnCompletion(user._id, todayKey, yesterdayKey);
};

/**
 * POST /api/v1/questions/:id/attempt
 * Records a user's attempt on a question (practice, study, or daily mode).
 * - For MCQ: selectedOption is required, isCorrect is computed on server,
 *   selfRating is derived from isCorrect (knew/missed) if not provided.
 * - For non-MCQ: selfRating is required.
 * - For mode "daily": validates challengeId, user ownership, today date, membership,
 *   and ensures question was not already completed.
 * - Saves Attempt document.
 * - Updates UserQuestionState revision rules.
 * - Returns { isCorrect (mcq only), answer, explanation, nextReviewAt, challengeCompleted, completedCount }
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
      .select('+answer +followUp')
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
      challengeId,
      selectedOption,
      selfRating,
      revealedFirst = false,
      timeSpentSec = 0,
    } = req.body;

    let dailyChallengeDoc = null;
    if (mode === 'daily') {
      if (!challengeId || !mongoose.Types.ObjectId.isValid(challengeId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid challengeId is required for daily mode',
          },
        });
      }

      dailyChallengeDoc = await DailyChallenge.findById(challengeId);
      if (!dailyChallengeDoc) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CHALLENGE',
            message: 'Daily challenge not found',
          },
        });
      }

      // Verify ownership
      if (dailyChallengeDoc.userId.toString() !== req.user._id.toString()) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CHALLENGE',
            message: 'Challenge does not belong to current user',
          },
        });
      }

      // Verify challenge is for today in the user's timezone
      const todayKey = getTodayKey(req.user.timezone);
      if (dailyChallengeDoc.date !== todayKey) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CHALLENGE',
            message: 'Daily challenge is not for today',
          },
        });
      }

      // Verify question is part of this challenge
      const containsQuestion = dailyChallengeDoc.questionIds.some(
        (qId) => qId.toString() === question._id.toString()
      );
      if (!containsQuestion) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CHALLENGE',
            message: 'Question is not part of this daily challenge',
          },
        });
      }

      // Verify question is not already completed
      const isAlreadyCompleted = dailyChallengeDoc.completedQuestionIds.some(
        (qId) => qId.toString() === question._id.toString()
      );
      if (isAlreadyCompleted) {
        return res.status(400).json({
          error: {
            code: 'ALREADY_COMPLETED',
            message: 'Question already completed in this challenge',
          },
        });
      }
    }

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
      challengeId: mode === 'daily' && dailyChallengeDoc ? dailyChallengeDoc._id : null,
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

    let challengeCompleted = false;
    let completedCount = 0;
    let streakResult = null;

    if (mode === 'daily' && dailyChallengeDoc) {
      const updatedChallenge = await DailyChallenge.findByIdAndUpdate(
        dailyChallengeDoc._id,
        { $addToSet: { completedQuestionIds: question._id } },
        { new: true }
      );

      completedCount = updatedChallenge.completedQuestionIds.length;
      let newlyCompleted = false;
      if (completedCount === 5 && !updatedChallenge.completed) {
        updatedChallenge.completed = true;
        await updatedChallenge.save();
        newlyCompleted = true;
      }

      challengeCompleted = updatedChallenge.completed;

      if (newlyCompleted) {
        streakResult = await onChallengeCompleted(req.user, updatedChallenge);
      }
    }

    const response = {
      ...(question.type === 'mcq' ? { isCorrect: computedIsCorrect } : {}),
      answer: question.answer,
      explanation: question.explanation,
      nextReviewAt: revisionState.nextReviewAt,
      challengeCompleted,
      completedCount,
    };

    if (question.followUp) {
      response.followUp = question.followUp;
    }

    if (challengeCompleted) {
      if (streakResult) {
        response.streak = {
          current: streakResult.current,
          longest: streakResult.longest,
          increased: streakResult.increased,
        };
      } else {
        const todayKey = getTodayKey(req.user.timezone);
        const yesterdayKey = getYesterdayKey(req.user.timezone);
        const effectiveStreak = getEffectiveStreak(req.user, todayKey, yesterdayKey);
        response.streak = {
          current: effectiveStreak.current,
          longest: effectiveStreak.longest,
          increased: false,
        };
      }
    }

    return res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/questions/:id/ai-feedback
 * Provides structured AI feedback on a student's typed answer for non-MCQ questions.
 *
 * Rules:
 * - 400 for invalid ObjectId
 * - 404 for question missing or reviewStatus !== 'approved'
 * - 400 if question type is 'mcq'
 * - 503 code AI_DISABLED if AI features are disabled/unconfigured
 * - Reference answer loaded with .select('+answer') on server only and NOT returned in response
 * - Daily limit enforced atomically via AiUsage collection; 429 if exceeded with remaining count
 * - Personal data (name, email, id) never sent to provider
 * - Logs only user id, question id, status, latency. Never logs answer text, prompt, output, or key.
 * - Handles provider timeouts (504 AI_TIMEOUT), network errors (502 AI_UNAVAILABLE) without leaking details
 */
export const getQuestionAiFeedback = async (req, res, next) => {
  const startTime = Date.now();
  const { id } = req.params;
  const { userAnswer } = req.body;

  // 1. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'Invalid question ID',
      },
    });
  }

  // 2. Check feature flag
  if (!isAiConfigured()) {
    return res.status(503).json({
      error: {
        code: 'AI_DISABLED',
        message: 'AI feedback is currently disabled',
      },
    });
  }

  try {
    // 3. Find question and load reference answer (server only)
    const question = await Question.findById(id).select('+answer');

    if (!question || question.reviewStatus !== 'approved') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    // 4. Reject MCQ questions
    if (question.type === 'mcq') {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUESTION_TYPE',
          message: 'AI feedback is not available for multiple choice questions',
        },
      });
    }

    // 5. Atomically check and increment daily usage
    const usage = await checkAndIncrementDailyUsage(req.user._id, req.user.timezone);
    if (!usage.allowed) {
      return res.status(429).json({
        error: {
          code: 'AI_DAILY_LIMIT_EXCEEDED',
          message: 'Daily AI feedback limit reached. Please try again tomorrow.',
          remainingToday: 0,
        },
      });
    }

    // 6. Generate AI feedback (retries once if output malformed)
    let feedback;
    try {
      feedback = await generateFeedback({
        question: question.question,
        referenceAnswer: question.answer,
        userAnswer,
      });
    } catch (aiErr) {
      const latency = Date.now() - startTime;
      const statusCode = aiErr.statusCode || (aiErr.code === 'AI_TIMEOUT' ? 504 : 502);
      console.log(
        `[AI Feedback] userId: ${req.user._id}, questionId: ${question._id}, status: ${statusCode}, latencyMs: ${latency}`
      );

      if (aiErr.code === 'AI_TIMEOUT') {
        return res.status(504).json({
          error: {
            code: 'AI_TIMEOUT',
            message: 'AI feedback request timed out. Please try again.',
          },
        });
      }

      return res.status(502).json({
        error: {
          code: aiErr.code || 'AI_UNAVAILABLE',
          message: 'AI feedback service is currently unavailable. Please try again later.',
        },
      });
    }

    const latency = Date.now() - startTime;
    console.log(
      `[AI Feedback] userId: ${req.user._id}, questionId: ${question._id}, status: 200, latencyMs: ${latency}`
    );

    // 7. Return feedback with remainingToday.
    // Crucial: do NOT return question.answer!
    return res.json({
      ...feedback,
      remainingToday: usage.remainingToday,
    });
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
  getRevisionQuestions,
  getRevisionCount,
  revealQuestion,
  attemptQuestion,
  onChallengeCompleted,
  getQuestionAiFeedback,
  reviseLaterQuestion,
};



