import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  Eye,
  CheckCircle2,
  HelpCircle,
  Send,
  Layers,
} from 'lucide-react';
import { getQuestionById, toggleBookmark, revealQuestion, submitAttempt } from '../services/questions';

export const Practice = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Core question state
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  // Background timer (running while user is attempting or thinking)
  const [timeSpentSec, setTimeSpentSec] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // User input states
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');

  // Flow & reveal states
  const [revealedFirst, setRevealedFirst] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [answerData, setAnswerData] = useState(null);

  // Attempt submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [attemptError, setAttemptError] = useState(null);

  // Load question details
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        // Reset states for fresh question
        setTimeSpentSec(0);
        setSelectedOption(null);
        setTypedAnswer('');
        setRevealedFirst(false);
        setRevealed(false);
        setAnswerData(null);
        setSubmitted(false);
        setSubmissionResult(null);
        setAttemptError(null);

        const data = await getQuestionById(id);
        setQuestion(data);
        setIsBookmarked(Boolean(data.isBookmarked));
        setTimerActive(true);
      } catch (err) {
        console.error('Failed to load question details:', err);
        setError(err.message || 'Question not found or unable to load.');
        setTimerActive(false);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // Background timer incrementer
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimeSpentSec((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive]);

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

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
      {/* Top Header / Back Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <Link
          to={`/questions${location.search || ''}`}
          id="back-to-bank-top-link"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Question Bank</span>
        </Link>

        {/* Live Timer Running in Background */}
        <div
          id="practice-timer-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-xs shadow-sm"
          title="Time spent on this question"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{formatTime(timeSpentSec)}</span>
        </div>
      </div>

      {loading ? (
        <div id="practice-loading-state" className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs">Loading question details...</p>
        </div>
      ) : error ? (
        <div id="practice-error-state" className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
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
          {/* Main Question Card */}
          <div
            id="practice-question-card"
            className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800/90 space-y-6 shadow-xl backdrop-blur-sm"
          >
            {/* Metadata Badges & Bookmark Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  id="question-category-badge"
                  className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20"
                >
                  {question.category}
                </span>
                <span id="question-topic-badge" className="text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  {question.topic}
                </span>
                <span
                  id="question-type-badge"
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60 uppercase"
                >
                  {question.type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  id="question-difficulty-badge"
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getDifficultyColor(
                    question.difficulty
                  )}`}
                >
                  {question.difficulty}
                </span>

                <button
                  type="button"
                  id="practice-bookmark-btn"
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
              <h1
                id="question-text-title"
                className="text-lg sm:text-xl font-bold text-white leading-relaxed tracking-tight"
              >
                {question.question}
              </h1>
            </div>

            {/* External Link for Coding Questions */}
            {question.link && (
              <div className="pt-1">
                <a
                  id="coding-problem-external-link"
                  href={question.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                >
                  <span>Open Problem in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* MCQ Option Cards */}
            {question.type === 'mcq' && Array.isArray(question.options) && question.options.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Select your answer:
                </label>
                <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="MCQ Options">
                  {question.options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    return (
                      <button
                        key={idx}
                        type="button"
                        id={`mcq-option-${idx}`}
                        disabled={submitted || revealed}
                        onClick={() => setSelectedOption(option)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                        } ${submitted || revealed ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-md font-mono text-xs flex items-center justify-center shrink-0 border transition-colors ${
                              isSelected
                                ? 'bg-indigo-500 text-white border-indigo-400 font-bold'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-xs sm:text-sm">{option}</span>
                        </div>

                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 ring-4 ring-indigo-500/20 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Non-MCQ Optional User Notes / Answer Textarea */}
            {question.type !== 'mcq' && !revealed && !submitted && (
              <div className="space-y-2 pt-2">
                <label
                  htmlFor="user-answer-textarea"
                  className="text-xs font-semibold text-slate-400 flex items-center justify-between"
                >
                  <span>Your Answer (Optional)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Type your thoughts or recall before revealing
                  </span>
                </label>
                <textarea
                  id="user-answer-textarea"
                  rows={4}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Formulate your answer here to test yourself..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-y"
                />
              </div>
            )}

            {/* Action Bar (Check button for MCQ / Show Answer for all) */}
            {!revealed && !submitted && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-500">
                  {question.type === 'mcq'
                    ? 'Pick an option and check, or reveal the answer directly.'
                    : 'Reveal the answer to self-grade your recall.'}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    id="show-answer-btn"
                    disabled={revealing || submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-600 disabled:opacity-50"
                  >
                    {revealing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Show Answer</span>
                  </button>

                  {question.type === 'mcq' && (
                    <button
                      type="button"
                      id="check-answer-btn"
                      disabled={!selectedOption || submitting || revealing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-800 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all border border-indigo-500/40"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Check</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tags Row */}
            {Array.isArray(question.tags) && question.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-800/60">
                {question.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-950 text-slate-500 border border-slate-800/80"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standalone Practice route placeholder */
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <Layers className="w-12 h-12 mx-auto text-indigo-400/60" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Select a Question to Practice</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Choose any question from the Question Bank to practice and self-rate.
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
