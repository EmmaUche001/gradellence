import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, School,
  ClipboardCheck, BarChart3, Shield, Settings, CreditCard,
  Bell, ChevronDown, LogOut, Menu,
  BookMarked, CalendarDays, ScrollText, Layers, Megaphone,
  KeyRound,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ToastContainer } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { ChangePasswordModal } from '../components/ui/ChangePasswordModal';
import { GlobalSearch } from '../components/ui/GlobalSearch';
import { subscriptionService } from '../services/subscriptionService';

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
} as const;

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const iconSize = 18;

const navGroups: NavGroup[] = [
  {
    heading: 'MAIN',
    items: [
      {
        label: 'Dashboard', path: '/dashboard',
        icon: <LayoutDashboard size={iconSize} />,
        roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER],
      },
    ],
  },
  {
    heading: 'ACADEMICS',
    items: [
      { label: 'Students',    path: '/students',    icon: <GraduationCap size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
      { label: 'Teachers',    path: '/teachers',    icon: <Users          size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
      { label: 'Classes',     path: '/classes',     icon: <School         size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
      { label: 'Subjects',    path: '/subjects',    icon: <BookOpen       size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
      { label: 'Assessments', path: '/assessments', icon: <ClipboardCheck size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
      { label: 'Results',     path: '/results',     icon: <ScrollText     size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
      { label: 'Grade Scales',path: '/grade-scales',icon: <Layers         size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
    ],
  },
  {
    heading: 'ADMINISTRATION',
    items: [
      { label: 'Users',      path: '/users',          icon: <Users      size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
      { label: 'Roles',      path: '/roles',          icon: <Shield     size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
      { label: 'Announcements', path: '/announcements', icon: <Megaphone size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
      { label: 'Analytics',  path: '/analytics',      icon: <BarChart3  size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER] },
      { label: 'Audit Logs', path: '/audit-logs',     icon: <BookMarked size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
    ],
  },
  {
    heading: 'ACCOUNT',
    items: [
      { label: 'Billing',       path: '/billing',       icon: <CreditCard   size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
      { label: 'Subscriptions', path: '/subscriptions', icon: <CalendarDays size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
      { label: 'Settings',      path: '/settings',      icon: <Settings     size={iconSize} />, roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
    ],
  },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dynamic school name + plan
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [planName, setPlanName]     = useState<string | null>(null);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    subscriptionService.getMyPlan()
      .then(r => {
        if (r.data) setPlanName(r.data.plan?.name ?? null);
      })
      .catch(() => {});

    // Fetch school name
    if (user?.schoolId) {
      import('../services/apiClient').then(({ default: apiClient }) => {
        apiClient.get(`/v1/schools/${user.schoolId}`)
          .then((res: any) => {
            const s = res.data?.data ?? res.data;
            if (s?.name) setSchoolName(s.name);
          })
          .catch(() => {});
      });
    }
  }, [user?.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Role display label
  const roleLabel = (() => {
    const roles = user?.roles ?? [];
    if (roles.includes('SUPER_ADMIN'))  return 'Super Admin';
    if (roles.includes('SCHOOL_ADMIN')) return 'School Admin';
    if (roles.includes('TEACHER'))      return 'Teacher';
    if (roles.includes('STUDENT'))      return 'Student';
    return 'User';
  })();

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userRoles: string[] = user?.roles ?? [];
  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  const sidebarWidth = collapsed ? 'w-[88px]' : 'w-[280px]';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center border-b border-gray-100 flex-shrink-0 ${collapsed ? 'h-[72px] justify-center px-4' : 'h-[72px] px-5'}`}>
        {collapsed ? (
          <Link to="/dashboard">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
          </Link>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-1">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">GRADELLENCE</span>
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Collapse sidebar"
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      {/* School info (expanded only) */}
      {!collapsed && (
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <School size={16} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                {schoolName ?? 'Your School'}
              </p>
              {planName && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-600 text-white mt-0.5">
                  {planName}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center pt-2 flex-shrink-0">
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Expand sidebar"
          >
            <Menu size={18} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) =>
            item.roles.some((r) => userRoles.includes(r))
          );
          if (visible.length === 0) return null;
          return (
            <div key={group.heading} className="mb-2">
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {group.heading}
                </p>
              )}
              {visible.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      collapsed ? 'justify-center' : '',
                      active
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    ].join(' ')}
                  >
                    <span className={`shrink-0 ${active ? 'text-primary-600' : ''}`}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3 flex-shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size="sm" />
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col ${sidebarWidth} bg-surface border-r border-border flex-shrink-0 transition-all duration-200 ease-out`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] bg-surface flex flex-col h-full shadow-lg animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="h-[72px] bg-surface border-b border-border flex items-center px-6 gap-4 flex-shrink-0 sticky top-0 z-30">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <GlobalSearch />

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Notifications">
              <Bell size={20} />
            </button>

            {/* Help */}
            <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Help">
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                <span className="text-[11px] font-bold text-gray-500">?</span>
              </div>
            </button>

            {/* School switcher */}
            <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border border-border">
              <School size={16} className="text-gray-500" />
              <span className="max-w-[140px] truncate">{schoolName ?? 'Your School'}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="User menu"
              >
                <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size="sm" />
                <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
              </button>

              {/* Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-surface rounded-xl shadow-md border border-border py-1.5 z-50 animate-fade-in">
                  {/* User info */}
                  <div className="px-4 py-2.5 border-b border-border">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    <p className="text-xs text-primary-600 font-medium mt-0.5">{roleLabel}</p>
                  </div>

                  {/* Menu items */}
                  <button
                    onClick={() => { setShowProfileMenu(false); setShowChangePwd(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <KeyRound size={15} className="text-gray-400" />
                    Change Password
                  </button>

                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1440px] mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <ChangePasswordModal isOpen={showChangePwd} onClose={() => setShowChangePwd(false)} />
      <ToastContainer />
    </div>
  );
}
