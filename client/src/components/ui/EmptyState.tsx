import { ReactNode } from 'react';
import { Button } from './Button';

// Design system:
// "Never show blank pages." Every module gets an empty state.
// Pattern: icon → title → description → CTA button

interface EmptyStateProps {
  /** Emoji or Lucide icon element */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Primary call-to-action label */
  actionLabel?: string;
  /** Called when the CTA button is clicked */
  onAction?: () => void;
  /** Secondary CTA (e.g. "Learn more") */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      ].join(' ')}
    >
      {icon && (
        <div className="text-4xl mb-4 text-gray-300">
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold text-gray-800">{title}</h3>

      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm">{description}</p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex items-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="ghost" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
