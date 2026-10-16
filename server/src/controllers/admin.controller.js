import mongoose from 'mongoose';
import { z } from 'zod';
import { Question } from '../models/Question.js';

export const VALID_CATEGORIES = [
  'OS',
  'DSA',
  'OOP',
  'CPP',
  'DBMS',
  'SQL',
  'CN',
  'COA',
  'WEB',
  'SYSDESIGN',
  'APTITUDE',
  'HR',
];

export const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
export const VALID_REVIEW_STATUSES = ['draft', 'approved', 'rejected'];
export const VALID_SOURCE_TYPES = ['own', 'ai_draft', 'licensed'];

/**
 * Validation schema for creating a question via admin API
 */
export const adminCreateQuestionSchema = z
  .object({
    category: z.enum(VALID_CATEGORIES),
    topic: z.string({ required_error: 'Topic is required' }).trim().min(1, 'Topic cannot be empty'),
    difficulty: z.enum(VALID_DIFFICULTIES),
    type: z.enum(['mcq', 'short', 'coding_link', 'hr']),
    question: z
      .string({ required_error: 'Question is required' })
      .trim()
      .min(5, 'Question text must be at least 5 characters long'),
    options: z.array(z.string().trim()).default([]),
    answer: z
      .string({ required_error: 'Answer is required' })
      .trim()
      .min(1, 'Answer cannot be empty'),
    explanation: z.string().trim().optional().default(''),
    followUp: z.string().trim().optional().nullable(),
    link: z.string().url('Link must be a valid URL').nullable().optional().default(null),
    tags: z.array(z.string().trim()).default([]),
    sourceType: z.enum(VALID_SOURCE_TYPES).default('own'),
    sourceNote: z.string().default(''),
    reviewStatus: z.enum(VALID_REVIEW_STATUSES).default('draft'),
    companyTags: z.array(z.string().trim()).default([]),
  })
  .strict()
  .refine(
    (data) => {
      if (data.type === 'mcq') {
        return Array.isArray(data.options) && data.options.length >= 2;
      }
      return true;
    },
    {
      message: 'MCQ questions must provide at least 2 options',
      path: ['options'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'mcq') {
        return data.options.some(
          (opt) => opt.trim().toLowerCase() === data.answer.trim().toLowerCase()
        );
      }
      return true;
    },
    {
      message: 'The correct answer must be one of the provided options for MCQ',
      path: ['answer'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'coding_link') {
        return !!data.link;
      }
      return true;
    },
    {
      message: 'A valid link is required for coding_link question type',
      path: ['link'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'mcq') {
        return typeof data.explanation === 'string' && data.explanation.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Explanation is required for MCQ questions',
      path: ['explanation'],
    }
  );

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

/**
 * Normalizes question text for reliable duplicate detection.
 */
export const normalizeQuestionText = (text) => {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * POST /api/v1/admin/questions
 * Creates a new question. Default reviewStatus is "draft" unless explicitly set.
 * Rejects duplicates with 409 DUPLICATE_QUESTION.
 */
export const createAdminQuestion = async (req, res, next) => {
  try {
    const normalizedQuestion = normalizeQuestionText(req.body.question);

    // Duplicate check matching normalized text
    const duplicate = await Question.findOne({ normalizedQuestion });
    if (duplicate) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_QUESTION',
          message: 'A question with identical or equivalent text already exists',
        },
      });
    }

    const reviewStatus = req.body.reviewStatus || 'draft';
    const isReviewed = reviewStatus === 'approved' || reviewStatus === 'rejected';

    const questionData = {
      ...req.body,
      normalizedQuestion,
      reviewStatus,
      reviewedBy: isReviewed ? req.user._id : null,
      reviewedAt: isReviewed ? new Date() : null,
    };

    const newQuestion = await Question.create(questionData);
    const populated = await Question.findById(newQuestion._id)
      .select('+answer +followUp')
      .populate('reviewedBy', 'name email role')
      .lean();

    return res.status(201).json({ question: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/questions/:id
 * Updates fields of an existing question.
 * Re-checks duplicates if question text is updated.
 * Automatically records reviewedBy and reviewedAt when reviewStatus changes.
 */
export const updateAdminQuestion = async (req, res, next) => {
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

    const question = await Question.findById(id).select('+answer +followUp');
    if (!question) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    // Duplicate check if question text is changing
    if (req.body.question && req.body.question.trim() !== question.question.trim()) {
      const newNormalized = normalizeQuestionText(req.body.question);
      const duplicate = await Question.findOne({
        normalizedQuestion: newNormalized,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_QUESTION',
            message: 'A question with identical or equivalent text already exists',
          },
        });
      }
      question.normalizedQuestion = newNormalized;
    }

    // Verify consistency of merged data for MCQ and coding_link rules
    const effectiveType = req.body.type || question.type;
    const effectiveOptions = req.body.options !== undefined ? req.body.options : question.options;
    const effectiveAnswer = req.body.answer !== undefined ? req.body.answer : question.answer;
    const effectiveExplanation =
      req.body.explanation !== undefined ? req.body.explanation : question.explanation;
    const effectiveLink = req.body.link !== undefined ? req.body.link : question.link;

    if (effectiveType === 'mcq') {
      if (!Array.isArray(effectiveOptions) || effectiveOptions.length < 2) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'MCQ questions must provide at least 2 options',
          },
        });
      }
      const answerMatchesOption = effectiveOptions.some(
        (opt) => opt.trim().toLowerCase() === effectiveAnswer.trim().toLowerCase()
      );
      if (!answerMatchesOption) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The correct answer must be one of the provided options for MCQ',
          },
        });
      }
      if (typeof effectiveExplanation !== 'string' || effectiveExplanation.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Explanation is required for MCQ questions',
          },
        });
      }
    }

    if (effectiveType === 'coding_link' && !effectiveLink) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid link is required for coding_link question type',
        },
      });
    }

    // Record reviewer audit trail when reviewStatus changes
    if (req.body.reviewStatus && req.body.reviewStatus !== question.reviewStatus) {
      question.reviewedBy = req.user._id;
      question.reviewedAt = new Date();
    }

    // Apply allowed body field updates
    const updateKeys = [
      'category',
      'topic',
      'difficulty',
      'type',
      'question',
      'options',
      'answer',
      'explanation',
      'followUp',
      'link',
      'tags',
      'sourceType',
      'sourceNote',
      'reviewStatus',
      'companyTags',
    ];

    updateKeys.forEach((key) => {
      if (req.body[key] !== undefined) {
        question[key] = req.body[key];
      }
    });

    await question.save();

    const updated = await Question.findById(id)
      .select('+answer +followUp')
      .populate('reviewedBy', 'name email role')
      .lean();

    return res.json({ question: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/questions/bulk-status
 * Bulk update reviewStatus (draft, approved, rejected) for up to 100 questions at once.
 * Records reviewedBy and reviewedAt for all updated documents.
 */
export const bulkUpdateQuestionsStatus = async (req, res, next) => {
  try {
    const { ids, reviewStatus } = req.body;

    const result = await Question.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          reviewStatus,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      }
    );

    return res.json({
      message: `Successfully updated ${result.modifiedCount} questions to ${reviewStatus}`,
      count: result.modifiedCount,
      reviewStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/questions/import
 * Batch imports up to 300 questions.
 * Validates each item with Zod schema, skips duplicates by normalized text,
 * forces reviewStatus to "draft", and returns summary without failing the batch.
 */
export const importAdminQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;

    const invalid = [];
    const toInsert = [];
    let skippedDuplicates = 0;
    const seenNormalized = new Set();

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      const validation = adminCreateQuestionSchema.safeParse(item);

      if (!validation.success) {
        const errors = validation.error.issues.map(
          (issue) => `${issue.path.length > 0 ? issue.path.join('.') + ': ' : ''}${issue.message}`
        );
        invalid.push({ index: i, errors });
        continue;
      }

      const validData = validation.data;
      const normalized = normalizeQuestionText(validData.question);

      if (seenNormalized.has(normalized)) {
        skippedDuplicates++;
        continue;
      }

      const existingInDb = await Question.findOne({ normalizedQuestion: normalized });
      if (existingInDb) {
        seenNormalized.add(normalized);
        skippedDuplicates++;
        continue;
      }

      seenNormalized.add(normalized);
      toInsert.push({
        ...validData,
        normalizedQuestion: normalized,
        reviewStatus: 'draft',
        reviewedBy: null,
        reviewedAt: null,
      });
    }

    if (toInsert.length > 0) {
      await Question.insertMany(toInsert);
    }

    return res.json({
      inserted: toInsert.length,
      skippedDuplicates,
      invalid,
    });
  } catch (error) {
    next(error);
  }
};



