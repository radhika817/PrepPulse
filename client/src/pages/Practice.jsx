import { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  Info,
  Award,
} from 'lucide-react';
import {
  getQuestionById,
  getQuestions,
  toggleBookmark,
  revealQuestion,
  submitAttempt,
} from '../services/questions';
import { getDaily } from '../services/daily';

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

  // Next question navigation state
  const [nextQuestionId, setNextQuestionId] = useState(null);

  // Look up next question from current filtered list
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const findNextQuestion = async () => {
      try {
        const searchParams = Object.fromEntries(new URLSearchParams(location.search));
        const res = await getQuestions({ ...searchParams, limit: 50 });
        if (isMounted && res?.items && Array.isArray(res.items)) {
          const currentIndex = res.items.findIndex((item) => item._id === id);
          if (currentIndex !== -1 && currentIndex + 1 < res.items.length) {
            setNextQuestionId(res.items[currentIndex + 1]._id);
          } else {
            setNextQuestionId(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Could not determine next question:', err);
          setNextQuestionId(null);
        }
      }
    };

    findNextQuestion();
    return () => {
      isMounted = false;
    };
  }, [id, location.search]);

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

  // Human-readable revision schedule text
  const formatRevisionTime = (nextReviewAt) => {
    if (!nextReviewAt) return 'Mastered (graduated from revision)';
    const msDiff = new Date(nextReviewAt).getTime() - Date.now();
    const daysDiff = Math.max(1, Math.round(msDiff / (24 * 60 * 60 * 1000)));
    if (daysDiff === 1) return 'Tomorrow (+1 day)';
    return `In ${daysDiff} days`;
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

  // MCQ Check Handler
  const handleCheckAnswer = async () => {
    if (!selectedOption || submitting || submitted) return;

    try {
      setSubmitting(true);
      setAttemptError(null);
      setTimerActive(false);

      const res = await submitAttempt(question._id, {
        mode: 'practice',
        selectedOption,
        revealedFirst: false,
        timeSpentSec,
      });

      setAnswerData(res);
      setSubmitted(true);
      setRevealed(true);
      setRevealedFirst(false);
      setSubmissionResult({
        isCorrect: res.isCorrect,
        rating: res.isCorrect ? 'knew' : 'missed',
        nextReviewAt: res.nextReviewAt,
      });
    } catch (err) {
      console.error('Failed to submit MCQ check:', err);
      setAttemptError(
        err.response?.data?.error?.message || err.message || 'Failed to submit answer.'
      );
      setTimerActive(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Reveal Handler (Show Answer on any question)
  const handleShowAnswer = async () => {
    if (revealing || revealed || submitting) return;

    try {
      setRevealing(true);
      setAttemptError(null);
      setTimerActive(false);

      // If user clicked Show answer before answering or typing
      const wasRevealedFirst =
        question.type === 'mcq' ? !selectedOption : !typedAnswer.trim();

      setRevealedFirst(wasRevealedFirst);

      const res = await revealQuestion(question._id);
      setAnswerData(res);
      setRevealed(true);
    } catch (err) {
      console.error('Failed to reveal answer:', err);
      setAttemptError(
        err.response?.data?.error?.message || err.message || 'Failed to reveal answer.'
      );
      setTimerActive(true);
    } finally {
      setRevealing(false);
    }
  };

  // Self-Rating Handler (Non-MCQ or revealed MCQ)
  const handleRate = async (rating) => {
    if (submitting || submitted) return;

    try {
      setSubmitting(true);
      setAttemptError(null);
      setTimerActive(false);

      const payload = {
        mode: 'practice',
        selfRating: rating,
        revealedFirst,
        timeSpentSec,
      };

      if (question.type === 'mcq') {
        payload.selectedOption = selectedOption || answerData?.answer;
      }

      const res = await submitAttempt(question._id, payload);
      setAnswerData((prev) => ({ ...prev, ...res }));
      setSubmitted(true);
      setSubmissionResult({
        rating,
        nextReviewAt: res.nextReviewAt,
      });
    } catch (err) {
      console.error('Failed to submit rating:', err);
      setAttemptError(
        err.response?.data?.error?.message || err.message || 'Failed to submit rating.'
      );
    } finally {
      setSubmitting(false);
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
          <Clock className={`w-3.5 h-3.5 text-indigo-400 ${timerActive ? 'animate-pulse' : ''}`} />
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

            {/* MCQ Options Display */}
            {question.type === 'mcq' && Array.isArray(question.options) && question.options.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {revealed || submitted ? 'Options:' : 'Select your answer:'}
                </label>
                <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="MCQ Options">
                  {question.options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isAnswer = answerData && answerData.answer === option;
                    const isWrongSelection =
                      (submitted || revealed) && isSelected && answerData && !isAnswer;

                    let cardStyle =
                      'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700';
                    let badgeStyle =
                      'bg-slate-800/80 text-slate-400 border-slate-700';

                    if (revealed || submitted) {
                      if (isAnswer) {
                        cardStyle =
                          'bg-emerald-500/15 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50';
                        badgeStyle =
                          'bg-emerald-500 text-slate-950 font-bold border-emerald-400';
                      } else if (isWrongSelection) {
                        cardStyle =
                          'bg-rose-500/15 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
                        badgeStyle =
                          'bg-rose-500 text-white font-bold border-rose-400';
                      } else {
                        cardStyle =
                          'bg-slate-950/30 border-slate-800/40 text-slate-500 opacity-60';
                      }
                    } else if (isSelected) {
                      cardStyle =
                        'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50';
                      badgeStyle =
                        'bg-indigo-500 text-white border-indigo-400 font-bold';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        id={`mcq-option-${idx}`}
                        disabled={submitted || revealed}
                        onClick={() => setSelectedOption(option)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${cardStyle} ${
                          submitted || revealed ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-md font-mono text-xs flex items-center justify-center shrink-0 border transition-colors ${badgeStyle}`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-xs sm:text-sm font-medium">{option}</span>
                        </div>

                        {isSelected && !revealed && !submitted && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 ring-4 ring-indigo-500/20 shrink-0" />
                        )}
                        {(revealed || submitted) && isAnswer && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {(revealed || submitted) && isWrongSelection && (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Non-MCQ Optional User Notes / Answer Textarea (Question View) */}
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

            {/* Action Bar: Question View (Check button for MCQ / Show Answer for all) */}
            {!revealed && !submitted && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-500">
                  {question.type === 'mcq'
                    ? 'Pick an option and click Check, or Show answer directly.'
                    : 'Think through your answer, then click Show answer to self-grade.'}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    id="show-answer-btn"
                    onClick={handleShowAnswer}
                    disabled={revealing || submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-600 disabled:opacity-50 cursor-pointer"
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
                      onClick={handleCheckAnswer}
                      disabled={!selectedOption || submitting || revealing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-800 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all border border-indigo-500/40 cursor-pointer disabled:cursor-not-allowed"
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

            {/* Error Message Alert */}
            {attemptError && (
              <div
                id="attempt-error-banner"
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{attemptError}</span>
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

          {/* ANSWER VIEW & RATING VIEW */}
          {(revealed || submitted) && answerData && (
            <div id="practice-answer-section" className="space-y-6 animate-in fade-in duration-200">
              {/* Note when revealedFirst is true */}
              {revealedFirst && (
                <div
                  id="revealed-first-note"
                  className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5"
                >
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Answer revealed before attempting. This will not count toward your accuracy stats.
                  </span>
                </div>
              )}

              {/* MCQ Result Banner */}
              {question.type === 'mcq' && submissionResult && (
                <div
                  id="mcq-result-banner"
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    submissionResult.isCorrect
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                  }`}
                >
                  {submissionResult.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">
                      {submissionResult.isCorrect ? 'Correct! Well done.' : 'Incorrect answer'}
                    </h3>
                    <p className="text-xs opacity-90">
                      {submissionResult.isCorrect
                        ? 'Your selection matches the model answer.'
                        : 'Review the model explanation below to reinforce your knowledge.'}
                    </p>
                  </div>
                </div>
              )}

              {/* User Typed Answer (Shown for non-MCQ if user had typed) */}
              {typedAnswer.trim() && (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Your formulation:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {typedAnswer}
                  </p>
                </div>
              )}

              {/* Model Answer & Explanation Card */}
              <div
                id="model-answer-card"
                className="p-6 sm:p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-lg"
              >
                {/* Model Answer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Model Answer</span>
                  </div>
                  <div
                    id="model-answer-text"
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white font-medium leading-relaxed"
                  >
                    {answerData.answer}
                  </div>
                </div>

                {/* Explanation */}
                {answerData.explanation && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Explanation
                    </span>
                    <p
                      id="model-explanation-text"
                      className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap"
                    >
                      {answerData.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* RATING VIEW (For Non-MCQ or if MCQ was revealed without submitting) */}
              {!submitted && (
                <div
                  id="self-rating-card"
                  className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl text-center"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      How well did you know this answer?
                    </h3>
                    <p className="text-xs text-slate-400">
                      Be honest with yourself — this drives your spaced revision schedule.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {/* Knew it */}
                    <button
                      type="button"
                      id="rate-knew-btn"
                      onClick={() => handleRate('knew')}
                      disabled={submitting}
                      className="p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 transition-all text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Knew it</span>
                      <span className="text-[10px] text-emerald-400/70 font-normal">
                        Advance stage (+1 to +7d)
                      </span>
                    </button>

                    {/* Partly */}
                    <button
                      type="button"
                      id="rate-partly-btn"
                      onClick={() => handleRate('partly')}
                      disabled={submitting}
                      className="p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <HelpCircle className="w-5 h-5 text-amber-400" />
                      <span>Partly</span>
                      <span className="text-[10px] text-amber-400/70 font-normal">
                        Review in 3 days
                      </span>
                    </button>

                    {/* Missed it */}
                    <button
                      type="button"
                      id="rate-missed-btn"
                      onClick={() => handleRate('missed')}
                      disabled={submitting}
                      className="p-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-5 h-5 text-rose-400" />
                      <span>Missed it</span>
                      <span className="text-[10px] text-rose-400/70 font-normal">
                        Reset to Box 0 (review tomorrow)
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* POST-SUBMISSION CONFIRMATION & NAVIGATION */}
              {submitted && (
                <div
                  id="submission-confirmation-card"
                  className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 space-y-5 shadow-xl"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Attempt recorded!
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {submissionResult?.rating && (
                            <span className="capitalize">
                              Rated: <strong className="text-slate-200">{submissionResult.rating}</strong>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        Revision:{' '}
                        <strong>
                          {formatRevisionTime(submissionResult?.nextReviewAt || answerData.nextReviewAt)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Navigation Buttons: Back to questions & Next question */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <Link
                      to={`/questions${location.search || ''}`}
                      id="back-to-questions-btn"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-sm hover:border-slate-600 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to questions</span>
                    </Link>

                    {nextQuestionId ? (
                      <Link
                        to={`/practice/${nextQuestionId}${location.search || ''}`}
                        id="next-question-btn"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all border border-indigo-500/40 cursor-pointer"
                      >
                        <span>Next question</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Last question in this filtered list
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
