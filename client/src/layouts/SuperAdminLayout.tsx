import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/super-admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/super-admin/schools', label: 'Schools', icon: '🏫' },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: '💳' },
  { to: '/super-admin/analytics', label: 'Analytics', icon: '📈' },
  { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: '📋' },
];

const SuperAdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚙️</span>
              <h1 className="text-xl font-bold">SRMS Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-indigo-200">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="px-2 py-1 text-xs bg-yellow-500 text-black rounded-full font-semibold">
                SUPER ADMIN
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-indigo-200 hover:text-white transition-colors"
              >
                Switch to School
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-4rem)]">
          <nav className="mt-4 px-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;