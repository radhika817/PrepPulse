import mongoose from 'mongoose';
import { DailyChallenge } from '../models/DailyChallenge.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { getWeakTopics } from './progress.service.js';
import { getTodayKey } from '../utils/date.util.js';

/**
 * Daily Challenge Service
 * Handles generation and retrieval of the daily five-question challenge
 * according to SYSTEM_DESIGN.md section 5.2.
 */

/**
 * Helper to pick diverse questions across categories and difficulties.
 * Groups questions by category and picks round-robin to ensure healthy subject diversity.
 *
 * @param {Array} questions - Pool of candidate question documents
 * @param {number} countNeeded - Number of questions to pick
 * @param {Set<string>} existingIds - Set of string IDs already selected
 * @returns {Array} Selected question documents
 */
const pickDiverseQuestions = (questions, countNeeded, existingIds) => {
  const selected = [];
  const candidates = questions.filter((q) => !existingIds.has(q._id.toString()));

  // Group candidate questions by category
  const byCategory = new Map();
  for (const q of candidates) {
    const cat = q.category || 'OTHER';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat).push(q);
  }

  const categories = Array.from(byCategory.keys());
  let catIndex = 0;

  // Round-robin selection across categories
  while (selected.length < countNeeded && candidates.length > selected.length) {
    let pickedInCycle = false;
    for (let i = 0; i < categories.length && selected.length < countNeeded; i++) {
      const currentCat = categories[(catIndex + i) % categories.length];
      const list = byCategory.get(currentCat);
      if (list && list.length > 0) {
        const item = list.shift();
        selected.push(item);
        existingIds.add(item._id.toString());
        pickedInCycle = true;
      }
    }
    catIndex++;
    if (!pickedInCycle) break;
  }

  return selected;
};

/**
 * Gets or creates today's five-question daily challenge for the given user.
 *
 * Flow (SYSTEM_DESIGN.md section 5.2):
 * 1. Compute today's date in user's time zone (YYYY-MM-DD).
 * 2. If a challenge already exists for (userId, today), return it.
 * 3. Verify at least 5 approved questions exist overall (return 409 if < 5).
 * 4. Pick up to 2 questions from the user's weakest topics (preferring unseen questions).
 * 5. Pick remaining questions from the general pool (preferring unseen questions, mixed categories/difficulty).
 * 6. If the pool runs short, fill with least recently seen questions.
 * 7. Save and return the DailyChallenge document (handling race conditions gracefully).
 *
 * @param {Object} user - User document or object with _id and timezone
 * @returns {Promise<Document>} DailyChallenge document
 */
