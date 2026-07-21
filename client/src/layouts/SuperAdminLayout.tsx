import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, School, CreditCard, BarChart3,
  LogOut, ArrowLeftRight, Shield, BookMarked, Users, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { ToastContainer } from '../components/ui/Toast';

interface ErrorBoundaryState { hasError: boolean; message: string }
class SuperAdminErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 p-8 text-center">
          <AlertTriangle size={40} className="text-warning-500" />
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500 max-w-md">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const navItems = [
  { to: '/super-admin',                    label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/super-admin/schools',            label: 'Schools',       icon: School },
  { to: '/super-admin/subscriptions',      label: 'Plans',         icon: CreditCard },
  { to: '/super-admin/active-subs',        label: 'Subscriptions', icon: Users },
  { to: '/super-admin/analytics',          label: 'Analytics',     icon: BarChart3 },
  { to: '/super-admin/audit-logs',         label: 'Audit Logs',    icon: BookMarked },
];

const SuperAdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-900 flex">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="w-[240px] bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Gradellence</p>
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
              ].join(' ')}
            >
              <item.icon size={17} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeftRight size={15} />
            Switch to School
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">{user?.firstName} {user?.lastName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded text-gray-500 hover:text-danger-400 transition-colors"
              aria-label="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-warning-500/20 text-warning-400 border border-warning-500/30 uppercase tracking-wider">
              Platform Admin
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-[1440px] mx-auto p-6 lg:p-8">
            <SuperAdminErrorBoundary>
              <Outlet />
            </SuperAdminErrorBoundary>
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export default SuperAdminLayout;
