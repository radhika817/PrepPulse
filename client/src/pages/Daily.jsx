import { Calendar, Target, CheckCircle2 } from 'lucide-react';

export const Daily = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <span>Today's Daily Challenge</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            5 questions refreshed daily at midnight (Asia/Kolkata).
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          Phase 8 Feature
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Target className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-white">Daily 5-Question Challenge Flow</h2>
          <p className="text-sm text-slate-400">
            Completing all 5 questions increments your daily streak. The algorithm dynamically picks 3 general questions plus 2 from your identified weak topics.
          </p>
        </div>

        <div className="grid sm:grid-cols-5 gap-3 max-w-lg mx-auto pt-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <div
              key={num}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1"
            >
              <span className="text-xs text-slate-500">Q{num}</span>
              <div className="w-6 h-6 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                {num}
              </div>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-slate-500 pt-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Active daily challenge generation will be activated in Phase 8</span>
        </div>
      </div>
    </div>
  );
};

export default Daily;
