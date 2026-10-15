import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Layers,
  BookOpen,
  Bookmark,
  RotateCcw,
  User,
  Activity,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import useHealth from '../hooks/useHealth';
import { useAuth } from '../context/AuthContext';
import StreakBadge from './StreakBadge';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status } = useHealth();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Compass },
    { to: '/daily', label: 'Daily', icon: Calendar },
    { to: '/questions', label: 'Questions', icon: Layers },
    { to: '/practice', label: 'Practice', icon: BookOpen },
    { to: '/revision', label: 'Revision', icon: RotateCcw },
    { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 text-white font-bold text-lg group-hover:scale-105 transition-transform">
                🎯
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                  PrepPulse
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400 -mt-1">
                  Interview Prep
                </span>
              </div>
            </Link>

            {/* Navigation links (accessible to all or highlighted) */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 opacity-70" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side controls: Health pill + Auth states */}
          <div className="flex items-center gap-3">
            {/* Backend Health Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                status === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : status === 'checking'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
              title={`API Health: ${status}`}
            >
              {status === 'ok' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : status === 'checking' ? (
                <Activity className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>API {status === 'ok' ? 'Online' : status === 'checking' ? 'Connecting...' : 'Offline'}</span>
            </div>

            {/* Auth Condition: Logged in vs Logged out */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5">
                <StreakBadge />
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02]"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
