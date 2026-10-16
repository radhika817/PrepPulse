import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { QuestionCard } from '../components/QuestionCard';
import { getBookmarks } from '../services/questions';
import {
  Button,
  Card,
  Skeleton,
  EmptyState,
} from '../components/ui';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-amber-500 fill-amber-500/20" />
            <span>Bookmarked Questions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Questions you saved for quick reference and pre-interview revision.
          </p>
        </div>

        {!loading && (
          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
            <span className="text-amber-600 dark:text-amber-400 font-bold">{pagination.total}</span> saved questions
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-3.5">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center space-y-3 border-rose-200 dark:border-rose-900/60">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">Unable to load bookmarks</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchBookmarks}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Try Again</span>
          </Button>
        </Card>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Click the bookmark icon on any question card while browsing to save tricky questions for rapid recall here."
          action={
            <Link to="/questions">
              <Button variant="primary" size="md">
                <Compass className="w-4 h-4 mr-1.5" />
                <span>Explore Questions</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5">
            {questions.map((q) => (
              <QuestionCard
                key={q._id}
                question={q}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination.page}</span> of{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination.totalPages}</span>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-0.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
