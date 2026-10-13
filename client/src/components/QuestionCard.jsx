import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bookmark, ArrowRight, Code, HelpCircle, CheckCircle2 } from 'lucide-react';
import { toggleBookmark } from '../services/questions';

/**
 * Reusable QuestionCard component
 * Used in both Question Bank (/questions) and Bookmarks (/bookmarks) pages.
 * Displays category, topic, difficulty badge, question type, question text, tags,
 * and an interactive bookmark toggle button.
 * Clicking anywhere on the card navigates to /practice/:id with filter query preserved.
 */
export const QuestionCard = ({ question, onBookmarkToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isBookmarked, setIsBookmarked] = useState(Boolean(question.isBookmarked));
  const [isToggling, setIsToggling] = useState(false);

  // Difficulty badge styling
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

  // Question type badge label
  const getTypeLabel = (type) => {
    switch (type) {
      case 'mcq':
        return 'MCQ';
      case 'short':
        return 'Theory';
      case 'coding_link':
        return 'Coding';
      case 'hr':
        return 'HR';
      default:
        return type?.toUpperCase() || 'Q';
    }
  };

  const handleBookmarkClick = async (e) => {
    e.stopPropagation(); // Prevent card navigation
    if (isToggling) return;

    setIsToggling(true);
    const previousState = isBookmarked;
    const optimisticState = !previousState;
    setIsBookmarked(optimisticState);

    try {
      const response = await toggleBookmark(question._id);
      setIsBookmarked(response.bookmarked);
      if (onBookmarkToggle) {
        onBookmarkToggle(question._id, response.bookmarked);
      }
    } catch (err) {
      // Revert optimistic update on failure
      console.error('Failed to toggle bookmark:', err);
      setIsBookmarked(previousState);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/practice/${question._id}${location.search || ''}`);
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group relative p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-indigo-500/5 space-y-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
    >
      {/* Card Header: Category, Topic, Difficulty badge & Bookmark Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category & Topic */}
          <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
            {question.category}
          </span>
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            {question.topic}
          </span>

          {/* Type Badge */}
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60">
            {getTypeLabel(question.type)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Difficulty Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getDifficultyColor(
              question.difficulty
            )}`}
          >
            {question.difficulty}
          </span>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleBookmarkClick}
            disabled={isToggling}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
            className={`p-1.5 rounded-lg border transition-all ${
              isBookmarked
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 transition-transform ${
                isBookmarked ? 'fill-amber-400 text-amber-400 scale-105' : 'text-slate-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-white transition-colors leading-relaxed line-clamp-3">
          {question.question}
        </h3>
      </div>

      {/* Footer: Tags and Practice link callout */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {question.tags?.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-950 text-slate-500 border border-slate-800"
            >
              #{tag}
            </span>
          ))}
          {question.tags?.length > 3 && (
            <span className="text-[10px] text-slate-500 font-mono">
              +{question.tags.length - 3}
            </span>
          )}
        </div>

        {/* Practice hover indicator */}
        <div className="flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 font-medium transition-colors">
          <span>Practice</span>
          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
