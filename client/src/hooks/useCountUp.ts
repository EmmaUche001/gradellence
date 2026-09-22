import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * Animates a number from 0 to `target` using GSAP's ease-out cubic.
 * Returns the current formatted string value.
 */
export function useCountUp(
  target: number,
  duration = 0.8,
  enabled = true,
): string {
  const [current, setCurrent] = useState(0);
  const obj = useRef({ value: 0 });
  const twRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!enabled) { setCurrent(target); return; }
    if (target === 0) { setCurrent(0); return; }

    obj.current.value = 0;
    twRef.current?.kill();
    twRef.current = gsap.to(obj.current, {
      value: target,
      duration,
      ease: 'power2.out',
      onUpdate: () => setCurrent(Math.round(obj.current.value)),
      onComplete: () => setCurrent(target),
    });

    return () => { twRef.current?.kill(); };
  }, [target, duration, enabled]);

  return current.toLocaleString();
}
