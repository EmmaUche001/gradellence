import { ReactNode, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Button } from './Button';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon, title, description,
  actionLabel, onAction,
  secondaryActionLabel, onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  const iconRef    = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      // Under reduced motion, just show everything instantly
      if (iconRef.current) gsap.set(iconRef.current, { opacity: 1 });
      if (contentRef.current) gsap.set(contentRef.current, { opacity: 1, y: 0 });
      return;
    }

    // Float the icon for 2 cycles only, then stop (not infinite)
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        y: -7,
        duration: 2.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1, // Changed from -1 (infinite) to 1 (2 cycles total)
      });
    }
    // Fade-up the text content once on mount
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.1 },
      );
    }
  }, [prefersReduced]);

  return (
    <div className={['flex flex-col items-center justify-center text-center py-16 px-6', className].join(' ')}>
      {icon && (
        <div ref={iconRef} className="mb-5 text-gray-300">
          {icon}
        </div>
      )}
      <div ref={contentRef} style={{ opacity: 0 }}>
        <h3 className="text-base font-semibold text-gray-700">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-gray-400 max-w-sm">{description}</p>
        )}
        {(actionLabel || secondaryActionLabel) && (
          <div className="mt-6 flex items-center gap-3 justify-center">
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
    </div>
  );
}
