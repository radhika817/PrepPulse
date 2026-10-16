import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Edit3,
  Eye,
  Plus,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Square,
  Tag,
} from 'lucide-react';
import {
  getAdminQuestions,
  updateAdminQuestion,
  bulkUpdateQuestionsStatus,
} from '../../services/admin';

const CATEGORIES = [
  'OS',
  'DSA',
  'OOP',
  'CPP',
  'DBMS',
  'SQL',
  'CN',
  'COA',
  'WEB',
  'SYSDESIGN',
  'APTITUDE',
  'HR',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const REVIEW_STATUSES = ['draft', 'approved', 'rejected'];
const SOURCE_TYPES = ['own', 'ai_draft', 'licensed'];

export const AdminQuestions = ({ onOpenCreate, onOpenEdit, onOpenImport }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states initialized from URL params
  const [statusFilter, setStatusFilter] = useState(searchParams.get('reviewStatus') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [difficultyFilter, setDifficultyFilter] = useState(searchParams.get('difficulty') || '');
  const [sourceTypeFilter, setSourceTypeFilter] = useState(searchParams.get('sourceType') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Quick review modal state
  const [reviewModalQuestion, setReviewModalQuestion] = useState(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  // Fetch questions from API
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 10,
      };
      if (statusFilter) params.reviewStatus = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (sourceTypeFilter) params.sourceType = sourceTypeFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const data = await getAdminQuestions(params);
      setQuestions(data.items || []);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages || 1,
      });
      // Clear selection on page or filter change
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to fetch admin questions:', err);
      setError(err.message || 'Error loading questions');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, difficultyFilter, sourceTypeFilter, searchQuery]);

  // Sync state to URL and fetch
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('reviewStatus', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (difficultyFilter) params.set('difficulty', difficultyFilter);
    if (sourceTypeFilter) params.set('sourceType', sourceTypeFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (page > 1) params.set('page', page.toString());

    setSearchParams(params, { replace: true });
    fetchQuestions();
  }, [statusFilter, categoryFilter, difficultyFilter, sourceTypeFilter, searchQuery, page, fetchQuestions, setSearchParams]);

  // Handle individual checkbox toggle
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all on current page
  const toggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q._id));
    }
  };

  // Bulk status update (Approve / Reject selected)
  const handleBulkStatus = async (newStatus) => {
    if (selectedIds.length === 0) return;
    try {
      setBulkActionLoading(true);
      await bulkUpdateQuestionsStatus(selectedIds, newStatus);
      await fetchQuestions();
      setSelectedIds([]);
    } catch (err) {
      alert(`Bulk update failed: ${err.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Single question status change from review modal or quick buttons
  const handleSingleStatusChange = async (questionId, newStatus) => {
    try {
      setReviewActionLoading(true);
      await updateAdminQuestion(questionId, { reviewStatus: newStatus });
      await fetchQuestions();
      if (reviewModalQuestion && reviewModalQuestion._id === questionId) {
        setReviewModalQuestion((prev) => (prev ? { ...prev, reviewStatus: newStatus } : null));
      }
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setReviewActionLoading(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
    setDifficultyFilter('');
    setSourceTypeFilter('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/admin" className="hover:text-white transition-colors">
              Admin Portal
            </Link>
            <span>/</span>
            <span className="text-indigo-400">Question Inventory</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Manage Questions</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {pagination.total} Questions
            </span>
          </h1>
        </div>

        {/* Action Buttons: New Question & Import */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenImport && onOpenImport()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow-sm transition-all hover:scale-[1.02]"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import JSON</span>
          </button>
          <button
            onClick={() => onOpenCreate && onOpenCreate()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Text Search */}
          <div className="relative lg:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search text..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Review Statuses</option>
              {REVIEW_STATUSES.map((st) => (
                <option key={st} value={st}>
                  Status: {st.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={difficultyFilter}
              onChange={(e) => {
                setDifficultyFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map((diff) => (
                <option key={diff} value={diff}>
                  Difficulty: {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Source Type Filter */}
          <div>
            <select
              value={sourceTypeFilter}
              onChange={(e) => {
                setSourceTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Sources</option>
              {SOURCE_TYPES.map((src) => (
                <option key={src} value={src}>
                  Source: {src === 'ai_draft' ? 'AI Draft' : src === 'own' ? 'Original / Own' : 'Licensed'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Tags & Reset */}
        {(statusFilter || categoryFilter || difficultyFilter || sourceTypeFilter || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400">Filtering applied</span>
            <button
              onClick={resetFilters}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Banner (when questions are selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-white">
              {selectedIds.length === 1 ? '1 question selected' : `${selectedIds.length} questions selected`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatus('approved')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>
            <button
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatus('rejected')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Selected</span>
            </button>
            <button
              disabled={bulkActionLoading}
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Questions List Table / Cards */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading questions inventory...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Error fetching questions</h3>
            <p className="text-xs text-rose-300 max-w-sm mx-auto">{error}</p>
            <button
              onClick={fetchQuestions}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
            >
              Retry
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No questions matched criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting search terms or clearing status/category filters.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {/* Table Header (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider items-center">
              <div className="col-span-1 flex items-center">
                <button
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Select / Deselect all"
                >
                  {selectedIds.length === questions.length ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="col-span-5">Question & Topic</div>
              <div className="col-span-2">Category / Type</div>
              <div className="col-span-2">Status & Source</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Question Rows */}
            {questions.map((q) => {
              const isSelected = selectedIds.includes(q._id);
              const isApproved = q.reviewStatus === 'approved';
              const isRejected = q.reviewStatus === 'rejected';

              return (
                <div
                  key={q._id}
                  className={`p-4 md:px-5 md:py-3.5 transition-colors flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center ${
                    isSelected ? 'bg-indigo-950/20' : 'hover:bg-slate-800/30'
                  }`}
                >
                  {/* Select Checkbox */}
                  <div className="col-span-1 flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                    <button
                      onClick={() => toggleSelect(q._id)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    {/* Mobile Badges */}
                    <div className="flex items-center gap-1.5 md:hidden">
                      <StatusBadge status={q.reviewStatus} />
                      <SourceBadge source={q.sourceType} />
                    </div>
                  </div>

                  {/* Question Content & Topic */}
                  <div className="col-span-5 space-y-1 w-full">
                    <p className="text-xs font-semibold text-white line-clamp-2">{q.question}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-medium text-slate-300">{q.topic}</span>
                      <span>•</span>
                      <span
                        className={`capitalize font-medium ${
                          q.difficulty === 'easy'
                            ? 'text-emerald-400'
                            : q.difficulty === 'medium'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Category & Question Type */}
                  <div className="col-span-2 space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-indigo-400 text-[10px] font-bold border border-slate-700/60">
                      {q.category}
                    </span>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      Type: {q.type === 'coding_link' ? 'Coding Link' : q.type}
                    </p>
                  </div>

                  {/* Status & Source (Desktop) */}
                  <div className="col-span-2 hidden md:flex flex-col gap-1 items-start">
                    <StatusBadge status={q.reviewStatus} />
                    <SourceBadge source={q.sourceType} />
                  </div>

                  {/* Action Buttons */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                    <button
                      onClick={() => setReviewModalQuestion(q)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                      title="Quick Review"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Review</span>
                    </button>

                    <button
                      onClick={() => onOpenEdit && onOpenEdit(q)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Edit Question"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick inline approve/reject icons */}
                    {!isApproved && (
                      <button
                        onClick={() => handleSingleStatusChange(q._id, 'approved')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Approve immediately"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isRejected && (
                      <button
                        onClick={() => handleSingleStatusChange(q._id, 'rejected')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Reject / Soft-delete"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing page <strong className="text-white">{pagination.page}</strong> of{' '}
              <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Quick View Modal */}
      {reviewModalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={reviewModalQuestion.reviewStatus} />
                  <SourceBadge source={reviewModalQuestion.sourceType} />
                  <span className="text-xs text-slate-400 font-bold uppercase">{reviewModalQuestion.category}</span>
                </div>
                <h3 className="text-base font-bold text-white">Review Question Details</h3>
              </div>
              <button
                onClick={() => setReviewModalQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Question Prompt</span>
              <p className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-medium text-white whitespace-pre-wrap">
                {reviewModalQuestion.question}
              </p>
            </div>

            {/* MCQ Options */}
            {reviewModalQuestion.type === 'mcq' && reviewModalQuestion.options?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Options</span>
                <div className="space-y-1.5">
                  {reviewModalQuestion.options.map((opt, idx) => {
                    const isCorrect =
                      opt.trim().toLowerCase() === reviewModalQuestion.answer?.trim().toLowerCase();
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{opt}</span>
                        {isCorrect && (
                          <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Model Answer (Non-MCQ) */}
            {reviewModalQuestion.type !== 'mcq' && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Model Answer</span>
                <p className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs font-medium text-emerald-200 whitespace-pre-wrap">
                  {reviewModalQuestion.answer}
                </p>
              </div>
            )}

            {/* Explanation */}
            {reviewModalQuestion.explanation && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Explanation</span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap">
                  {reviewModalQuestion.explanation}
                </p>
              </div>
            )}

            {/* Follow-up question */}
            {reviewModalQuestion.followUp && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Interviewer Follow-up</span>
                <p className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
                  {reviewModalQuestion.followUp}
                </p>
              </div>
            )}

            {/* Coding Link */}
            {reviewModalQuestion.type === 'coding_link' && reviewModalQuestion.link && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">External Practice Link</span>
                <a
                  href={reviewModalQuestion.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{reviewModalQuestion.link}</span>
                </a>
              </div>
            )}

            {/* Reviewer Audit Trail */}
            {reviewModalQuestion.reviewedBy && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>
                  Reviewed by:{' '}
                  <strong className="text-white">
                    {reviewModalQuestion.reviewedBy.name || reviewModalQuestion.reviewedBy.email || 'Admin'}
                  </strong>
                </span>
                <span>
                  {reviewModalQuestion.reviewedAt
                    ? new Date(reviewModalQuestion.reviewedAt).toLocaleDateString()
                    : ''}
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const toEdit = reviewModalQuestion;
                  setReviewModalQuestion(null);
                  if (onOpenEdit) onOpenEdit(toEdit);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Open in Full Editor</span>
              </button>

              <div className="flex items-center gap-2">
                {reviewModalQuestion.reviewStatus !== 'approved' && (
                  <button
                    disabled={reviewActionLoading}
                    onClick={() => handleSingleStatusChange(reviewModalQuestion._id, 'approved')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                )}
                {reviewModalQuestion.reviewStatus !== 'rejected' && (
                  <button
                    disabled={reviewActionLoading}
                    onClick={() => handleSingleStatusChange(reviewModalQuestion._id, 'rejected')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Status Badge Component
 */
export const StatusBadge = ({ status }) => {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        <span>Approved</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
        <XCircle className="w-3 h-3" />
        <span>Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
      <Clock className="w-3 h-3" />
      <span>Draft</span>
    </span>
  );
};

/**
 * Source Badge Component
 */
export const SourceBadge = ({ source }) => {
  if (source === 'ai_draft') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">
        <Sparkles className="w-2.5 h-2.5" />
        <span>AI Draft</span>
      </span>
    );
  }
  if (source === 'licensed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
        Licensed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold border border-slate-700/50">
      Original
    </span>
  );
};

export default AdminQuestions;
