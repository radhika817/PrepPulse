import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Clock,
  Calendar,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { getRevisionQuestions } from '../services/revision';
import { QuestionCard } from '../components/QuestionCard';
import {
  Button,
  Card,
  Badge,
  Skeleton,
} from '../components/ui';

export const Revision = () => {
  const [activeTab, setActiveTab] = useState('due'); // 'due' | 'upcoming'
  const [dueItems, setDueItems] = useState([]);
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevisionData = useCallback(async () => {
    try {
      setLoading(true);
      const [dueRes, upcomingRes] = await Promise.all([
        getRevisionQuestions('due'),
        getRevisionQuestions('upcoming'),
      ]);
      setDueItems(dueRes?.items || []);
      setUpcomingItems(upcomingRes?.items || []);
    } catch (err) {
      console.error('Failed to load revision queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevisionData();

    // Listen for revision-updated events from Practice page or Revise later actions
    window.addEventListener('revision-updated', fetchRevisionData);
    return () => {
      window.removeEventListener('revision-updated', fetchRevisionData);
    };
  }, [fetchRevisionData]);

  const formatReturnTime = (nextReviewAt) => {
    if (!nextReviewAt) return 'Ready for review';
    const diffMs = new Date(nextReviewAt).getTime() - Date.now();

    if (diffMs <= 0) {
      return 'Due now';
    }

    const hoursDiff = Math.round(diffMs / (60 * 60 * 1000));
    if (hoursDiff < 24) {
      return hoursDiff <= 1 ? 'In 1 hour' : `In ${hoursDiff} hours`;
    }

    const daysDiff = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
    if (daysDiff === 1) return 'Tomorrow (+1 day)';
    return `In ${daysDiff} days`;
  };

  const currentItems = activeTab === 'due' ? dueItems : upcomingItems;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Spaced Revision Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review questions based on Leitner spaced repetition intervals.
          </p>
        </div>
        <Badge variant={activeTab === 'due' ? 'primary' : 'default'} size="md" id="revision-active-count-badge">
          {activeTab === 'due' ? `${dueItems.length} Due for Review` : `${upcomingItems.length} Upcoming`}
        </Badge>
      </div>

      {/* Due / Upcoming Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 w-fit" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-due"
          aria-selected={activeTab === 'due'}
          onClick={() => setActiveTab('due')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'due'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Due for Review</span>
          <span
            id="tab-due-count"
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'due'
                ? 'bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {dueItems.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-upcoming"
          aria-selected={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'upcoming'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Upcoming Schedule</span>
          <span
            id="tab-upcoming-count"
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'upcoming'
                ? 'bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {upcomingItems.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : currentItems.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
            <span>
              {activeTab === 'due'
                ? 'Review these questions now to graduate them to longer intervals'
                : 'Questions scheduled for future recall reinforcement'}
            </span>
            <span>{currentItems.length} questions</span>
          </div>

          <div className="space-y-4">
            {currentItems.map((q) => (
              <div key={q._id} className="space-y-1.5">
                {/* Revision Metadata & Return Time Bar */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                    <span
                      id={`question-box-badge-${q._id}`}
                      className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        q.box === 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : q.box === 1
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      Box {q.box ?? 0}
                    </span>
                    {typeof q.timesSeen === 'number' && q.timesSeen > 0 && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Seen {q.timesSeen} {q.timesSeen === 1 ? 'time' : 'times'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 font-semibold">
                    {activeTab === 'due' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due now</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatReturnTime(q.nextReviewAt)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <QuestionCard question={q} />
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'due' ? (
        <Card className="p-8 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-800">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Your revision queue is clear!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              When you mark a question as &quot;Partly&quot;, &quot;Missed it&quot;, or click &quot;Revise later&quot; during practice, PrepPulse automatically schedules it here to reinforce memory retention.
            </p>
          </div>

          {/* Leitner Box Explanation */}
          <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                Box 0 • 1 Day
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Questions missed or saved for review. Reset for quick reinforcement.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                Box 1 • 3 Days
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Questions partially recalled. Short review to solidify connections.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                Box 2-3 • 7 Days
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Well-known questions graduating to long-term interview mastery.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/questions">
              <Button variant="primary" size="md">
                <BookOpen className="w-4 h-4 mr-1.5" />
                <span>Practice Questions</span>
              </Button>
            </Link>
            <Link to="/daily">
              <Button variant="secondary" size="md">
                <span>Today&apos;s Challenge</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-8 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
            <Calendar className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              No upcoming reviews scheduled
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              When you practice and self-rate questions with &quot;Partly&quot; or &quot;Knew it&quot;, future review sessions will be scheduled here based on Leitner intervals (+1d, +3d, +7d).
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link to="/questions">
              <Button variant="primary" size="md">
                <BookOpen className="w-4 h-4 mr-1.5" />
                <span>Browse Question Bank</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Revision;
