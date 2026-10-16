import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { QuestionCard } from '../components/QuestionCard';
import { getQuestions, getQuestionsMeta } from '../services/questions';
import {
  Button,
  Card,
  Input,
  Select,
  Skeleton,
  EmptyState,
} from '../components/ui';

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

  // Metadata for filter dropdowns
  const [categoriesMeta, setCategoriesMeta] = useState([]);

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

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Load filter metadata
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const data = await getQuestionsMeta();
        setCategoriesMeta(data.categories || []);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    loadMeta();
  }, []);

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

  // Fetch questions
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

  const availableTopics = useMemo(() => {
    if (!categoryParam) return [];
    const matchedCategory = categoriesMeta.find(
      (c) => c.category.toUpperCase() === categoryParam.toUpperCase()
    );
    return matchedCategory ? matchedCategory.topics : [];
  }, [categoryParam, categoriesMeta]);

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    updateFilters({
      category: newCategory,
      topic: '',
      page: 1,
    });
  };

  const handleTopicChange = (e) => {
    updateFilters({
      topic: e.target.value,
      page: 1,
    });
  };

  const handleDifficultyChange = (e) => {
    updateFilters({
      difficulty: e.target.value,
      page: 1,
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) {
      return;
    }
    updateFilters({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Boolean(categoryParam || topicParam || difficultyParam || qParam);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Question Bank</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and practice placement questions across operating systems, DBMS, networks, and algorithms.
          </p>
        </div>

        {!loading && (
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
            <span>{pagination.total}</span> questions available
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Search input */}
        <div className="relative">
          <Input
            id="question-search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search questions by keyword, topic or tag..."
            className="pl-9"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                updateFilters({ q: '', page: 1 });
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Select
            id="filter-category-select"
            value={categoryParam}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {categoriesMeta.map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.category}
              </option>
            ))}
          </Select>

          <Select
            id="filter-topic-select"
            value={topicParam}
            onChange={handleTopicChange}
            disabled={!categoryParam}
          >
            <option value="">
              {!categoryParam ? 'Select category first' : 'All Topics'}
            </option>
            {availableTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </Select>

          <Select
            id="filter-difficulty-select"
            value={difficultyParam}
            onChange={handleDifficultyChange}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>

          {hasActiveFilters && (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="md"
                onClick={clearFilters}
                className="w-full text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                <span>Clear filters</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-3.5">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center space-y-3 border-rose-200 dark:border-rose-900/60">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">Unable to load questions</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchQuestions}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Try Again</span>
          </Button>
        </Card>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No questions found"
          description={
            hasActiveFilters
              ? 'Try adjusting your search keywords or clearing some filters to broaden results.'
              : 'The question bank is currently empty. Check back soon.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5">
            {questions.map((question) => (
              <QuestionCard key={question._id} question={question} />
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

export default Questions;
