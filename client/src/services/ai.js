import api from './api';

/**
 * AI Service
 * Handles runtime feature flag checks and AI feedback requests.
 * Uses the shared Axios client with automatic Authorization header attachment.
 */

/**
 * Fetch enabled runtime feature flags from the backend.
 * @returns {Promise<{ aiFeedback: boolean }>}
 */
export const getFeatures = async () => {
  const response = await api.get('/features');
  return response.data;
};

/**
 * Request structured AI feedback on a student's typed answer for a question.
 * @param {string} questionId - Question ObjectId
 * @param {string} userAnswer - The student's typed response (20 to 2000 characters)
 * @returns {Promise<{
 *   suggestedRating: 'knew' | 'partly' | 'missed',
 *   summary: string,
 *   strengths: string[],
 *   missing: string[],
 *   improvedAnswer: string,
 *   referenceNote: string | null,
 *   remainingToday: number
 * }>}
 */
export const getAiFeedback = async (questionId, userAnswer) => {
  const response = await api.post(`/questions/${questionId}/ai-feedback`, {
    userAnswer,
  });
  return response.data;
};

export default {
  getFeatures,
  getAiFeedback,
};
