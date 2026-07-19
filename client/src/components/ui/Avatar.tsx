// Design system: border-radius 9999px (full circle)

interface AvatarProps {
  src?: string | null;
  name?: string;
  /** Size in pixels — maps to Tailwind sizes */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// Deterministic color from name
const bgColors = [
  'bg-primary-100 text-primary-700',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
  'bg-info-100    text-info-700',
  'bg-gray-200    text-gray-700',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return bgColors[Math.abs(hash) % bgColors.length];
}

export function Avatar({ src, name = '', size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={['rounded-avatar object-cover shrink-0', sizeClass, className].join(' ')}
      />
    );
  }

  const initials = name ? getInitials(name) : '?';
  const colorClass = name ? colorFromName(name) : 'bg-gray-200 text-gray-600';

  return (
    <div
      className={[
        'rounded-avatar flex items-center justify-center font-semibold shrink-0 select-none',
        sizeClass,
        colorClass,
        className,
      ].join(' ')}
      aria-label={name || 'User avatar'}
      role="img"
    >
      {initials}
    </div>
  );
}
