import { useState, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayMs?: number;
}

export function Tooltip({ children, content, side = 'top', delayMs = 200 }: TooltipProps) {
  const [show, setShow] = useState(false);
  let timeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    timeout = setTimeout(() => setShow(true), delayMs);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeout);
    setShow(false);
  };

  const positionClasses: Record<string, string> = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent',
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div
          className={`absolute ${positionClasses[side]} px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap z-50 pointer-events-none`}
        >
          {content}
          <div className={`absolute ${arrowClasses[side]} border-gray-900`} />
        </div>
      )}
    </div>
  );
}
