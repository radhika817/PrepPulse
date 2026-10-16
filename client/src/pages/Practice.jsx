import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  Bookmark,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
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
  Flame,
  Check,
} from 'lucide-react';
import {
  getQuestionById,
  getQuestions,
  toggleBookmark,
  revealQuestion,
  submitAttempt,
} from '../services/questions';
import { getDaily } from '../services/daily';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  EmptyState,
} from '../components/ui';

export const Practice = () => {
  const { id } = useParams();
  const location = useLocation();

  // Core question state
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  // Background timer
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

  // Daily challenge context if opened with ?daily=<challengeId>
  const searchParams = new URLSearchParams(location.search);
  const dailyChallengeId = searchParams.get('daily');
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [isDailyCompleted, setIsDailyCompleted] = useState(false);

  // Next question navigation state
  const [nextQuestionId, setNextQuestionId] = useState(null);

  // Look up next question (either from daily challenge or filtered questions list)
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const findNextQuestion = async () => {
      try {
        if (dailyChallengeId) {
          const dailyData = await getDaily();
          if (!isMounted) return;
          setDailyChallenge(dailyData);
          if (dailyData.completed) {
            setIsDailyCompleted(true);
          }

          const nextQ = dailyData.questions?.find(
            (q) => !q.isDone && q._id !== id
          );
          setNextQuestionId(nextQ ? nextQ._id : null);
        } else {
          const searchParamsObj = Object.fromEntries(new URLSearchParams(location.search));
          const res = await getQuestions({ ...searchParamsObj, limit: 50 });
          if (isMounted && res?.items && Array.isArray(res.items)) {
            const currentIndex = res.items.findIndex((item) => item._id === id);
            if (currentIndex !== -1 && currentIndex + 1 < res.items.length) {
              setNextQuestionId(res.items[currentIndex + 1]._id);
            } else {
              setNextQuestionId(null);
            }
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
  }, [id, location.search, dailyChallengeId]);

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

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

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

      const payload = {
        mode: dailyChallengeId ? 'daily' : 'practice',
        selectedOption,
        revealedFirst: false,
        timeSpentSec,
      };

      if (dailyChallengeId) {
        payload.challengeId = dailyChallengeId;
      }

      const res = await submitAttempt(question._id, payload);

      setAnswerData(res);
      setSubmitted(true);
      setRevealed(true);
      setRevealedFirst(false);
      setSubmissionResult({
        isCorrect: res.isCorrect,
        rating: res.isCorrect ? 'knew' : 'missed',
        nextReviewAt: res.nextReviewAt,
        challengeCompleted: res.challengeCompleted,
        completedCount: res.completedCount,
        streak: res.streak,
      });

      if (res.challengeCompleted) {
        setIsDailyCompleted(true);
        if (res.streak) {
          window.dispatchEvent(new CustomEvent('streak-updated', { detail: res.streak }));
        }
      }
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
        mode: dailyChallengeId ? 'daily' : 'practice',
        selfRating: rating,
        revealedFirst,
        timeSpentSec,
      };

      if (dailyChallengeId) {
        payload.challengeId = dailyChallengeId;
      }

      if (question.type === 'mcq') {
        payload.selectedOption = selectedOption || answerData?.answer;
      }

      const res = await submitAttempt(question._id, payload);
      setAnswerData((prev) => ({ ...prev, ...res }));
      setSubmitted(true);
      setSubmissionResult({
        rating,
        nextReviewAt: res.nextReviewAt,
        challengeCompleted: res.challengeCompleted,
        completedCount: res.completedCount,
        streak: res.streak,
      });

      if (res.challengeCompleted) {
        setIsDailyCompleted(true);
        if (res.streak) {
          window.dispatchEvent(new CustomEvent('streak-updated', { detail: res.streak }));
        }
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
      setAttemptError(
        err.response?.data?.error?.message || err.message || 'Failed to submit rating.'
      );
      setTimerActive(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        {dailyChallengeId ? (
          <div className="flex items-center gap-2.5">
            <Link
              to="/daily"
              id="back-to-daily-top-link"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Daily Challenge</span>
            </Link>
            <Badge variant="primary" size="sm">
              <Calendar className="w-3 h-3 mr-1" />
              <span>Daily Challenge</span>
            </Badge>
          </div>
        ) : (
          <Link
            to={`/questions${location.search || ''}`}
            id="back-to-bank-top-link"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Question Bank</span>
          </Link>
        )}

        {/* Subtle Timer Badge */}
        <div
          id="practice-timer-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-slate-700 select-none shadow-sm"
          title="Time spent on this question"
        >
          <Clock className={`w-3.5 h-3.5 text-brand-600 dark:text-brand-400 ${timerActive ? 'animate-pulse' : ''}`} />
          <span>{formatTime(timeSpentSec)}</span>
        </div>
      </div>

      {loading ? (
        <div id="practice-loading-state" className="space-y-4 py-8">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <Card id="practice-error-state" className="p-8 text-center space-y-4 border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
          <h3 className="text-base font-semibold text-rose-700 dark:text-rose-400">Unable to load question</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{error}</p>
          <Link to="/questions">
            <Button variant="primary" size="sm">
              Browse All Questions
            </Button>
          </Link>
        </Card>
      ) : question ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Question Column (2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <Card id="practice-question-card" className="p-6 sm:p-7 space-y-6">
              {/* Badges and Bookmark Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary" size="sm" id="question-category-badge">
                    {question.category}
                  </Badge>
                  <span id="question-topic-badge" className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {question.topic}
                  </span>
                  <Badge variant="default" size="sm" id="question-type-badge">
                    {question.type}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {dailyChallengeId &&
                    dailyChallenge?.questions?.some((q) => q._id === question._id && q.isDone) && (
                      <Badge variant="active" size="sm" id="daily-completed-today-badge">
                        <Check className="w-3 h-3 mr-0.5" />
                        <span>Completed Today</span>
                      </Badge>
                    )}

                  <Badge
                    variant={question.difficulty?.toLowerCase() || 'default'}
                    size="sm"
                    id="question-difficulty-badge"
                  >
                    {question.difficulty}
                  </Badge>

                  <button
                    type="button"
                    id="practice-bookmark-btn"
                    onClick={handleBookmarkToggle}
                    disabled={isTogglingBookmark}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                    className={`p-1.5 rounded-xl border transition-all ${
                      isBookmarked
                        ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="max-w-prose">
                <h1
                  id="question-text-title"
                  className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50 leading-relaxed"
                >
                  {question.question}
                </h1>
              </div>

              {/* External Link for Coding Questions */}
              {question.link && (
                <div>
                  <a
                    id="coding-problem-external-link"
                    href={question.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-medium transition-colors"
                  >
                    <span>Open Problem in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* MCQ Options Display */}
              {question.type === 'mcq' && Array.isArray(question.options) && question.options.length > 0 && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {revealed || submitted ? 'Options:' : 'Select your answer:'}
                  </label>
                  <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="MCQ Options">
                    {question.options.map((option, idx) => {
                      const isSelected = selectedOption === option;
                      const isAnswer = answerData && answerData.answer === option;
                      const isWrongSelection =
                        (submitted || revealed) && isSelected && answerData && !isAnswer;

                      let cardStyle =
                        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/20';
                      let badgeStyle =
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

                      if (revealed || submitted) {
                        if (isAnswer) {
                          cardStyle =
                            'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/40';
                          badgeStyle =
                            'bg-emerald-600 text-white font-bold border-emerald-600';
                        } else if (isWrongSelection) {
                          cardStyle =
                            'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500/40';
                          badgeStyle =
                            'bg-rose-600 text-white font-bold border-rose-600';
                        } else {
                          cardStyle =
                            'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 text-slate-400 opacity-60';
                        }
                      } else if (isSelected) {
                        cardStyle =
                          'bg-brand-50 dark:bg-brand-950/40 border-brand-500 text-brand-900 dark:text-brand-100 ring-2 ring-brand-500/30';
                        badgeStyle =
                          'bg-brand-600 text-white border-brand-600 font-bold';
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
                              className={`w-6 h-6 rounded-lg font-mono text-xs flex items-center justify-center shrink-0 border transition-colors ${badgeStyle}`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-xs sm:text-sm font-medium">{option}</span>
                          </div>

                          {isSelected && !revealed && !submitted && (
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-brand-500/20 shrink-0" />
                          )}
                          {(revealed || submitted) && isAnswer && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          {(revealed || submitted) && isWrongSelection && (
                            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Non-MCQ Optional User Formulation Textarea */}
              {question.type !== 'mcq' && !revealed && !submitted && (
                <div className="space-y-2 pt-2">
                  <label
                    htmlFor="user-answer-textarea"
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between"
                  >
                    <span>Your Answer (Optional)</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Formulate your thoughts before revealing
                    </span>
                  </label>
                  <textarea
                    id="user-answer-textarea"
                    rows={4}
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Formulate your response here to test active recall..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-y"
                  />
                </div>
              )}

              {/* Action Bar (Show Answer / Check button) */}
              {!revealed && !submitted && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {question.type === 'mcq'
                      ? 'Pick an option and click Check, or Show answer directly.'
                      : 'Think through your answer, then click Show answer to self-grade.'}
                  </p>

                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="secondary"
                      size="md"
                      id="show-answer-btn"
                      onClick={handleShowAnswer}
                      isLoading={revealing}
                      disabled={revealing || submitting}
                    >
                      <Eye className="w-4 h-4 mr-1.5 opacity-70" />
                      <span>Show Answer</span>
                    </Button>

                    {question.type === 'mcq' && (
                      <Button
                        variant="primary"
                        size="md"
                        id="check-answer-btn"
                        onClick={handleCheckAnswer}
                        isLoading={submitting}
                        disabled={!selectedOption || submitting || revealing}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        <span>Check</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message Alert */}
              {attemptError && (
                <div
                  id="attempt-error-banner"
                  className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{attemptError}</span>
                </div>
              )}

              {/* Tags Row */}
              {Array.isArray(question.tags) && question.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {question.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* ANSWER PANEL & SELF-RATING */}
            {(revealed || submitted) && answerData && (
              <div id="practice-answer-section" className="space-y-6">
                {/* Revealed First Note */}
                {revealedFirst && (
                  <div
                    id="revealed-first-note"
                    className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5"
                  >
                    <Info className="w-4 h-4 text-amber-500 shrink-0" />
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
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {submissionResult.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold">
                        {submissionResult.isCorrect ? 'Correct! Well done.' : 'Incorrect answer'}
                      </h3>
                      <p className="text-xs opacity-90">
                        {submissionResult.isCorrect
                          ? 'Your selection matches the model answer.'
                          : 'Review the model explanation below to reinforce your understanding.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* User Typed Answer Display */}
                {typedAnswer.trim() && (
                  <Card className="p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Your formulation:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-w-prose">
                      {typedAnswer}
                    </p>
                  </Card>
                )}

                {/* Distinct Model Answer & Explanation Panel */}
                <Card id="model-answer-card" className="p-6 sm:p-7 space-y-5 border-brand-200 dark:border-brand-900 shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Model Answer</span>
                    </div>
                    <div
                      id="model-answer-text"
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed max-w-prose"
                    >
                      {answerData.answer}
                    </div>
                  </div>

                  {answerData.explanation && (
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Explanation
                      </span>
                      <p
                        id="model-explanation-text"
                        className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-w-prose"
                      >
                        {answerData.explanation}
                      </p>
                    </div>
                  )}

                  {/* Follow-up question if available */}
                  {(answerData.followUp || question.followUp) && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-wider block">
                        Interviewer Follow-up
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic max-w-prose">
                        &quot;{answerData.followUp || question.followUp}&quot;
                      </p>
                    </div>
                  )}
                </Card>

                {/* Large Recall Buttons (Knew it / Partly / Missed it) */}
                {!submitted && (
                  <Card id="self-rating-card" className="p-6 sm:p-7 text-center space-y-4 shadow-lg">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        How well did you know this answer?
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
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
                        className="p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 transition-all font-semibold flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm">Knew it</span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-normal">
                          Advance stage (+1 to +7d)
                        </span>
                      </button>

                      {/* Partly */}
                      <button
                        type="button"
                        id="rate-partly-btn"
                        onClick={() => handleRate('partly')}
                        disabled={submitting}
                        className="p-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 transition-all font-semibold flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm">Partly</span>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300/80 font-normal">
                          Review in 3 days
                        </span>
                      </button>

                      {/* Missed it */}
                      <button
                        type="button"
                        id="rate-missed-btn"
                        onClick={() => handleRate('missed')}
                        disabled={submitting}
                        className="p-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 transition-all font-semibold flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        <RotateCcw className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        <span className="text-sm">Missed it</span>
                        <span className="text-[11px] text-rose-700 dark:text-rose-300/80 font-normal">
                          Reset to Box 0 (review tomorrow)
                        </span>
                      </button>
                    </div>
                  </Card>
                )}

                {/* POST-SUBMISSION CONFIRMATION & NAVIGATION */}
                {submitted && (
                  <Card id="submission-confirmation-card" className="p-6 space-y-5 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Attempt recorded!
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {submissionResult?.rating && (
                              <span className="capitalize">
                                Rated: <strong className="text-slate-700 dark:text-slate-200">{submissionResult.rating}</strong>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 px-3 py-1.5 rounded-xl font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          Revision:{' '}
                          <strong>
                            {formatRevisionTime(submissionResult?.nextReviewAt || answerData.nextReviewAt)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Daily Challenge Completed Banner */}
                    {dailyChallengeId &&
                      (isDailyCompleted ||
                        submissionResult?.challengeCompleted ||
                        (!nextQuestionId && submitted)) && (
                        submissionResult?.streak?.increased ? (
                          <div
                            id="daily-challenge-complete-banner"
                            className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800 flex items-center gap-3.5 text-orange-950 dark:text-orange-200"
                          >
                            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Flame className="w-5 h-5 fill-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>Day {submissionResult.streak.current}! Daily Challenge Complete!</span>
                                <Sparkles className="w-4 h-4 text-orange-500" />
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                You have finished all 5 questions and kept your streak alive. Great habit!
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div
                            id="daily-challenge-complete-banner"
                            className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3.5 text-emerald-950 dark:text-emerald-200"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Award className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>Daily Challenge Complete!</span>
                                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                You have finished all 5 questions for today. Great work!
                              </p>
                            </div>
                          </div>
                        )
                      )}

                    {/* Navigation Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      {dailyChallengeId ? (
                        <Link
                          to="/daily"
                          state={{ streak: submissionResult?.streak }}
                          id="back-to-daily-btn"
                        >
                          <Button variant="secondary" size="md">
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            <span>Back to Daily Challenge</span>
                          </Button>
                        </Link>
                      ) : (
                        <Link
                          to={`/questions${location.search || ''}`}
                          id="back-to-questions-btn"
                        >
                          <Button variant="secondary" size="md">
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            <span>Back to questions</span>
                          </Button>
                        </Link>
                      )}

                      {nextQuestionId ? (
                        <Link
                          to={
                            dailyChallengeId
                              ? `/practice/${nextQuestionId}?daily=${dailyChallengeId}`
                              : `/practice/${nextQuestionId}${location.search || ''}`
                          }
                          id="next-question-btn"
                        >
                          <Button variant="primary" size="md">
                            <span>Next question</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      ) : dailyChallengeId ? (
                        <Link to="/daily" id="finish-daily-btn">
                          <Button variant="primary" size="md">
                            <span>View Daily Summary</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Last question in this list
                        </span>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Progress Sidebar (Desktop column / Stacked on Mobile) */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {dailyChallengeId ? 'Daily Challenge' : 'Practice Info'}
              </h3>

              {dailyChallengeId && dailyChallenge?.questions ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Progress</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">
                      {dailyChallenge.questions.filter((q) => q.isDone).length} / 5 completed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dailyChallenge.questions.map((q, idx) => {
                      const isCurrent = q._id === question._id;
                      return (
                        <Link
                          key={q._id}
                          to={`/practice/${q._id}?daily=${dailyChallengeId}`}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium border transition-colors ${
                            isCurrent
                              ? 'bg-brand-50 border-brand-300 dark:bg-brand-950/60 dark:border-brand-700 text-brand-900 dark:text-brand-100'
                              : q.isDone
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-slate-300'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[11px] font-semibold opacity-70">
                              #{idx + 1}
                            </span>
                            <span className="truncate">{q.topic}</span>
                          </div>
                          {q.isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Category</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      {question.category}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Topic</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      {question.topic}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Type</span>
                    <span className="font-semibold uppercase text-slate-900 dark:text-slate-200">
                      {question.type}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Difficulty</span>
                    <span className="font-semibold capitalize text-slate-900 dark:text-slate-200">
                      {question.difficulty}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Habit reinforcement card */}
            <Card className="p-4 bg-brand-50/50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-900/40">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Active recall cements engineering concepts better than re-reading. Formulate answers clearly before checking.
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title="Select a Question to Practice"
          description="Choose any question from the Question Bank to practice and self-rate."
          action={
            <Link to="/questions">
              <Button variant="primary" size="md">
                Browse Question Bank
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
};

export default Practice;
