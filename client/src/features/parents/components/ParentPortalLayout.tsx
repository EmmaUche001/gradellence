import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, LayoutDashboard } from 'lucide-react';

/** Shared top-navigation shell for authenticated parent pages. */
interface ParentPortalLayoutProps {
  children: ReactNode;
  /** Title shown in the header after the back/nav area */
  pageTitle?: string;
  /** Show a back arrow to the dashboard */
  showBack?: boolean;
}

export function ParentPortalLayout({ children, pageTitle, showBack = false }: ParentPortalLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('parent_token');
    navigate('/parent/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="h-[72px] bg-surface border-b border-border flex items-center px-6 gap-4 sticky top-0 z-30">
        {showBack ? (
          <button onClick={() => navigate('/parent/dashboard')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            ← Back
          </button>
        ) : (
          <Link to="/parent/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-success-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={17} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 hidden sm:block">Gradellence</span>
          </Link>
        )}

        {pageTitle && <h1 className="text-sm font-semibold text-gray-700 ml-2">{pageTitle}</h1>}

        <div className="ml-auto flex items-center gap-2">
          {showBack && (
            <Link to="/parent/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">
              <LayoutDashboard size={15} /> Dashboard
            </Link>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-danger-600 transition-colors px-3 py-2 rounded-lg hover:bg-danger-50">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
