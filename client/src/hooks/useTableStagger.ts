import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Animates table rows in with a staggered fade-slide when `ready` becomes true.
 * Attach `ref` to the `<tbody>` element.
 */
export function useTableStagger(ready: boolean) {
  const ref = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!ready || !ref.current) return;

    const rows = ref.current.querySelectorAll('tr');
    if (rows.length === 0) return;

    gsap.fromTo(
      rows,
      { opacity: 0, x: -8 },
      {
        opacity: 1,
        x: 0,
        duration: 0.2,
        stagger: 0.025,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
    );
  }, [ready]);

  return ref;
}
