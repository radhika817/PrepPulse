import { useState, useEffect, useCallback } from 'react';
import { Flame } from 'lucide-react';
import { getStreak } from '../services/streak';

/**
 * StreakBadge Component
 * Displays flame icon, current streak, and "best: N" in the navbar.
 * - Shows 0 when streak is broken
 * - Displays a gentle reminder hint when today's five are not yet completed
 * - Listens for 'streak-updated' events so it updates immediately when challenge is completed
 * - Graceful degradation: never blocks page if the request fails
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
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/40 border border-slate-700/40 text-slate-500 animate-pulse text-xs"
      >
        <Flame className="w-4 h-4 text-slate-500" />
        <span className="w-6 h-3 bg-slate-700/60 rounded" />
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
      className={`group relative flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-default ${
        isBroken
          ? 'bg-slate-800/40 text-slate-400 border-slate-700/60'
          : completedToday
          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          : 'bg-orange-500/10 text-orange-300 border-orange-500/30'
      }`}
    >
      <div className="flex items-center gap-1">
        <Flame
          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
            isBroken
              ? 'text-slate-500'
              : completedToday
              ? 'text-amber-400 fill-amber-400'
              : 'text-orange-400 fill-orange-400'
          }`}
        />
        <span className="font-bold font-mono text-sm leading-none">{current}</span>
      </div>

      <span className="text-[10px] text-slate-400 border-l border-slate-700/80 pl-1.5 font-normal">
        best: <span className="font-semibold text-slate-300">{longest}</span>
      </span>

      {/* Gentle hint on hover when today is incomplete */}
      {!completedToday && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 whitespace-nowrap px-2.5 py-1 text-[11px] font-medium text-amber-200 bg-slate-900 border border-amber-500/30 rounded-lg shadow-xl pointer-events-none">
          {hintText}
        </span>
      )}
    </div>
  );
};

export default StreakBadge;
