import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, ChevronLeft, LayoutDashboard } from 'lucide-react';
import { ToastContainer } from '../../../components/ui/Toast';

interface ParentPortalLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  showBack?: boolean;
}

export function ParentPortalLayout({ children, pageTitle, showBack = false }: ParentPortalLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('parent_token');
    localStorage.removeItem('parent_refresh_token');
    navigate('/parent/login');
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <ToastContainer />

      {/* ── Top navigation ──────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b"
              style={{ background: '#FFFFFF', borderColor: '#E8EDE8' }}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">

          {/* Left — logo or back */}
          {showBack ? (
            <button
              onClick={() => navigate('/parent/dashboard')}
              className="flex items-center gap-2 text-sm font-medium transition-colors rounded-lg px-2 py-1.5"
              style={{ color: '#15803d' }}
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <Link to="/parent/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #15803d, #22c55e)' }}>
                <GraduationCap size={16} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-bold text-gray-900 block leading-none">Gradellence</span>
                <span className="text-[10px] font-semibold leading-none" style={{ color: '#16a34a' }}>Parent Portal</span>
              </div>
            </Link>
          )}

          {/* Center — page title */}
          {pageTitle && (
            <span className="text-sm font-semibold text-gray-700 ml-1">{pageTitle}</span>
          )}

          {/* Right — nav actions */}
          <div className="ml-auto flex items-center gap-1">
            {showBack && (
              <Link
                to="/parent/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                style={{ color: '#16a34a' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
        {children}
      </main>
    </div>
  );
}
