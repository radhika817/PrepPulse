import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Layers,
  Award,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { getDaily } from '../services/daily';
import { getStreak } from '../services/streak';
import WeekCalendar from '../components/WeekCalendar';
import {
  Button,
  Card,
  Badge,
  ProgressBar,
  Skeleton,
} from '../components/ui';

/**
 * Daily Challenge Page
 * Displays today's 5-question personalized challenge.
 */
export const Daily = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInsufficient, setIsInsufficient] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [streakLoading, setStreakLoading] = useState(true);

  const fetchDailyChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsInsufficient(false);

      const data = await getDaily();
      setChallenge(data);
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
      if (err.response?.status === 409 || err.response?.data?.error?.code === 'INSUFFICIENT_QUESTIONS') {
        setIsInsufficient(true);
      } else {
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to load today’s challenge. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStreakData = useCallback(async () => {
    try {
      setStreakLoading(true);
      const data = await getStreak(7);
      setStreakData(data);
    } catch (err) {
      console.warn('Could not load streak data on Daily page:', err.message);
    } finally {
      setStreakLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyChallenge();
    fetchStreakData();

    const handleStreakUpdate = (e) => {
      if (e?.detail) {
        setStreakData((prev) => ({
          ...prev,
          current: e.detail.current,
          longest: e.detail.longest,
          completedToday: true,
        }));
      } else {
        fetchStreakData();
      }
    };

    window.addEventListener('streak-updated', handleStreakUpdate);
    return () => {
      window.removeEventListener('streak-updated', handleStreakUpdate);
    };
  }, [fetchStreakData]);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const firstUnfinishedQuestion = challenge?.questions?.find((q) => !q.isDone);
  const completedCount = challenge?.completedCount || 0;
  const totalQuestions = challenge?.questions?.length || 5;

  return (
    <div className="space-y-6">
      {/* Consistent Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Daily Challenge</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Five personalized questions refreshed daily at midnight.
          </p>
        </div>

        {challenge?.date && (
          <div
            id="daily-date-badge"
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>{challenge.date}</span>
          </div>
        )}
      </div>

      {/* State 1: Loading State */}
      {loading && (
        <div id="daily-loading-state" className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* State 2: 409 Insufficient Questions */}
      {!loading && isInsufficient && (
        <Card
          id="daily-insufficient-state"
          className="p-10 text-center space-y-4"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
              Not Enough Questions Yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              PrepPulse requires at least 5 approved questions in the question bank to generate a
              personalized daily challenge. Check back once more questions are approved.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/questions" id="browse-questions-link">
              <Button variant="primary" size="md">
                <span>Browse Question Bank</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* State 3: Generic Error State */}
      {!loading && !isInsufficient && error && (
        <Card
          id="daily-error-state"
          className="p-8 text-center space-y-4 border-rose-200 dark:border-rose-900/60"
        >
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              Unable to Load Challenge
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{error}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            id="retry-daily-btn"
            onClick={fetchDailyChallenge}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Try Again</span>
          </Button>
        </Card>
      )}

      {/* State 4: Challenge Loaded */}
      {!loading && !isInsufficient && !error && challenge && (
        <div className="space-y-6">
          {/* Progress Card & Action Banner */}
          <Card
            id="daily-progress-card"
            className="p-6 sm:p-7 space-y-5 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider block">
                  Today&apos;s Goal
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">
                  {formatDisplayDate(challenge.date)}
                </h2>
              </div>

              {/* Progress Count */}
              <div
                id="daily-progress-text"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                {completedCount} of {totalQuestions} done
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div id="daily-progress-bar">
                <ProgressBar
                  value={completedCount}
                  max={totalQuestions}
                  variant={completedCount === totalQuestions ? 'knew' : 'brand'}
                  size="md"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>0%</span>
                <span>{Math.round((completedCount / totalQuestions) * 100)}% completed</span>
                <span>100%</span>
              </div>
            </div>

            {/* Completion Banner or Start/Continue CTA */}
            {challenge.completed ? (
              ((location.state?.streak && location.state.streak.increased) ||
              (!location.state?.streak && streakData?.completedToday && (streakData?.current || 0) > 0)) ? (
                /* Celebration card on completion */
                <div
                  id="daily-streak-completion-card"
                  className="p-5 sm:p-6 rounded-xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-orange-950/40 border border-orange-200 dark:border-orange-800/80 flex items-center gap-4 text-orange-950 dark:text-orange-200 shadow-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Flame className="w-7 h-7 fill-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 font-extrabold text-[11px] tracking-wider uppercase border border-orange-300 dark:border-orange-700">
                        Streak Active!
                      </span>
                      <Sparkles className="w-4 h-4 text-orange-500" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      Day {location.state?.streak?.current ?? streakData?.current ?? 1}!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-orange-200/90 leading-relaxed">
                      You finished today&apos;s daily challenge and kept your streak alive. Great habit!
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  id="daily-completed-banner"
                  className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3.5 text-emerald-950 dark:text-emerald-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>All done for today!</span>
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-emerald-300/90 mt-0.5">
                      You have finished all 5 questions. Come back tomorrow for 5 fresh interview questions!
                    </p>
                  </div>
                </div>
              )
            ) : firstUnfinishedQuestion ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completedCount === 0
                    ? 'Start your 5-question sprint to keep your skills sharp.'
                    : `Pick up where you left off (${completedCount} of ${totalQuestions} completed).`}
                </p>

                <Link
                  to={`/practice/${firstUnfinishedQuestion._id}?daily=${challenge.challengeId}`}
                  id="start-continue-daily-btn"
                >
                  <Button variant="primary" size="md">
                    <span>{completedCount === 0 ? 'Start Challenge' : 'Continue Challenge'}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : null}
          </Card>

          {/* Week Calendar */}
          <WeekCalendar
            activity={streakData?.recentActivity || []}
            loading={streakLoading}
          />

          {/* Five Questions of the Day */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Questions of the Day</span>
            </h3>

            <div className="space-y-3" id="daily-questions-list">
              {challenge.questions?.map((q, index) => {
                const questionNumber = index + 1;
                return (
                  <Card
                    key={q._id}
                    id={`daily-question-card-${questionNumber}`}
                    className={`p-4 sm:p-5 transition-all ${
                      q.isDone
                        ? 'opacity-85 border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40'
                        : 'hover:border-brand-300 dark:hover:border-brand-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Index + Badges + Question */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                            Q{questionNumber}
                          </span>

                          <Badge variant="primary" size="sm">
                            {q.category}
                          </Badge>

                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                            {q.topic}
                          </span>

                          <Badge variant={q.difficulty?.toLowerCase() || 'default'} size="sm">
                            {q.difficulty}
                          </Badge>

                          <Badge variant="default" size="sm">
                            {q.type}
                          </Badge>
                        </div>

                        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug pt-1">
                          {q.question}
                        </h4>
                      </div>

                      {/* Right: Done/Pending badge & Action Link */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {q.isDone ? (
                          <div
                            id={`daily-q${questionNumber}-status-done`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </div>
                        ) : (
                          <div
                            id={`daily-q${questionNumber}-status-pending`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium"
                          >
                            <Circle className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </div>
                        )}

                        <Link
                          to={`/practice/${q._id}?daily=${challenge.challengeId}`}
                          id={`daily-practice-link-${questionNumber}`}
                          className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                            q.isDone
                              ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                              : 'text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
                          }`}
                        >
                          <span>{q.isDone ? 'Review' : 'Practice'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Daily;
