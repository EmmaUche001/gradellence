import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface UseAnimatedCounterOptions {
  end: number;
  duration?: number;
  startOnView?: boolean;
}

export function useAnimatedCounter({ end, duration = 1000, startOnView = true }: UseAnimatedCounterOptions) {
  const [display, setDisplay] = useState(end);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setDisplay(end);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const obj = { value: 0 };
            gsap.to(obj, {
              value: end,
              duration: duration / 1000,
              ease: 'power3.out',
              onUpdate: () => {
                setDisplay(Math.round(obj.value));
              }
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [end, startOnView, duration]);

  return { display, elementRef };
}