export const getOrCreateTodayChallenge = async (user) => {
  const userId = user._id;
  const today = getTodayKey(user.timezone);

  // 1. Check if challenge already exists for today
  let challenge = await DailyChallenge.findOne({
    userId,
    date: today,
  });

  if (challenge) {
    return challenge;
  }

  // 2. Check total approved questions in bank (must have at least 5)
  const totalApproved = await Question.countDocuments({ reviewStatus: 'approved' });
  if (totalApproved < 5) {
    const error = new Error('Insufficient approved questions available to generate a daily challenge');
    error.statusCode = 409;
    error.code = 'INSUFFICIENT_QUESTIONS';
    throw error;
  }

  // 3. Find all questions user has attempted to identify unseen vs least recently seen
  const userAttempts = await Attempt.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(String(userId)),
      },
    },
    {
      $group: {
        _id: '$questionId',
        lastAttemptAt: { $max: '$createdAt' },
      },
    },
    {
      $sort: { lastAttemptAt: 1 }, // Oldest attempt first (least recently seen)
    },
  ]);

  const attemptedMap = new Map(
    userAttempts.map((a) => [a._id.toString(), a.lastAttemptAt])
  );
  const attemptedIdStrings = Array.from(attemptedMap.keys());
  const attemptedObjectIds = attemptedIdStrings.map((id) => new mongoose.Types.ObjectId(id));

  const selectedQuestions = [];
  const selectedIds = new Set();

  // 4. Up to 2 questions from weakest topics
  const weakTopics = await getWeakTopics(userId, 2);
  for (const wt of weakTopics) {
    if (selectedQuestions.length >= 2) break;

    // First try unseen questions for this weak topic
    let topicQuestion = await Question.findOne({
      reviewStatus: 'approved',
      category: wt.category,
      topic: wt.topic,
      _id: {
        $nin: [...Array.from(selectedIds).map((id) => new mongoose.Types.ObjectId(id)), ...attemptedObjectIds],
      },
    });

    // If no unseen question exists for this topic, pick any approved question from this topic not yet selected
    if (!topicQuestion) {
      topicQuestion = await Question.findOne({
        reviewStatus: 'approved',
        category: wt.category,
        topic: wt.topic,
        _id: {
          $nin: Array.from(selectedIds).map((id) => new mongoose.Types.ObjectId(id)),
        },
      });
    }

    if (topicQuestion && !selectedIds.has(topicQuestion._id.toString())) {
      selectedQuestions.push(topicQuestion);
      selectedIds.add(topicQuestion._id.toString());
    }
  }

  // 5. Fill remaining from general pool: unseen approved questions first
  const remainingNeeded = 5 - selectedQuestions.length;
  if (remainingNeeded > 0) {
    const unseenCandidates = await Question.find({
      reviewStatus: 'approved',
      _id: {
        $nin: [...Array.from(selectedIds).map((id) => new mongoose.Types.ObjectId(id)), ...attemptedObjectIds],
      },
    }).lean();

    const pickedUnseen = pickDiverseQuestions(unseenCandidates, remainingNeeded, selectedIds);
    selectedQuestions.push(...pickedUnseen);
  }

  // 6. If still short of 5, fill with least recently seen questions
  if (selectedQuestions.length < 5) {
    const stillNeeded = 5 - selectedQuestions.length;

    // Candidate seen questions sorted by oldest attempt timestamp
    const seenCandidates = [];
    for (const attempted of userAttempts) {
      const qIdStr = attempted._id.toString();
      if (!selectedIds.has(qIdStr)) {
        const qDoc = await Question.findOne({
          _id: attempted._id,
          reviewStatus: 'approved',
        }).lean();
        if (qDoc) {
          seenCandidates.push(qDoc);
          selectedIds.add(qIdStr);
          if (seenCandidates.length >= stillNeeded) break;
        }
      }
    }
    selectedQuestions.push(...seenCandidates);
  }

  // 7. Final fallback: any remaining approved questions not yet in set
  if (selectedQuestions.length < 5) {
    const finalNeeded = 5 - selectedQuestions.length;
    const finalFallbacks = await Question.find({
      reviewStatus: 'approved',
      _id: {
        $nin: Array.from(selectedIds).map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .limit(finalNeeded)
      .lean();

    for (const q of finalFallbacks) {
      selectedQuestions.push(q);
      selectedIds.add(q._id.toString());
    }
  }

  if (selectedQuestions.length < 5) {
    const error = new Error('Insufficient approved questions available to generate a daily challenge');
    error.statusCode = 409;
    error.code = 'INSUFFICIENT_QUESTIONS';
    throw error;
  }

  const finalQuestionIds = selectedQuestions.slice(0, 5).map((q) => q._id);

  // 8. Save DailyChallenge document, handling unique race condition
  try {
    challenge = await DailyChallenge.create({
      userId,
      date: today,
      questionIds: finalQuestionIds,
      completedQuestionIds: [],
      completed: false,
    });
    return challenge;
  } catch (err) {
    // Duplicate key error (E11000) on { userId, date } race
    if (err.code === 11000) {
      challenge = await DailyChallenge.findOne({
        userId,
        date: today,
      });
      if (challenge) {
        return challenge;
      }
    }
    throw err;
  }
};

export default {
  getOrCreateTodayChallenge,
};
