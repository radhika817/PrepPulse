import axios from 'axios';

/**
 * Shared Axios instance configured with base URL and interceptors.
 * Base URL defaults to VITE_API_URL environment variable or local backend fallback.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach auth token if available in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract error messages consistently
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = error.response?.data?.error?.message;
    if (customMessage) {
      error.message = customMessage;
    }
    return Promise.reject(error);
  }
);

/**
 * Health check helper to test connectivity to the Express backend.
 */
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
