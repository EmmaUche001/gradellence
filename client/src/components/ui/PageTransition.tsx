import { useRef, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { GSAP_CONFIG, TRANSFORM, DURATION_QUICK } from '../../lib/motion.tokens';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps page content with a smooth GSAP entrance animation.
 * Re-triggers on every route change via location.key.
 * Uses directional awareness — slides left for forward nav, right for back.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const ref       = useRef<HTMLDivElement>(null);
  const location  = useLocation();
  const prevPath  = useRef<string>(location.pathname);

  useEffect(() => {
    if (!ref.current) return;

    // Kill any in-progress tween on this element
    gsap.killTweensOf(ref.current);

    // Determine navigation direction
    const currentPath = location.pathname;
    const previousPath = prevPath.current;
    const isBackNav = previousPath.startsWith(currentPath) || 
      (currentPath === '/dashboard' && previousPath !== '/dashboard');
    prevPath.current = currentPath;

    // Snap to starting state immediately, then animate in
    // Back navigation slides from the right, forward from the left
    gsap.fromTo(
      ref.current,
      {
        opacity: 0,
        y: 16,
        x: isBackNav ? -16 : 16,
        scale: 0.995,
      },
      {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        ...GSAP_CONFIG.pageTransition,
        clearProps: 'transform,opacity',
      },
    );

    // Stagger direct children for a cascading feel
    const children = ref.current.children;
    if (children.length > 0) {
      // Only stagger if the page isn't just one big container
      const targets = Array.from(children).slice(0, 12);
      gsap.fromTo(
        targets,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: (DURATION_QUICK * 0.4) / 1000,
          ease: GSAP_CONFIG.fadeIn.ease,
          stagger: 0.04,
          delay: 0.1,
          clearProps: 'transform,opacity',
        },
      );
    }
  }, [location.key, location.pathname]);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}