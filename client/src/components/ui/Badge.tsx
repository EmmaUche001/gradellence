import { ReactNode } from 'react';

// Design system status badges:
// Published → green | Pending → orange | Draft → gray | Failed → red | Archived → slate

export type BadgeVariant =
  | 'success'   // Published, Active
  | 'warning'   // Pending
  | 'danger'    // Failed
  | 'info'      // Info
  | 'gray'      // Draft, Default
  | 'primary';  // Selected, Primary

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger:  'bg-danger-100  text-danger-700',
  info:    'bg-info-100    text-info-700',
  gray:    'bg-gray-100    text-gray-600',
  primary: 'bg-primary-100 text-primary-700',
};

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        'transition-all duration-150 hover:scale-105 hover:shadow-sm cursor-default',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

// Convenience mapping for common status strings
export function statusToBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active:     'success',
    published:  'success',
    completed:  'success',
    approved:   'success',
    pending:    'warning',
    processing: 'warning',
    draft:      'gray',
    archived:   'gray',
    inactive:   'gray',
    failed:     'danger',
    rejected:   'danger',
    cancelled:  'danger',
    info:       'info',
  };
  return map[status.toLowerCase()] ?? 'gray';
}
