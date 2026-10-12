import { Eye, ThumbsUp, HelpCircle, XCircle } from 'lucide-react';

export const Practice = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Mode</h1>
          <p className="text-xs text-slate-400 mt-1">
            Self-graded recall with zero auto-grading friction.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
          Phase 6 Feature
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        {/* Sample card demonstration */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
            OS • Deadlock
          </span>
          <span className="text-slate-500 font-mono">Difficulty: Easy</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white leading-relaxed">
            Which condition is NOT required for a deadlock to occur?
          </h2>
          <p className="text-xs text-slate-400">
            Think through the 4 Coffman conditions before revealing the answer.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800 flex flex-col items-center gap-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Show Answer & Explanation</span>
          </button>

          {/* Self-Rating buttons demo */}
          <div className="w-full pt-4 space-y-2 text-center">
            <span className="text-xs font-semibold text-slate-400">
              Self-Rating Scale (after revealing):
            </span>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Knew it (+1 Box)</span>
              </button>
              <button
                type="button"
                className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Partly (Review 3d)</span>
              </button>
              <button
                type="button"
                className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Missed it (Review 1d)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice;
