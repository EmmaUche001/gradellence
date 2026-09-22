import { useCallback } from 'react';

interface RippleOptions {
  x: number;
  y: number;
  size: number;
  color?: string;
}

export function useRipple() {
  const createRipple = useCallback((container: HTMLElement, options: RippleOptions) => {
    const { x, y, size, color = 'rgba(255, 255, 255, 0.4)' } = options;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      background: ${color};
      border-radius: 50%;
      transform: scale(0);
      animation: cardRipple 0.6s ease-out;
      pointer-events: none;
    `;
    
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }, []);

  return { createRipple };
}