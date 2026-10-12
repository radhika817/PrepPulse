import { Link } from 'react-router-dom';
import {
  Flame,
  Award,
  Layers,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';

export const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Preparation Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your daily consistency, recall accuracy, and weak topics.
          </p>
        </div>
        <Link
          to="/daily"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
        >
          <span>Today's Challenge (0/5)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Current Streak</span>
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">0 <span className="text-sm font-normal text-slate-400">days</span></div>
          <p className="text-xs text-slate-500 mt-1">Longest: 0 days</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Questions Solved</span>
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">0</div>
          <p className="text-xs text-slate-500 mt-1">Across 9 categories</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Recall Accuracy</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">--%</div>
          <p className="text-xs text-slate-500 mt-1">Excludes revealed-first</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Revision Due</span>
            <RotateCcw className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">0</div>
          <p className="text-xs text-slate-500 mt-1">Spaced repetition queue</p>
        </div>
      </div>

      {/* Focus & Weak Topics Callout */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>Topic Accuracy Breakdown</span>
            </h2>
            <span className="text-xs text-slate-500">Coming in Phase 10</span>
          </div>
          <div className="p-8 text-center text-slate-400 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            Topic accuracy analytics and Recharts visualizations will appear here once practice attempts are recorded.
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Target Weak Topics</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Topics where your accuracy falls below 60% are automatically scheduled into your daily challenge.
          </p>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
            Solve at least 5 questions in a topic to generate weak topic diagnostics.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
