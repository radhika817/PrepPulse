import api from './api';

/**
 * Fetches user streak details and recent calendar activity.
 *
 * @param {number} [days=28] - Number of days of activity (between 7 and 90)
 * @returns {Promise<{ current: number, longest: number, lastCompletedDate: string|null, completedToday: boolean, recentActivity: Array<{ date: string, completed: boolean }> }>}
 */
export const getStreak = async (days = 28) => {
  const response = await api.get('/streak', {
    params: { days },
  });
  return response.data;
};

export default {
  getStreak,
};
