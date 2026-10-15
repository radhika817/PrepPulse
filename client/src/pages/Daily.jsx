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
  Loader2,
  Layers,
  Award,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { getDaily } from '../services/daily';
import { getStreak } from '../services/streak';
import WeekCalendar from '../components/WeekCalendar';

/**
 * Daily Challenge Page
 * Displays today's 5-question personalized challenge.
 *
 * Features:
 * - Shows today's date and progress (e.g., "3 of 5 done") with a visual progress bar
 * - Displays the 5 questions as cards indicating whether each is done or pending
 * - "Start" or "Continue" action button targeting the first unfinished question
 * - "All done for today" completion banner once all 5 questions are attempted
 * - Handles loading, standard errors, and 409 "not enough questions yet" states
 * - Renders WeekCalendar with 7-day activity circles
 * - Displays streak completion card with Day count when today's fifth question is completed
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
      // Check for 409 Conflict indicating fewer than 5 approved questions exist
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

  // Format the ISO date string "YYYY-MM-DD" into a friendly readable date
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

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  // Find the first unfinished question for the Start/Continue button
  const firstUnfinishedQuestion = challenge?.questions?.find((q) => !q.isDone);
  const completedCount = challenge?.completedCount || 0;
  const totalQuestions = challenge?.questions?.length || 5;
  const progressPercent = Math.min(100, Math.round((completedCount / totalQuestions) * 100));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <span>Daily Challenge</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Five personalized questions refreshed daily at midnight.
          </p>
        </div>

        {challenge?.date && (
          <div
            id="daily-date-badge"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2 shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{challenge.date}</span>
          </div>
        )}
      </div>

      {/* State 1: Loading Spinner */}
      {loading && (
        <div
          id="daily-loading-state"
          className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 rounded-2xl bg-slate-900/30 border border-slate-800/60"
        >
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Loading today’s challenge...</p>
        </div>
      )}

      {/* State 2: 409 Not Enough Questions Yet */}
      {!loading && isInsufficient && (
        <div
          id="daily-insufficient-state"
          className="p-10 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-4"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-white">Not Enough Questions Yet</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              PrepPulse requires at least 5 approved questions in the question bank to generate a
              personalized daily challenge. Check back once more questions are approved.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/questions"
              id="browse-questions-link"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
            >
              <span>Browse Question Bank</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* State 3: Generic Error State */}
      {!loading && !isInsufficient && error && (
        <div
          id="daily-error-state"
          className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4"
        >
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-rose-200">Unable to Load Challenge</h2>
            <p className="text-xs text-rose-300 max-w-sm mx-auto">{error}</p>
          </div>
          <button
            type="button"
            id="retry-daily-btn"
            onClick={fetchDailyChallenge}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* State 4: Challenge Loaded */}
      {!loading && !isInsufficient && !error && challenge && (
        <div className="space-y-6">
          {/* Progress Card & Action Banner */}
          <div
            id="daily-progress-card"
            className="p-6 sm:p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-xl backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Today&apos;s Goal
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  {formatDisplayDate(challenge.date)}
                </h2>
              </div>

              {/* Progress Count */}
              <div
                id="daily-progress-text"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200"
              >
                {completedCount} of {totalQuestions} done
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  id="daily-progress-bar"
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>0%</span>
                <span>{progressPercent}% completed</span>
                <span>100%</span>
              </div>
            </div>

            {/* Completion Banner or Start/Continue CTA */}
            {challenge.completed ? (
              // When fifth question is completed, show completion card with new streak ("Day 4!").
              // If increased is false, show normal completion message.
              ((location.state?.streak && location.state.streak.increased) ||
              (!location.state?.streak && streakData?.completedToday && (streakData?.current || 0) > 0)) ? (
                <div
                  id="daily-streak-completion-card"
                  className="p-5 sm:p-6 rounded-2xl bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center gap-4 text-amber-200 shadow-lg shadow-amber-500/5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    <Flame className="w-7 h-7 fill-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[11px] tracking-wider uppercase border border-amber-500/40">
                        Streak Active!
                      </span>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                      Day {location.state?.streak?.current ?? streakData?.current ?? 1}!
                    </h3>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      You finished today&apos;s daily challenge and kept your streak alive. Great habit!
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  id="daily-completed-banner"
                  className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3.5 text-emerald-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>All done for today!</span>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </h3>
                    <p className="text-xs text-emerald-300/90 mt-0.5">
                      You have finished all 5 questions. Come back tomorrow for 5 fresh interview questions!
                    </p>
                  </div>
                </div>
              )
            ) : firstUnfinishedQuestion ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                <div className="text-xs text-slate-400">
                  {completedCount === 0
                    ? 'Start your 5-question sprint to keep your skills sharp.'
                    : `Pick up where you left off (${completedCount} of ${totalQuestions} completed).`}
                </div>

                <Link
                  to={`/practice/${firstUnfinishedQuestion._id}?daily=${challenge.challengeId}`}
                  id="start-continue-daily-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all border border-indigo-500/40 hover:scale-[1.02] cursor-pointer"
                >
                  <span>{completedCount === 0 ? 'Start Challenge' : 'Continue Challenge'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : null}
          </div>

          {/* Week Calendar */}
          <WeekCalendar
            activity={streakData?.recentActivity || []}
            loading={streakLoading}
          />

          {/* 5 Questions List Header */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Questions of the Day</span>
            </h3>

            {/* List of 5 Questions Cards */}
            <div className="space-y-3" id="daily-questions-list">
              {challenge.questions?.map((q, index) => {
                const questionNumber = index + 1;
                return (
                  <div
                    key={q._id}
                    id={`daily-question-card-${questionNumber}`}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                      q.isDone
                        ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80'
                        : 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/40 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Index + Metadata + Question preview */}
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            Q{questionNumber}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-medium text-[11px] border border-indigo-500/20">
                            {q.category}
                          </span>

                          <span className="text-slate-400 text-xs flex items-center gap-1.5 truncate">
                            <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                            {q.topic}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${getDifficultyBadge(
                              q.difficulty
                            )}`}
                          >
                            {q.difficulty}
                          </span>

                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-400 border border-slate-700 uppercase">
                            {q.type}
                          </span>
                        </div>

                        {/* Question Prompt */}
                        <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug pt-1">
                          {q.question}
                        </h4>
                      </div>

                      {/* Right: Status Pill & Action Link */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {q.isDone ? (
                          <div
                            id={`daily-q${questionNumber}-status-done`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </div>
                        ) : (
                          <div
                            id={`daily-q${questionNumber}-status-pending`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium"
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
                              ? 'text-slate-400 hover:text-slate-200'
                              : 'text-indigo-400 hover:text-indigo-300'
                          }`}
                        >
                          <span>{q.isDone ? 'Review' : 'Practice'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
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
