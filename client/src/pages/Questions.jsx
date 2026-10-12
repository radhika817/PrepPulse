import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { QuestionCard } from '../components/QuestionCard';
import { getQuestions, getQuestionsMeta } from '../services/questions';

export const Questions = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Query parameter values from URL
  const categoryParam = searchParams.get('category') || '';
  const topicParam = searchParams.get('topic') || '';
  const difficultyParam = searchParams.get('difficulty') || '';
  const qParam = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Search input state with debouncing
  const [searchInput, setSearchInput] = useState(qParam);

  // Metadata for filter dropdowns (categories and their topics)
  const [categoriesMeta, setCategoriesMeta] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // Questions listing state
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync search input when URL qParam changes externally (e.g. browser back/forward or clear)
  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Load filter metadata from /questions/meta on initial mount
  useEffect(() => {
    const loadMeta = async () => {
      try {
        setMetaLoading(true);
        const data = await getQuestionsMeta();
        setCategoriesMeta(data.categories || []);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      } finally {
        setMetaLoading(false);
      }
    };
    loadMeta();
  }, []);

  // Update query parameters in the URL
  const updateFilters = useCallback(
    (newParams) => {
      setSearchParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          Object.entries(newParams).forEach(([key, val]) => {
            if (val === undefined || val === null || val === '') {
              updated.delete(key);
            } else {
              updated.set(key, val);
            }
          });
          return updated;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== qParam) {
        updateFilters({ q: searchInput, page: 1 });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, qParam, updateFilters]);

  // Fetch questions matching current URL parameters
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getQuestions({
        category: categoryParam,
        topic: topicParam,
        difficulty: difficultyParam,
        q: qParam,
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
      console.error('Failed to fetch questions:', err);
      setError(err.message || 'Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [categoryParam, topicParam, difficultyParam, qParam, pageParam]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Available topics dependent on selected category
  const availableTopics = useMemo(() => {
    if (!categoryParam) return [];
    const matchedCategory = categoriesMeta.find(
      (c) => c.category.toUpperCase() === categoryParam.toUpperCase()
    );
    return matchedCategory ? matchedCategory.topics : [];
  }, [categoryParam, categoriesMeta]);

  // Filter handlers
  const handleCategoryChange = (cat) => {
    // When category changes, reset topic and page
    updateFilters({
      category: cat,
      topic: '',
      page: 1,
    });
  };

  const handleTopicChange = (topic) => {
    updateFilters({
      topic,
      page: 1,
    });
  };

  const handleDifficultyChange = (diff) => {
    updateFilters({
      difficulty: diff,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) {
      return;
    }
    updateFilters({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Boolean(
    categoryParam || topicParam || difficultyParam || qParam
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span>Question Bank</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search and filter core technical, aptitude, and HR interview questions.
          </p>
        </div>

        {/* Total Questions Count Badge */}
        {!loading && (
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-indigo-400">{pagination.total}</span> questions found
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search questions or tags..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={categoryParam}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={metaLoading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            >
              <option value="">All Categories</option>
              {categoriesMeta.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Dropdown (dependent on chosen category) */}
          <div>
            <select
              value={topicParam}
              onChange={(e) => handleTopicChange(e.target.value)}
              disabled={!categoryParam || availableTopics.length === 0}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40"
            >
              <option value="">
                {!categoryParam
                  ? 'Select category first'
                  : availableTopics.length === 0
                  ? 'No topics available'
                  : 'All Topics'}
              </option>
              {availableTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={difficultyParam}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                title="Clear all filters"
                className="shrink-0 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-500 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Quick filters:
          </span>
          <button
            type="button"
            onClick={() => handleCategoryChange('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              !categoryParam
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {categoriesMeta.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() => handleCategoryChange(c.category)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                categoryParam === c.category
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c.category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Loading / Error / Empty / Questions List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs">Loading questions...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <h3 className="text-sm font-semibold text-rose-200">Unable to load questions</h3>
          <p className="text-xs text-rose-300 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={fetchQuestions}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-base font-semibold text-white">No questions found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No questions matched your current search and filter combination.'
              : 'There are no questions available in the question bank right now.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Question Cards List */}
          <div className="grid grid-cols-1 gap-3.5">
            {questions.map((q) => (
              <QuestionCard key={q._id} question={q} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                Page <span className="text-white font-semibold">{pagination.page}</span> of{' '}
                <span className="text-white font-semibold">{pagination.totalPages}</span>{' '}
                ({pagination.total} questions)
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

                {/* Page number buttons */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, current, and neighbours
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
                                ? 'bg-indigo-600 text-white'
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

export default Questions;
