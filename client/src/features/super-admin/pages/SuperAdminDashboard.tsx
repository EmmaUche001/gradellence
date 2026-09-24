import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { School, CreditCard, Users, GraduationCap, BarChart3, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { superAdminApi } from '../services/superAdminApi';
import type { PlatformStats } from '../types';
import { KpiCard } from '../../../components/ui/KpiCard';
import { SkeletonKpiCard } from '../../../components/ui/SkeletonLoader';

const quickActions = [
  {
    label: 'Manage Schools',
    description: 'View and manage all registered schools',
    to: '/super-admin/schools',
    icon: School,
    iconBg: 'bg-primary-50 text-primary-600',
    bg: 'hover:bg-primary-50',
  },
  {
    label: 'Subscription Plans',
    description: 'Manage plans & pricing',
    to: '/super-admin/subscriptions',
    icon: CreditCard,
    iconBg: 'bg-success-50 text-success-600',
    bg: 'hover:bg-success-50',
  },
  {
    label: 'Platform Analytics',
    description: 'View platform-wide metrics',
    to: '/super-admin/analytics',
    icon: BarChart3,
    iconBg: 'bg-warning-50 text-warning-600',
    bg: 'hover:bg-warning-50',
  },
];

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats]     = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminApi.getPlatformStats()
      .then(res => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-page-title text-gray-900">Welcome, {user?.firstName}</h1>
        <p className="mt-1 text-sm text-gray-500">Platform administration — manage schools, subscriptions, and monitor activity.</p>
      </div>

      {/* KPI cards */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Overview</h2>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KpiCard title="Total Schools"          value={(stats?.totalSchools ?? 0).toLocaleString()}
              icon={<School        size={20} className="text-primary-600" />} iconColor="bg-primary-50 text-primary-600" />
            <KpiCard title="Active Subscriptions"   value={(stats?.activeSubscriptions ?? 0).toLocaleString()}
              icon={<CreditCard    size={20} className="text-success-600" />} iconColor="bg-success-50 text-success-600" />
            <KpiCard title="Total Users"            value={(stats?.totalUsers ?? 0).toLocaleString()}
              icon={<Users         size={20} className="text-info-600"    />} iconColor="bg-info-50 text-info-600"       />
            <KpiCard title="Total Students"         value={(stats?.totalStudents ?? 0).toLocaleString()}
              icon={<GraduationCap size={20} className="text-warning-600" />} iconColor="bg-warning-50 text-warning-600" />
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(action => (
            <Link
              key={action.to}
              to={action.to}
              className={`group bg-surface rounded-card p-5 shadow-sm border border-border flex items-start gap-4 transition-all duration-150 ${action.bg} hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}>
                <action.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
              </div>
              <ArrowUpRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SuperAdminDashboard;
