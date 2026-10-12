import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Load the current user profile on initial app load if a token exists
  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/users/me');
      setUser(response.data.user);
    } catch (error) {
      console.warn('Session expired or invalid token:', error.message);
      // Remove invalid token from storage
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Login handler
  const login = async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, token: authToken } = response.data;

    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser(loggedInUser);
    return response.data;
  };

  // Register handler
  const register = async ({ name, email, password, timezone }) => {
    const payload = { name, email, password };
    if (timezone) payload.timezone = timezone;

    const response = await api.post('/auth/register', payload);
    const { user: registeredUser, token: authToken } = response.data;

    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser(registeredUser);
    return response.data;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Update local user state after profile edit
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateUser,
    loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
