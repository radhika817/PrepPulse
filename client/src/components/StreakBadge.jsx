import { useState, useEffect, useCallback } from 'react';
import { Flame } from 'lucide-react';
import { getStreak } from '../services/streak';

/**
 * StreakBadge Component
 * Displays the flame icon, current streak count, and personal best.
 * Follows DESIGN.md tokens: accent orange flame, 12px radius, WCAG AA contrast.
 */
export const StreakBadge = () => {
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchStreak = useCallback(async () => {
    try {
      setHasError(false);
      const data = await getStreak(7);
      setStreakData(data);
    } catch (err) {
      console.warn('Could not load streak badge:', err.message);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreak();

    const handleStreakUpdate = (e) => {
      if (e?.detail) {
        setStreakData((prev) => ({
          ...prev,
          current: e.detail.current,
          longest: e.detail.longest,
          completedToday: true,
        }));
      } else {
        fetchStreak();
      }
    };

    window.addEventListener('streak-updated', handleStreakUpdate);
    return () => {
      window.removeEventListener('streak-updated', handleStreakUpdate);
    };
  }, [fetchStreak]);

  if (loading) {
    return (
      <div
        id="navbar-streak-badge-loading"
        role="status"
        aria-label="Loading streak"
        className="h-9 px-3 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 flex items-center gap-2 whitespace-nowrap select-none animate-pulse text-sm font-semibold"
      >
        <Flame className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
        <span className="tabular-nums font-semibold">–</span>
        <span className="hidden md:inline">day streak</span>
      </div>
    );
  }

  if (hasError || !streakData) {
    return null;
  }

  const { current = 0, longest = 0 } = streakData;

  const getBadgeStyles = () => {
    if (current === 0) {
      return {
        pill: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        flame: 'text-slate-400 dark:text-slate-500',
      };
    }
    if (current >= 7) {
      return {
        pill: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700/70 shadow-sm',
        flame: 'text-orange-600 fill-orange-600 dark:text-orange-400 dark:fill-orange-400',
      };
    }
    return {
      pill: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 shadow-sm',
      flame: 'text-orange-500 fill-orange-500 dark:text-orange-400 dark:fill-orange-400',
    };
  };

  const { pill: pillColor, flame: flameColor } = getBadgeStyles();
  const tooltipText = `Longest streak: ${longest} ${longest === 1 ? 'day' : 'days'}`;

  return (
    <div
      id="navbar-streak-badge"
      title={tooltipText}
      aria-label={`Current streak: ${current} ${current === 1 ? 'day' : 'days'}, longest ${longest} ${longest === 1 ? 'day' : 'days'}`}
      className={`group relative h-9 px-3 rounded-full text-sm font-semibold border flex items-center gap-2 whitespace-nowrap select-none cursor-default transition-all ${pillColor}`}
    >
      <Flame
        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${flameColor}`}
      />
      <span className="tabular-nums font-semibold">{current}</span>
      <span className="hidden md:inline">day streak</span>

      {/* Tooltip on hover */}
      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 whitespace-nowrap px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg pointer-events-none">
        {tooltipText}
      </span>
    </div>
  );
};

export default StreakBadge;
