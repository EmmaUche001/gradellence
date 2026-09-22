import { CSSProperties } from 'react';

// Design system: use skeleton loaders instead of spinners.
// Fade-in animation, matches card/table/chart/list shapes.

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** Base skeleton block — pulse animation, gray fill */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={['bg-gray-200 rounded animate-skeleton-pulse', className].join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Shimmer skeleton with gradient sweep animation */
export function SkeletonShimmer({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={['bg-gray-200 rounded relative overflow-hidden', className].join(' ')}
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
    </div>
  );
}

/** Skeleton that morphs into content (use with transition) */
export function SkeletonMorph({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={['bg-gray-200 rounded animate-skeleton-morph', className].join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Single-line text skeleton */
export function SkeletonText({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-4 w-full ${className}`} />;
}

/** Card-shaped skeleton matching the Card component */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-surface rounded-card p-6 shadow-sm ${className}`} aria-hidden="true">
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/** KPI card skeleton */
export function SkeletonKpiCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-surface rounded-card p-6 shadow-sm ${className}`} aria-hidden="true">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

/** Table skeleton — header + n data rows */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-card border border-border overflow-hidden" aria-hidden="true">
      {/* Header */}
      <div className="bg-gray-100 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-surface px-4 py-3 border-t border-border flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Chart placeholder skeleton */
export function SkeletonChart({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-surface rounded-card p-6 shadow-sm ${className}`} aria-hidden="true">
      <div className="space-y-3 mb-4">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

/** List item skeleton */
export function SkeletonListItem({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex items-center gap-3 py-3 ${className}`} aria-hidden="true">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
