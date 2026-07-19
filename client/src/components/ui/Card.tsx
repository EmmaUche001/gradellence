import { ReactNode } from 'react';

// Design system:
// White bg  |  18px radius  |  24px padding  |  soft shadow
// "No exceptions" — every dashboard card uses this spec

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Remove the default 24px padding (e.g. for tables that need full-bleed) */
  noPadding?: boolean;
  /** Lift card slightly on hover */
  hoverable?: boolean;
}

export function Card({ children, className = '', noPadding = false, hoverable = false }: CardProps) {
  return (
    <div
      className={[
        'bg-surface rounded-card shadow-sm',
        noPadding ? '' : 'p-6',
        hoverable
          ? 'transition-transform duration-150 hover:-translate-y-1 hover:shadow-md cursor-pointer'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div>
        <h3 className="text-card-title text-gray-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
