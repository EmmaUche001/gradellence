import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ToastContainer } from '../components/ui/Toast';

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
} as const;

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
  { label: 'Students', path: '/students', icon: '👨‍🎓', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
  { label: 'Teachers', path: '/teachers', icon: '👨‍🏫', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Classes', path: '/classes', icon: '🏫', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
  { label: 'Subjects', path: '/subjects', icon: '📚', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
  { label: 'Sessions', path: '/sessions', icon: '📅', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Assessments', path: '/assessments', icon: '📝', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
  { label: 'Results', path: '/results', icon: '🏆', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
  { label: 'Grade Scales', path: '/grade-scales', icon: '📊', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Users', path: '/users', icon: '👥', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Roles', path: '/roles', icon: '🛡️', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Analytics', path: '/analytics', icon: '📈', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
  { label: 'Audit Logs', path: '/audit-logs', icon: '📋', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Billing', path: '/billing', icon: '💰', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Settings', path: '/settings', icon: '⚙️', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Subscriptions', path: '/subscriptions', icon: '💳', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: '---', path: '', icon: '', roles: [ROLES.SUPER_ADMIN] },
  { label: 'Super Admin', path: '/super-admin', icon: '⚙️', roles: [ROLES.SUPER_ADMIN] },
];

export function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const visibleNavItems = navItems.filter((item) => {
    if (!user?.roles) return false;
    return item.roles.some((role) => user.roles.includes(role));
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ease-in-out flex-shrink-0`}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-200 flex items-center justify-between min-h-[64px]">
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">GRADELLENCE</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard" className="mx-auto" title="GRADELLENCE">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="ml-2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Collapse sidebar"
            >
              ◀
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="mx-auto mt-2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Expand sidebar"
          >
            ▶
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            if (item.label === '---') {
              return !collapsed ? (
                <div key="separator" className="border-t border-gray-200 my-2" />
              ) : null;
            }
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-200">
          <div className={`flex ${collapsed ? 'justify-center' : 'items-center space-x-3'} mb-2`}>
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-semibold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full text-sm text-red-600 hover:text-red-800 px-2 py-2 rounded-lg hover:bg-red-50 transition-colors ${collapsed ? 'flex justify-center' : 'text-left'}`}
          >
            {collapsed ? '🚪' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
