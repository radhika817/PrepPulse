import { Check } from 'lucide-react';
import { Card } from './ui';

/**
 * WeekCalendar Component
 * Renders the last 7 calendar days as small circles:
 * - Filled for completed days with streak orange accent
 * - Outlined for missed / incomplete days
 * - Today highlighted with distinct indicator ring
 */
export const WeekCalendar = ({ activity = [], loading = false }) => {
  if (loading) {
    return (
      <Card
        id="week-calendar-loading"
        className="flex items-center justify-between gap-2 p-4 animate-pulse"
      >
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-7 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </Card>
    );
  }

  if (!activity || activity.length === 0) {
    return null;
  }

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
    <Card
      id="week-calendar"
      className="p-5 space-y-3 shadow-sm"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Last 7 Days Activity
        </span>
        <span className="text-slate-600 dark:text-slate-400 font-medium">
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
                className={`text-[11px] uppercase font-semibold ${
                  isToday
                    ? 'text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {weekday}
              </span>

              {/* Day Circle */}
              <div
                title={`${item.date}: ${isCompleted ? 'Completed' : 'Missed'}${isToday ? ' (Today)' : ''}`}
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-orange-500 text-white shadow-sm font-bold'
                    : 'border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                } ${
                  isToday
                    ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 font-bold'
                    : ''
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span className="text-xs font-mono">{dayNum}</span>
                )}

                {/* Small indicator dot for today */}
                {isToday && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WeekCalendar;
