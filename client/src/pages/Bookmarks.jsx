import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { QuestionCard } from '../components/QuestionCard';
import { getBookmarks } from '../services/questions';

export const Bookmarks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getBookmarks({
        page: pageParam,
        limit: 10,
      });

      setQuestions(data.items || []);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
      setError(err.message || 'Failed to load your bookmarks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pageParam]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // When a bookmark is un-toggled from this page, remove it from the list immediately
  const handleBookmarkToggle = (questionId, newStatus) => {
    if (!newStatus) {
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) {
      return;
    }
    setSearchParams({ page: newPage.toString() }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            <span>Bookmarked Questions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Questions you saved for quick reference and pre-interview revision.
          </p>
        </div>

        {!loading && (
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-amber-400">{pagination.total}</span> saved questions
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <p className="text-xs">Loading saved bookmarks...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <h3 className="text-sm font-semibold text-rose-200">Unable to load bookmarks</h3>
          <p className="text-xs text-rose-300 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={fetchBookmarks}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <Bookmark className="w-12 h-12 mx-auto text-amber-400/50" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">No bookmarks yet</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click the bookmark icon on any question card while browsing to save tricky questions for revision here.
            </p>
          </div>
          <Link
            to="/questions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Questions</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List of QuestionCards */}
          <div className="grid grid-cols-1 gap-3.5">
            {questions.map((q) => (
              <QuestionCard
                key={q._id}
                question={q}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                Page <span className="text-white font-semibold">{pagination.page}</span> of{' '}
                <span className="text-white font-semibold">{pagination.totalPages}</span>{' '}
                ({pagination.total} total)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        Math.abs(p - pagination.page) <= 1
                      );
                    })
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <div key={p} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-1 text-slate-600 font-mono">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                              pagination.page === p
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
