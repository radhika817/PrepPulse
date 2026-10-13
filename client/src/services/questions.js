import api from './api';

/**
 * Question Service
 * Handles all API calls related to questions, filters, search, and bookmarks.
 * Built with the shared Axios instance with automatic JWT Authorization header attachment.
 */

/**
 * Fetch paginated questions with optional search and filters.
 * @param {Object} params - { category, topic, difficulty, q, page, limit }
 * @returns {Promise<{ items: Array, page: number, limit: number, total: number, totalPages: number }>}
 */
export const getQuestions = async (params = {}) => {
  // Strip out empty string parameters so clean queries are sent to backend
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value;
    }
  });

  const response = await api.get('/questions', { params: cleanParams });
  return response.data;
};

/**
 * Fetch metadata for question filters (categories and their distinct topics).
 * @returns {Promise<{ categories: Array<{ category: string, topics: string[] }> }>}
 */
export const getQuestionsMeta = async () => {
  const response = await api.get('/questions/meta');
  return response.data;
};

/**
 * Fetch a single question by ID (excludes answer and explanation).
 * @param {string} id - Question ObjectId
 * @returns {Promise<Object>}
 */
export const getQuestionById = async (id) => {
  const response = await api.get(`/questions/${id}`);
  return response.data;
};

/**
 * Toggle bookmark status for a question.
 * @param {string} id - Question ObjectId
 * @returns {Promise<{ bookmarked: boolean }>}
 */
export const toggleBookmark = async (id) => {
  const response = await api.post(`/questions/${id}/bookmark`);
  return response.data;
};

/**
 * Fetch paginated bookmarked questions for the current user.
 * @param {Object} params - { page, limit }
 * @returns {Promise<{ items: Array, page: number, limit: number, total: number, totalPages: number }>}
 */
export const getBookmarks = async (params = {}) => {
  const cleanParams = {};
  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;

  const response = await api.get('/bookmarks', { params: cleanParams });
  return response.data;
};

/**
 * Reveal model answer and explanation for an approved question without saving an attempt.
 * @param {string} id - Question ObjectId
 * @returns {Promise<{ answer: string, explanation: string, link?: string }>}
 */
export const revealQuestion = async (id) => {
  const response = await api.post(`/questions/${id}/reveal`);
  return response.data;
};

/**
 * Submit an attempt or self-rating for a question.
 * @param {string} id - Question ObjectId
 * @param {Object} attemptData - { mode, selectedOption, selfRating, revealedFirst, timeSpentSec }
 * @returns {Promise<{ isCorrect?: boolean, answer: string, explanation: string, nextReviewAt: string | null }>}
 */
export const submitAttempt = async (id, attemptData) => {
  const response = await api.post(`/questions/${id}/attempt`, attemptData);
  return response.data;
};

export default {
  getQuestions,
  getQuestionsMeta,
  getQuestionById,
  toggleBookmark,
  getBookmarks,
  revealQuestion,
  submitAttempt,
};
