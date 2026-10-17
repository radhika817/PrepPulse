import api from './api';

/**
 * Revision Queue Service
 * Handles spaced repetition revision queries and scheduling.
 */

/**
 * Schedules a question for revision without creating an Attempt document
 * or affecting streak or daily challenge progress.
 * Dispatches a 'revision-updated' window event to keep due badges synchronized.
 *
 * @param {string} questionId - ID of the question to revise later
 * @returns {Promise<{ success: boolean, message: string, questionId: string, nextReviewAt: string, box: number }>}
 */
export const reviseLater = async (questionId) => {
  const response = await api.post(`/questions/${questionId}/revise-later`);
  window.dispatchEvent(new CustomEvent('revision-updated'));
  return response.data;
};

/**
 * Fetches questions in the user's revision queue.
 *
 * @param {'due' | 'upcoming'} [scope='due'] - Filter by due questions (default) or upcoming
 * @returns {Promise<{ items: Array<any> }>}
 */
export const getRevisionQuestions = async (scope = 'due') => {
  const response = await api.get('/revision', {
    params: { scope },
  });
  return response.data;
};

export default {
  reviseLater,
  getRevisionQuestions,
};
