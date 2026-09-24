import { ButtonHTMLAttributes, ReactNode, useEffect, useRef, useState } from 'react';

// Design system:
// Primary   — blue bg, white text, 48px height, 10px radius, hover darker blue
// Secondary — white bg, blue border, blue text
// Ghost     — transparent, gray text, hover gray bg
// Danger    — red bg, white text
// Sizes: sm (36px), md (48px full spec), lg (52px)

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Renders button as full width */
  fullWidth?: boolean;
  /** Text to show while loading (replaces children) */
  loadingText?: string;
  /** Show success state with checkmark for 1s after success */
  successText?: string;
  onSuccess?: () => void;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border border-transparent disabled:bg-gray-100 disabled:text-gray-400',
  secondary:
    'bg-surface text-primary-600 border border-primary-600 hover:bg-primary-50 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200',
  ghost:
    'bg-transparent text-gray-600 border border-transparent hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400 disabled:text-gray-300 disabled:hover:bg-transparent',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500 border border-transparent disabled:bg-gray-100 disabled:text-gray-400',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-sm gap-2',   // 48px = design system btn height
  lg: 'h-[52px] px-6 text-base gap-2',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  loadingText,
  successText,
  onSuccess,
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: currentColor;
      opacity: 0.3;
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);

    onClick?.(e);

    // Trigger success state if successText provided
    if (successText && !loading) {
      setShowSuccess(true);
      onSuccess?.();
      setTimeout(() => setShowSuccess(false), 1000);
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const classes = [
    'inline-flex items-center justify-center font-medium rounded-btn',
    'transition-all duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed',
    'active:scale-[0.97] active:brightness-95',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={buttonRef}
      className={classes}
      disabled={disabled || loading || showSuccess}
      onClick={handleClick}
      {...props}
    >
      {showSuccess && successText ? (
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-success-500 flex items-center justify-center text-white text-xs">✓</span>
          {successText}
        </span>
      ) : loading && loadingText ? (
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-dot-pulse" style={{ animationDelay: '0s' }} />
          {loadingText}
        </span>
      ) : loading ? (
        <span className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-dot-pulse" style={{ animationDelay: '0s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-dot-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-dot-pulse" style={{ animationDelay: '0.4s' }} />
        </span>
      ) : null}
      {!loading && !showSuccess && children}
    </button>
  );
}
