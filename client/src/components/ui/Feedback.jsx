import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Elements';

/**
 * Accessible Modal dialog component with ESC key handler and backdrop click.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-10 transition-all duration-200 overflow-hidden ${className}`}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              {title && (
                <h3
                  id="modal-title"
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/**
 * ProgressBar with accessible aria attributes and color variants.
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  variant = 'brand',
  size = 'md',
  className = '',
  showLabel = false,
  label = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeHeights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantColors = {
    brand: 'bg-brand-600 dark:bg-brand-500',
    streak: 'bg-orange-500',
    knew: 'bg-emerald-500',
    partly: 'bg-amber-500',
    missed: 'bg-rose-500',
    slate: 'bg-slate-600 dark:bg-slate-400',
  };

  const selectedColor = variantColors[variant] || variantColors.brand;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
          <span>{label || 'Progress'}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div
        className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${
          sizeHeights[size] || sizeHeights.md
        }`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`${sizeHeights[size] || sizeHeights.md} ${selectedColor} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for loading states.
 */
export const Skeleton = ({
  className = '',
  width,
  height,
  rounded = 'rounded-xl',
  ...props
}) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${rounded} ${className}`}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * EmptyState component with friendly icon, title, description, and optional action.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 mb-4 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      )}
      {title && (
        <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h4>
      )}
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action ? (
        <div className="mt-5">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-5">
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
