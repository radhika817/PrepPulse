import { RotateCcw, Clock, Sparkles } from 'lucide-react';

export const Revision = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-400" />
            <span>Spaced Revision Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Questions due for recall review based on Leitner spaced repetition.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
          Phase 10 Feature
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
        <Clock className="w-12 h-12 mx-auto text-purple-400 opacity-70" />
        <h2 className="text-lg font-bold text-white">Your revision queue is clear!</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          When you mark a question as "Partly" or "Missed it" in practice mode, PrepPulse automatically schedules it here after 1, 3, or 7 days to reinforce memory retention.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-4 text-left">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-400">Box 0 • 1 Day</span>
            <p className="text-xs text-slate-400">Questions missed on last attempt</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400">Box 1 • 3 Days</span>
            <p className="text-xs text-slate-400">Questions partially recalled</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Box 2-3 • 7 Days</span>
            <p className="text-xs text-slate-400">Well-known questions graduating to mastery</p>
          </div>
        </div>

        <div className="pt-2 text-xs text-indigo-400 flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Automated scheduling backed by UserQuestionState model</span>
        </div>
      </div>
    </div>
  );
};

export default Revision;
