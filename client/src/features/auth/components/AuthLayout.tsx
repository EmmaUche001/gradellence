import { ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Shared layout wrapper for all auth pages.
 * Two-column on desktop (brand panel + form), single-column on mobile.
 */
interface AuthLayoutProps {
  children: ReactNode;
  /** Shown below the logo on the brand panel */
  tagline?: string;
}

export function AuthLayout({ children, tagline = 'Modern academic management for forward-thinking schools.' }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left brand panel (desktop only) ────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-primary-600 flex-col justify-between p-12 flex-shrink-0">
        {/* Logo */}
        <Link to="/login" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <GraduationCap size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">GRADELLENCE</span>
        </Link>

        {/* Tagline */}
        <div>
          <p className="text-3xl font-bold text-white leading-snug mb-4">
            The academic platform schools trust.
          </p>
          <p className="text-primary-200 text-sm leading-relaxed">{tagline}</p>
        </div>

        {/* Footer */}
        <p className="text-primary-300 text-xs">
          © {new Date().getFullYear()} Gradellence. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">GRADELLENCE</span>
        </div>

        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>

    </div>
  );
}
