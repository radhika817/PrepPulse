import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Layers,
  BookOpen,
  Bookmark,
  RotateCcw,
  User,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getRevisionCount } from '../services/revision';
import StreakBadge from './StreakBadge';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [revisionDueCount, setRevisionDueCount] = useState(0);
  const lastFetchedRef = useRef(0);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch due revisions count if user is authenticated
  // Refreshes on mount, on focus/visibility (at most once every 60s), every 60s while open, and on revision-updated
  useEffect(() => {
    let isMounted = true;
    const THROTTLE_MS = 60000;

    const fetchDueCount = async (force = false) => {
      if (!isAuthenticated) {
        setRevisionDueCount(0);
        return;
      }

      const now = Date.now();
      if (!force && now - lastFetchedRef.current < THROTTLE_MS) {
        return;
      }
      lastFetchedRef.current = now;

      try {
        const res = await getRevisionCount();
        if (isMounted) {
          setRevisionDueCount(res?.due ?? 0);
        }
      } catch {
        // Silently ignore if offline or error
      }
    };

    fetchDueCount(true);

    // Refresh at most once every 60 seconds while open
    const intervalId = setInterval(() => {
      fetchDueCount(false);
    }, THROTTLE_MS);

    // Refresh when tab becomes visible again (throttled to at most once per 60s)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDueCount(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Immediate refresh on user actions
    const handleRevisionUpdated = () => {
      fetchDueCount(true);
    };
    window.addEventListener('revision-updated', handleRevisionUpdated);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('revision-updated', handleRevisionUpdated);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Compass },
    { to: '/daily', label: 'Daily', icon: Calendar },
    { to: '/questions', label: 'Questions', icon: Layers },
    { to: '/practice', label: 'Practice', icon: BookOpen },
    {
      to: '/revision',
      label: 'Revision',
      icon: RotateCcw,
      badge: revisionDueCount > 0 ? revisionDueCount : null,
    },
    { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    ...(user?.role === 'admin'
      ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Left: Brand Logo & Main Nav */}
          <div className="flex items-center gap-3 xl:gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white font-bold text-lg shadow-sm shadow-brand-600/30 group-hover:bg-brand-700 transition-all">
                🎯
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-50 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  PrepPulse
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-600 dark:text-brand-400 -mt-1">
                  Interview Prep
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0">
              {navLinks.map(({ to, label, icon: Icon, badge }) => {
                const isActive =
                  location.pathname === to ||
                  (to === '/admin' && location.pathname.startsWith('/admin'));
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`relative flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-xl text-sm font-medium transition-all shrink-0 ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 opacity-75 shrink-0" />
                    <span>{label}</span>
                    {badge !== null && badge !== undefined && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Streak, Theme Toggle, Auth, Mobile Menu button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Authenticated user items */}
            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <StreakBadge />
                <Link
                  to="/profile"
                  className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="max-w-[90px] md:max-w-[110px] truncate">{user.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 inline-flex items-center gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-sm transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-5 space-y-3">
          {isAuthenticated && user && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <StreakBadge />
              <Link
                to="/profile"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <User className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>{user.name}</span>
              </Link>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            {navLinks.map(({ to, label, icon: Icon, badge }) => {
              const isActive =
                location.pathname === to ||
                (to === '/admin' && location.pathname.startsWith('/admin'));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 opacity-75" />
                    <span>{label}</span>
                  </div>
                  {badge !== null && badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Link
                  to="/login"
                  className="flex items-center justify-center py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center py-2 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
