import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Clock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import api from '../services/api';
import { QuestionCard } from '../components/QuestionCard';
import {
  Button,
  Card,
  Badge,
  Skeleton,
} from '../components/ui';

export const Revision = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRevisionQueue = async () => {
      try {
        setLoading(true);
        const res = await api.get('/revision');
        if (isMounted) {
          setItems(res.data?.items || []);
        }
      } catch {
        // Silently handle error or offline
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRevisionQueue();
    return () => {
      isMounted = false;
    };
  }, []);

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
            Questions due for recall review based on Leitner spaced repetition.
          </p>
        </div>
        <Badge variant="primary" size="md">
          {items.length} Due for Review
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
            <span>Review these questions now to graduate them to longer intervals</span>
            <span>{items.length} questions</span>
          </div>

          <div className="space-y-3.5">
            {items.map((q) => (
              <QuestionCard key={q._id} question={q} />
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-800">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Your revision queue is clear!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              When you mark a question as &quot;Partly&quot; or &quot;Missed it&quot; during practice, PrepPulse automatically schedules it here after 1, 3, or 7 days to reinforce memory retention.
            </p>
          </div>

          {/* Leitner Box Explanation */}
          <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                Box 0 • 1 Day
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Questions missed on last attempt. Reset for immediate reinforcement.
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
      )}
    </div>
  );
};

export default Revision;
