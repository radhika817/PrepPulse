import { Bookmark } from 'lucide-react';

export const Bookmarks = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-amber-400" />
            <span>Bookmarked Questions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Questions you flagged for quick reference and pre-interview review.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
          Phase 5 Feature
        </div>
      </div>

      <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <Bookmark className="w-12 h-12 mx-auto text-amber-400 opacity-60" />
        <h2 className="text-base font-bold text-white">No bookmarks yet</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Click the bookmark icon on any question card while browsing or practicing to save tricky problems here.
        </p>
      </div>
    </div>
  );
};

export default Bookmarks;
