import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bookmark,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';
import { getQuestionById, toggleBookmark } from '../services/questions';

export const Practice = () => {
  const { id } = useParams();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getQuestionById(id);
        setQuestion(data);
        setIsBookmarked(Boolean(data.isBookmarked));
      } catch (err) {
        console.error('Failed to load question details:', err);
        setError(err.message || 'Question not found or unable to load.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleBookmarkToggle = async () => {
    if (!question || isTogglingBookmark) return;

    setIsTogglingBookmark(true);
    const prev = isBookmarked;
    setIsBookmarked(!prev);

    try {
      const res = await toggleBookmark(question._id);
      setIsBookmarked(res.bookmarked);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      setIsBookmarked(prev);
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Navigation Back Link & Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <Link
          to="/questions"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Question Bank</span>
        </Link>

        <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
          Phase 5 Placeholder
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs">Loading question details...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <h3 className="text-sm font-semibold text-rose-200">Unable to load question</h3>
          <p className="text-xs text-rose-300 max-w-sm mx-auto">{error}</p>
          <Link
            to="/questions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <span>Browse All Questions</span>
          </Link>
        </div>
      ) : question ? (
        <div className="space-y-6">
          {/* Question Main Card */}
          <div className="p-6 sm:p-7 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-sm">
            {/* Meta Row: Category, Topic, Difficulty, Bookmark */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                  {question.category}
                </span>
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  {question.topic}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60 uppercase">
                  {question.type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getDifficultyColor(
                    question.difficulty
                  )}`}
                >
                  {question.difficulty}
                </span>

                <button
                  type="button"
                  onClick={handleBookmarkToggle}
                  disabled={isTogglingBookmark}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isBookmarked
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {question.question}
              </h2>
            </div>

            {/* MCQ Options Display (without showing correct answer) */}
            {question.type === 'mcq' && Array.isArray(question.options) && question.options.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <span className="text-xs font-semibold text-slate-400">Options:</span>
                <div className="grid grid-cols-1 gap-2">
                  {question.options.map((option, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs sm:text-sm text-slate-200 flex items-center gap-3"
                    >
                      <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 font-mono text-xs flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External link for coding questions */}
            {question.link && (
              <div className="pt-2">
                <a
                  href={question.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                >
                  <span>Open Coding Problem</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Tags */}
            {Array.isArray(question.tags) && question.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-4 border-t border-slate-800/60">
                {question.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-950 text-slate-500 border border-slate-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Phase 6 Upcoming Features Callout */}
          <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Full Practice Mode Arriving in Phase 6</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              In Phase 6, you will be able to reveal model answers, read detailed explanations, test your recall with self-ratings (Knew it / Partly / Missed it), and advance your spaced repetition Leitner boxes.
            </p>
          </div>
        </div>
      ) : (
        /* Standalone Practice route placeholder when no :id is provided */
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <Layers className="w-12 h-12 mx-auto text-indigo-400/60" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Select a Question to Practice</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Choose any question from the Question Bank to preview details and prepare for Phase 6 practice mode.
            </p>
          </div>
          <Link
            to="/questions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <span>Go to Question Bank</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Practice;
