import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'preppulse_theme';

export const ThemeProvider = ({ children }) => {
  // Safe helper to read from localStorage
  const getSavedTheme = () => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (err) {
      console.warn('Unable to read theme preference from storage:', err);
      return null;
    }
  };

  // Safe helper to write to localStorage
  const saveTheme = (newTheme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('Unable to save theme preference to storage:', err);
    }
  };

  // Determine initial theme: saved choice or system preference
  const [theme, setThemeState] = useState(() => {
    const saved = getSavedTheme();
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Fallback
  });

  // Apply theme class to document root
  const applyThemeClass = useCallback((currentTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme, applyThemeClass]);

  // Listen for system theme changes if user hasn't explicitly set a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e) => {
      const saved = getSavedTheme();
      if (!saved) {
        const nextTheme = e.matches ? 'dark' : 'light';
        setThemeState(nextTheme);
        applyThemeClass(nextTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [applyThemeClass]);

  // Explicitly set theme and persist
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    applyThemeClass(newTheme);
  };

  // Toggle between dark and light
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const value = {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
