import { ButtonHTMLAttributes, ReactNode } from 'react';

// Design system: 40×40px, rounded, icon-only button

type IconButtonVariant = 'ghost' | 'primary' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required for screen readers */
  'aria-label': string;
  children: ReactNode;
  variant?: IconButtonVariant;
  /** Override size (defaults to 40px) */
  size?: 'sm' | 'md';
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:   'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  primary: 'text-primary-600 hover:text-primary-700 hover:bg-primary-50',
  danger:  'text-danger-500 hover:text-danger-700 hover:bg-danger-50',
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10', // design system: 40×40px
};

export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={[
        'inline-flex items-center justify-center rounded-lg',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
