// Design system: border-radius 9999px (full circle)

interface AvatarProps {
  src?: string | null;
  name?: string;
  /** Size in pixels — maps to Tailwind sizes */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show pulsing green status indicator (online/active) */
  status?: 'online' | 'offline';
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

export function Avatar({ src, name = '', size = 'md', status, className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <div className={['relative overflow-hidden rounded-avatar shrink-0 group', sizeClass, className].join(' ')}>
        <img
          src={src}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
        />
        {/* Shimmer sweep on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
             style={{
               background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
               backgroundSize: '200% 100%',
               animation: 'shimmer-sweep 0.6s ease-out',
             }} />
      </div>
    );
  }

  const initials   = name ? getInitials(name) : '?';
  const colorClass = name ? colorFromName(name) : 'bg-gray-200 text-gray-600';

  return (
    <div
      className={[
        'relative overflow-hidden rounded-avatar flex items-center justify-center font-semibold shrink-0 select-none group cursor-default',
        'transition-transform duration-150 hover:scale-110',
        sizeClass, colorClass, className,
      ].join(' ')}
      aria-label={name || 'User avatar'}
      role="img"
    >
      {initials}
      {/* Status indicator pulse */}
      {status && (
        <span className={`
          absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface
          ${status === 'online' ? 'bg-success-500 animate-[statusPulse_2s_ease-in-out_infinite]' : 'bg-gray-400'}
        `} />
      )}
      {/* Shimmer sweep on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none rounded-avatar overflow-hidden">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-sweep 0.55s ease-out',
        }} />
      </div>
    </div>
  );
}
