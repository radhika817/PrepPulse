import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  ArrowRight,
  Layers,
  RefreshCw,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { getAdminQuestionStats } from '../../services/admin';
import {
  Button,
  Card,
  Badge,
  Skeleton,
} from '../../components/ui';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminQuestionStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err.message || 'Unable to load administration statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center space-y-4 border-rose-200 dark:border-rose-900/60">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-rose-700 dark:text-rose-400">Error Loading Admin Dashboard</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchStats}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Try Again</span>
        </Button>
      </Card>
    );
  }

  const {
    total = 0,
    reviewStatus = { draft: 0, approved: 0, rejected: 0 },
    sourceType = { own: 0, ai_draft: 0, licensed: 0 },
    category = {},
    aiDraftsAwaitingReview = 0,
  } = stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <span>Admin Portal</span>
              <Badge variant="primary" size="sm">
                Phase 12
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Curate question inventory, verify AI drafts, and manage question lifecycle.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStats}
            title="Refresh statistics"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/admin/questions">
            <Button variant="primary" size="md">
              <Layers className="w-4 h-4 mr-1.5" />
              <span>Manage Questions</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Questions */}
        <Link to="/admin/questions?reviewStatus=approved">
          <Card className="p-5 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all space-y-3 shadow-sm group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved Questions</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {reviewStatus.approved}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {total > 0 ? Math.round((reviewStatus.approved / total) * 100) : 0}% of total
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>Served to students</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform opacity-70" />
            </p>
          </Card>
        </Link>

        {/* Draft Questions */}
        <Link to="/admin/questions?reviewStatus=draft">
          <Card className="p-5 hover:border-amber-300 dark:hover:border-amber-800 transition-all space-y-3 shadow-sm group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Drafts Pending Review</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {reviewStatus.draft}
              </span>
              <Badge variant="medium" size="sm">
                Action Required
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>Awaiting approval</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform opacity-70" />
            </p>
          </Card>
        </Link>

        {/* AI Drafts Awaiting Review */}
        <Link to="/admin/questions?sourceType=ai_draft&reviewStatus=draft">
          <Card className="p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-all space-y-3 shadow-sm group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI Drafts to Review</span>
              <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {aiDraftsAwaitingReview}
              </span>
              <Badge variant="primary" size="sm">
                AI Generation
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>Needs human verification</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform opacity-70" />
            </p>
          </Card>
        </Link>

        {/* Rejected Questions */}
        <Link to="/admin/questions?reviewStatus=rejected">
          <Card className="p-5 hover:border-rose-300 dark:hover:border-rose-800 transition-all space-y-3 shadow-sm group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rejected / Archived</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                {reviewStatus.rejected}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Archived
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>Hidden from students</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform opacity-70" />
            </p>
          </Card>
        </Link>
      </div>

      {/* Quick Action Review Queue Callout */}
      <Card className="p-6 bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-900/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Question Review Queue</span>
            {reviewStatus.draft > 0 && (
              <Badge variant="medium" size="sm">
                {reviewStatus.draft} Pending
              </Badge>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Questions in draft status never appear to students in practice, daily challenge, revision, or search.
            Review and approve quality questions or bulk reject duplicates.
          </p>
        </div>
        <Link to="/admin/questions?reviewStatus=draft">
          <Button variant="primary" size="md" className="shrink-0">
            <span>Open Review Queue</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </Card>

      {/* Distribution Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Type Breakdown */}
        <Card className="p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Questions by Source</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total: {total}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Original / Own</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{sourceType.own}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400">AI Generated</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{sourceType.ai_draft}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Licensed</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{sourceType.licensed}</p>
            </div>
          </div>
        </Card>

        {/* Category Distribution */}
        <Card className="p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Inventory by Category</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">{Object.keys(category).length} Categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(category).length === 0 ? (
              <span className="text-xs text-slate-400">No categorized questions yet</span>
            ) : (
              Object.entries(category).map(([cat, count]) => (
                <Link
                  key={cat}
                  to={`/admin/questions?category=${cat}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <span className="font-semibold">{cat}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                    {count}
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
