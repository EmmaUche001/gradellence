import { ReactNode, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Button } from './Button';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { GSAP_CONFIG } from '../../lib/motion.tokens';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  /**
   * Animation personality for this empty state.
   * 'float' (default): gentle perpetual bobbing — calm, waiting state
   * 'slide-up': rises from bottom — energetic, positive
   * 'fade': subtle fade-in — neutral, minimal distraction
   */
  animationType?: 'float' | 'slide-up' | 'fade';
}

export function EmptyState({
  icon, title, description,
  actionLabel, onAction,
  secondaryActionLabel, onSecondaryAction,
  className = '',
  animationType = 'float',
}: EmptyStateProps) {
  const iconRef    = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      // Under reduced motion, just show everything instantly
      if (iconRef.current) gsap.set(iconRef.current, { opacity: 1, y: 0, scale: 1 });
      if (contentRef.current) gsap.set(contentRef.current, { opacity: 1, y: 0 });
      return;
    }

    // Animate icon based on personality type
    if (iconRef.current) {
      if (animationType === 'float') {
        // Float: perpetual gentle bobbing (2 cycles only)
        gsap.to(iconRef.current, {
          y: -7,
          duration: 2.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: 1,
        });
      } else if (animationType === 'slide-up') {
        // Slide-up: rises from below with scale
        gsap.fromTo(iconRef.current,
          { opacity: 0, y: 20, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
      } else if (animationType === 'fade') {
        // Fade: simple opacity only
        gsap.fromTo(iconRef.current,
          { opacity: 0, scale: 1 },
          { opacity: 1, duration: 0.5, ease: 'cubic-bezier(0, 0, 0.2, 1)' }
        );
      }
    }

    // Fade-up the text content once on mount (same for all types)
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 10 },
        { ...GSAP_CONFIG.fadeIn, delay: animationType === 'float' ? 0.1 : 0.15 },
      );
    }
  }, [prefersReduced, animationType]);

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
