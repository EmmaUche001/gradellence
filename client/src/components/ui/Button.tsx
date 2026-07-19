import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

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
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border border-transparent',
  secondary:
    'bg-surface text-primary-600 border border-primary-600 hover:bg-primary-50 focus:ring-primary-500',
  ghost:
    'bg-transparent text-gray-600 border border-transparent hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500 border border-transparent',
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
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center font-medium rounded-btn',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="animate-spin shrink-0" size={16} />}
      {children}
    </button>
  );
}
