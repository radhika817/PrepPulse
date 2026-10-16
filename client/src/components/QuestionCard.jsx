import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bookmark, ArrowRight } from 'lucide-react';
import { toggleBookmark } from '../services/questions';
import { Card, Badge } from './ui';

/**
 * Reusable QuestionCard component
 * Used in both Question Bank (/questions) and Bookmarks (/bookmarks) pages.
 * Displays category, topic, difficulty badge, question type, question text, tags,
 * and an interactive bookmark toggle button.
 */
export const QuestionCard = ({ question, onBookmarkToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isBookmarked, setIsBookmarked] = useState(Boolean(question.isBookmarked));
  const [isToggling, setIsToggling] = useState(false);

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
    e.stopPropagation();
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
    <Card
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group p-5 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-150 space-y-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 select-none shadow-sm"
    >
      {/* Card Header: Category, Topic, Type & Bookmark Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" size="sm">
            {question.category}
          </Badge>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {question.topic}
          </span>
          <Badge variant="default" size="sm">
            {getTypeLabel(question.type)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={question.difficulty?.toLowerCase() || 'default'}
            size="sm"
          >
            {question.difficulty}
          </Badge>

          <button
            type="button"
            onClick={handleBookmarkClick}
            disabled={isToggling}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
            className={`p-1.5 rounded-xl border transition-all ${
              isBookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 transition-transform ${
                isBookmarked ? 'fill-amber-500 text-amber-500 scale-105' : 'text-slate-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div className="max-w-prose">
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-relaxed line-clamp-3">
          {question.question}
        </h3>
      </div>

      {/* Footer: Tags & Practice CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {question.tags?.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
            >
              #{tag}
            </span>
          ))}
          {question.tags?.length > 3 && (
            <span className="text-[11px] text-slate-400 font-mono">
              +{question.tags.length - 3}
            </span>
          )}
        </div>

        <span className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
          <span>Practice</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  );
};

export default QuestionCard;
