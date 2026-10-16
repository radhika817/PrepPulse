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
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 animate-pulse text-xs"
      >
        <Flame className="w-4 h-4 text-slate-400" />
        <span className="w-6 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  if (hasError || !streakData) {
    return null;
  }

  const { current = 0, longest = 0, completedToday = false } = streakData;
  const isBroken = current === 0;

  const hintText = completedToday
    ? "Today's challenge completed! Great habit."
    : "Complete today's five to keep your streak";

  return (
    <div
      id="navbar-streak-badge"
      title={hintText}
      className={`group relative flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-default select-none ${
        isBroken
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          : completedToday
          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60 shadow-sm'
          : 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800/60 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-1">
        <Flame
          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
            isBroken
              ? 'text-slate-400 dark:text-slate-500'
              : completedToday
              ? 'text-amber-500 fill-amber-500'
              : 'text-orange-500 fill-orange-500'
          }`}
        />
        <span className="font-bold font-mono text-sm leading-none">{current}</span>
      </div>

      <span className="text-[11px] text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700/80 pl-1.5 font-normal">
        best: <span className="font-semibold text-slate-700 dark:text-slate-300">{longest}</span>
      </span>

      {/* Hint on hover */}
      {!completedToday && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 whitespace-nowrap px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg pointer-events-none">
          {hintText}
        </span>
      )}
    </div>
  );
};

export default StreakBadge;
