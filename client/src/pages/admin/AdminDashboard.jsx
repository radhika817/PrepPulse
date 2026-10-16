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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 animate-pulse">
          <div className="h-8 w-48 bg-slate-800 rounded-lg" />
          <div className="h-8 w-24 bg-slate-800 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Error Loading Admin Dashboard</h2>
        <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Admin Portal</span>
                <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  Phase 12
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Curate question inventory, verify AI drafts, and manage question lifecycle.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            title="Refresh statistics"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/admin/questions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02]"
          >
            <Layers className="w-4 h-4" />
            <span>Manage Questions</span>
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Questions */}
        <Link
          to="/admin/questions?reviewStatus=approved"
          className="group p-5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Approved Questions</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">
              {reviewStatus.approved}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {total > 0 ? Math.round((reviewStatus.approved / total) * 100) : 0}% of total
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Served to students</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform opacity-70" />
          </p>
        </Link>

        {/* Draft Questions */}
        <Link
          to="/admin/questions?reviewStatus=draft"
          className="group p-5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Drafts Pending Review</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white group-hover:text-amber-400 transition-colors">
              {reviewStatus.draft}
            </span>
            <span className="text-[11px] text-amber-400/80 font-semibold">
              Action Required
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Awaiting approval</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform opacity-70" />
          </p>
        </Link>

        {/* AI Drafts Awaiting Review */}
        <Link
          to="/admin/questions?sourceType=ai_draft&reviewStatus=draft"
          className="group p-5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-purple-500/30 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">AI Drafts to Review</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white group-hover:text-purple-400 transition-colors">
              {aiDraftsAwaitingReview}
            </span>
            <span className="text-[11px] text-purple-400/80 font-semibold">
              AI Generation
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Needs human verification</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform opacity-70" />
          </p>
        </Link>

        {/* Rejected Questions */}
        <Link
          to="/admin/questions?reviewStatus=rejected"
          className="group p-5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-rose-500/30 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Rejected / Archived</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white group-hover:text-rose-400 transition-colors">
              {reviewStatus.rejected}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Soft-deleted
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Hidden from students</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform opacity-70" />
          </p>
        </Link>
      </div>

      {/* Quick Action Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Question Review Queue</span>
            {reviewStatus.draft > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                {reviewStatus.draft} Pending
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Questions in draft status never appear to students in practice, daily challenge, revision, or search.
            Review and approve quality questions or bulk reject duplicates.
          </p>
        </div>
        <Link
          to="/admin/questions?reviewStatus=draft"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all shrink-0"
        >
          <span>Open Review Queue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Distribution Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Type Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Questions by Source</span>
            </h3>
            <span className="text-xs text-slate-400">Total: {total}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Original / Own</span>
              <p className="text-lg font-bold text-white">{sourceType.own}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-400">AI Generated</span>
              <p className="text-lg font-bold text-white">{sourceType.ai_draft}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-400">Licensed</span>
              <p className="text-lg font-bold text-white">{sourceType.licensed}</p>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              <span>Inventory by Category</span>
            </h3>
            <span className="text-xs text-slate-400">{Object.keys(category).length} Categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(category).length === 0 ? (
              <span className="text-xs text-slate-500">No categorized questions yet</span>
            ) : (
              Object.entries(category).map(([cat, count]) => (
                <Link
                  key={cat}
                  to={`/admin/questions?category=${cat}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs transition-colors"
                >
                  <span className="font-bold text-slate-300">{cat}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 text-[10px] font-semibold">
                    {count}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
