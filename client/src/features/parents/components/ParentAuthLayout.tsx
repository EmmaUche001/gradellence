import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

/**
 * Shared auth layout for parent portal login & register pages.
 * Two-column on desktop (brand panel + form), single-column on mobile.
 */
interface ParentAuthLayoutProps {
  children: ReactNode;
}

export function ParentAuthLayout({ children }: ParentAuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Brand panel (desktop only) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[440px] bg-success-600 flex-col justify-between p-12 flex-shrink-0">
        <Link to="/parent/login" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <GraduationCap size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Gradellence</span>
        </Link>

        <div>
          <p className="text-3xl font-bold text-white leading-snug mb-4">
            Stay connected to your child's progress.
          </p>
          <p className="text-success-200 text-sm leading-relaxed">
            View results, track academic performance, and stay informed — all in one place.
          </p>
        </div>

        <p className="text-success-300 text-xs">
          © {new Date().getFullYear()} Gradellence. Parent Portal.
        </p>
      </div>

      {/* ── Form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-success-600 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Gradellence</span>
        </div>
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}
