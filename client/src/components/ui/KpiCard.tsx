import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Design system: KPI cards for dashboard overview
// Uses Card spec: white, 18px radius, 24px padding, soft shadow

interface KpiCardProps {
  title: string;
  value: string | number;
  /** e.g. "+12%" or "-5" */
  change?: string;
  /** Whether the change is positive/negative/neutral for color coding */
  trend?: 'up' | 'down' | 'neutral';
  /** Lucide icon element */
  icon?: ReactNode;
  /** Icon background color class */
  iconColor?: string;
  className?: string;
}

const trendConfig = {
  up:      { icon: TrendingUp,   classes: 'text-success-600' },
  down:    { icon: TrendingDown, classes: 'text-danger-600' },
  neutral: { icon: Minus,        classes: 'text-gray-400' },
};

export function KpiCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  iconColor = 'bg-primary-50 text-primary-600',
  className = '',
}: KpiCardProps) {
  const TrendIcon = trendConfig[trend].icon;
  const trendClass = trendConfig[trend].classes;

  return (
    <div
      className={[
        'bg-surface rounded-card p-6 shadow-sm',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>

          {change && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${trendClass}`}>
              <TrendIcon size={13} />
              <span>{change}</span>
            </div>
          )}
        </div>

        {icon && (
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ml-4 ${iconColor}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
