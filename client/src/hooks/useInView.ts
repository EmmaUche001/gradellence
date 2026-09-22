import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn' | 'stagger';
}

export function useInView({ threshold = 0.1, rootMargin = '0px', triggerOnce = true, animation = 'slideUp' }: UseInViewOptions = {}) {
  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            setHasTriggered(true);
            observer.disconnect();
          }

          // GSAP animations
          if (animation === 'fadeIn') {
            gsap.fromTo(element, 
              { opacity: 0 },
              { opacity: 1, duration: 0.6, ease: 'power2.out' }
            );
          } else if (animation === 'slideUp') {
            gsap.fromTo(element,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
            );
          } else if (animation === 'scaleIn') {
            gsap.fromTo(element,
              { opacity: 0, scale: 0.95 },
              { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
            );
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, animation]);

  return { ref, isInView: isInView || hasTriggered };
}
