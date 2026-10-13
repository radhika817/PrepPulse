import api from './api';

/**
 * Daily Challenge Service
 * Fetches today's five-question daily challenge for the current user.
 *
 * @returns {Promise<{
 *   date: string,
 *   challengeId: string,
 *   completed: boolean,
 *   completedCount: number,
 *   questions: Array<{
 *     _id: string,
 *     category: string,
 *     topic: string,
 *     difficulty: string,
 *     type: string,
 *     question: string,
 *     options?: string[],
 *     link?: string,
 *     tags?: string[],
 *     isBookmarked: boolean,
 *     isDone: boolean
 *   }>
 * }>}
 */
export const getDaily = async () => {
  const response = await api.get('/daily');
  return response.data;
};

export default {
  getDaily,
};
