import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Star, TrendingUp, BookOpen } from 'lucide-react';

interface ParentAuthLayoutProps {
  children: ReactNode;
}

export function ParentAuthLayout({ children }: ParentAuthLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF8' }}>

      {/* ── Brand panel (desktop only) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[460px] flex-col justify-between p-12 flex-shrink-0 relative overflow-hidden"
           style={{ background: 'linear-gradient(145deg, #15803d 0%, #16a34a 50%, #22c55e 100%)' }}>

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
        </div>

        {/* Logo */}
        <Link to="/parent/login" className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 bg-white/25 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight block leading-none">Gradellence</span>
            <span className="text-green-200 text-xs font-medium">Parent Portal</span>
          </div>
        </Link>

        {/* Hero text */}
        <div className="relative z-10">
          <p className="text-4xl font-bold text-white leading-tight mb-5">
            Your child's<br />progress,<br />always in view.
          </p>
          <p className="text-green-100 text-sm leading-relaxed mb-8 max-w-xs">
            View results, track academic performance across all terms, and stay informed about your child's education.
          </p>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: TrendingUp, text: 'Real-time result tracking' },
              { icon: BookOpen,   text: 'Term-by-term performance' },
              { icon: Star,       text: 'Downloadable report cards' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-green-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-green-300 text-xs relative z-10">
          © {new Date().getFullYear()} Gradellence. Parent Portal.
        </p>
      </div>

      {/* ── Form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #15803d, #22c55e)' }}>
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 block leading-none">Gradellence</span>
            <span className="text-xs text-green-600 font-medium">Parent Portal</span>
          </div>
        </div>
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}
