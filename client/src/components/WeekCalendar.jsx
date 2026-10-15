import { Check } from 'lucide-react';

/**
 * WeekCalendar Component
 * Renders the last 7 calendar days as small circles:
 * - Filled for completed days
 * - Outlined for missed / incomplete days
 * - Today highlighted with distinct indicator
 *
 * @param {Object} props
 * @param {Array<{ date: string, completed: boolean }>} [props.activity] - Array of last 7 days
 * @param {boolean} [props.loading] - Loading indicator
 */
export const WeekCalendar = ({ activity = [], loading = false }) => {
  if (loading) {
    return (
      <div
        id="week-calendar-loading"
        className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse"
      >
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-6 h-3 bg-slate-800 rounded" />
            <div className="w-8 h-8 rounded-full bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (!activity || activity.length === 0) {
    return null;
  }

  // Activity contains the last N days up to today (the last item is today)
  const todayIndex = activity.length - 1;

  const getWeekday = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    } catch {
      return '';
    }
  };

  const getDayOfMonth = (dateStr) => {
    const parts = dateStr.split('-');
    return parts[2] ? parseInt(parts[2], 10) : '';
  };

  return (
    <div
      id="week-calendar"
      className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-md backdrop-blur-sm space-y-3"
    >
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
          Last 7 Days Activity
        </span>
        <span className="text-[11px] text-slate-500">
          {activity.filter((d) => d.completed).length} of 7 days completed
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {activity.map((item, index) => {
          const isToday = index === todayIndex;
          const isCompleted = Boolean(item.completed);
          const weekday = getWeekday(item.date);
          const dayNum = getDayOfMonth(item.date);

          return (
            <div
              key={item.date}
              id={`calendar-day-${index}`}
              className="flex flex-col items-center gap-1.5 py-1 text-center"
            >
              {/* Weekday label */}
              <span
                className={`text-[10px] uppercase font-semibold ${
                  isToday ? 'text-indigo-400 font-bold' : 'text-slate-400'
                }`}
              >
                {weekday}
              </span>

              {/* Day Circle: Filled for completed, outlined for missed, highlighted for today */}
              <div
                title={`${item.date}: ${isCompleted ? 'Completed' : 'Missed'}${isToday ? ' (Today)' : ''}`}
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
                    : 'border-2 border-slate-700 bg-slate-950/40 text-slate-500'
                } ${
                  isToday
                    ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 font-bold'
                    : ''
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span className="text-xs font-mono">{dayNum}</span>
                )}

                {/* Small indicator pill for today */}
                {isToday && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400 ring-2 ring-slate-900" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekCalendar;
