import { useCallback } from 'react';

interface ConfettiOptions {
  x?: number;
  y?: number;
  count?: number;
  spread?: number;
}

export function useConfetti() {
  const fire = useCallback((options: ConfettiOptions = {}) => {
    const { x = 0, y = 0, count = 20, spread = 120 } = options;
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      width: 0;
      height: 0;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(container);

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const angle = (Math.PI * 2 * i) / count;
      const distance = spread + Math.random() * 40;
      const confettiX = Math.cos(angle) * distance;
      const confettiY = Math.sin(angle) * distance;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 4 + Math.random() * 4;
      
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        --confetti-x: ${confettiX}px;
        --confetti-y: ${confettiY}px;
        animation: confettiBurst 0.6s ease-out forwards;
        opacity: 1;
      `;
      
      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 700);
  }, []);

  return { fire };
}