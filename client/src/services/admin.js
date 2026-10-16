import api from './api';

/**
 * Fetches questions for admin management with all hidden fields (answer, explanation, followUp).
 * Supports filters: reviewStatus, category, topic, difficulty, sourceType, q, page, limit.
 */
export const getAdminQuestions = async (params = {}) => {
  const response = await api.get('/admin/questions', { params });
  return response.data;
};

/**
 * Retrieves aggregate statistics across question review status, source types, and categories.
 */
export const getAdminQuestionStats = async () => {
  const response = await api.get('/admin/questions/stats');
  return response.data;
};

/**
 * Fetches single question by ID with all administrative fields and reviewer details.
 */
export const getAdminQuestionById = async (id) => {
  const response = await api.get(`/admin/questions/${id}`);
  return response.data;
};

/**
 * Creates a new question. Defaults to 'draft' reviewStatus unless explicitly set.
 */
export const createAdminQuestion = async (data) => {
  const response = await api.post('/admin/questions', data);
  return response.data;
};

/**
 * Updates an existing question's content and/or review status.
 */
export const updateAdminQuestion = async (id, data) => {
  const response = await api.patch(`/admin/questions/${id}`, data);
  return response.data;
};

/**
 * Bulk updates reviewStatus ('approved', 'rejected', 'draft') for up to 100 questions.
 */
export const bulkUpdateQuestionsStatus = async (ids, reviewStatus) => {
  const response = await api.post('/admin/questions/bulk-status', { ids, reviewStatus });
  return response.data;
};

/**
 * Batch imports up to 300 questions from JSON.
 * Skips normalized text duplicates and defaults imported questions to draft.
 */
export const importAdminQuestions = async (questions) => {
  const response = await api.post('/admin/questions/import', { questions });
  return response.data;
};

export default {
  getAdminQuestions,
  getAdminQuestionStats,
  getAdminQuestionById,
  createAdminQuestion,
  updateAdminQuestion,
  bulkUpdateQuestionsStatus,
  importAdminQuestions,
};
