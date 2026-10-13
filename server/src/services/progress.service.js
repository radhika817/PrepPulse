import mongoose from 'mongoose';
import { Attempt } from '../models/Attempt.js';

/**
 * Progress & Weak Topics Service
 * Aggregates user attempts to compute topic accuracy and identify weak topics
 * for the daily challenge (SYSTEM_DESIGN.md section 5.4) and progress dashboard.
 */

/**
 * Calculates topic accuracy for a user across all attempts, EXCLUDING attempts
 * where revealedFirst is true.
 *
 * Scoring rules:
 * - MCQ correct = 1, wrong = 0
 * - knew = 1, partly = 0.5, missed = 0
 * Topic accuracy = sum(score) / number of attempts
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Array<{ category: string, topic: string, attempts: number, accuracy: number }>>}
 */
export const getTopicAccuracy = async (userId) => {
  const userObjectId =
    userId instanceof mongoose.Types.ObjectId
      ? userId
      : new mongoose.Types.ObjectId(String(userId));

  const results = await Attempt.aggregate([
    // 1. Filter user's attempts excluding revealedFirst attempts
    {
      $match: {
        userId: userObjectId,
        revealedFirst: { $ne: true },
      },
    },
    // 2. Join with questions collection to retrieve category and topic
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
    // 3. Compute score per attempt
    {
      $addFields: {
        score: {
          $cond: [
            { $ne: ['$isCorrect', null] },
            { $cond: ['$isCorrect', 1, 0] },
            {
              $switch: {
                branches: [
                  { case: { $eq: ['$selfRating', 'knew'] }, then: 1 },
                  { case: { $eq: ['$selfRating', 'partly'] }, then: 0.5 },
                  { case: { $eq: ['$selfRating', 'missed'] }, then: 0 },
                ],
                default: 0,
              },
            },
          ],
        },
      },
    },
    // 4. Group by category and topic
    {
      $group: {
        _id: {
          category: '$question.category',
          topic: '$question.topic',
        },
        attempts: { $sum: 1 },
        totalScore: { $sum: '$score' },
      },
    },
    // 5. Shape output and calculate accuracy ratio
    {
      $project: {
        _id: 0,
        category: '$_id.category',
        topic: '$_id.topic',
        attempts: '$attempts',
        accuracy: {
          $round: [{ $divide: ['$totalScore', '$attempts'] }, 4],
        },
      },
    },
    // 6. Sort lowest accuracy first, then highest attempts
    {
      $sort: {
        accuracy: 1,
        attempts: -1,
      },
    },
  ]);

  return results;
};

/**
 * Returns weak topics for a user.
 * A topic is weak when it has at least 5 attempts and accuracy strictly below 60% (0.6).
 * Topics are sorted by lowest accuracy first.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {number} [limit] - Maximum number of weak topics to return (e.g. 2 for daily challenge)
 * @returns {Promise<Array<{ category: string, topic: string, attempts: number, accuracy: number }>>}
 */
export const getWeakTopics = async (userId, limit) => {
  const allTopicStats = await getTopicAccuracy(userId);

  // Filter topics with >= 5 attempts and accuracy < 0.6
  const weakTopics = allTopicStats.filter(
    (item) => item.attempts >= 5 && item.accuracy < 0.6
  );

  if (typeof limit === 'number' && limit > 0) {
    return weakTopics.slice(0, limit);
  }

  return weakTopics;
};

export default {
  getTopicAccuracy,
  getWeakTopics,
};
