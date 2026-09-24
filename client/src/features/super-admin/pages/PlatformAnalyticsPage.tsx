import React, { useState, useEffect, useCallback } from 'react';
import { School, Users, GraduationCap, CreditCard, TrendingUp, DollarSign, BarChart3, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { superAdminApi } from '../services/superAdminApi';
import type { PlatformStats, RevenueData } from '../types';
import { PageHeader } from '../../../components/ui/PageHeader';
import { KpiCard } from '../../../components/ui/KpiCard';
import { Card, CardHeader } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonKpiCard, SkeletonChart } from '../../../components/ui/SkeletonLoader';
import { chartColors } from '../../../lib/tokens';

type Period = '7d' | '30d' | '90d' | '1y';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-semibold text-gray-800">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">
            {p.dataKey === 'revenue' ? `₦${Number(p.value).toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const PlatformAnalyticsPage: React.FC = () => {
  const [stats, setStats]   = useState<PlatformStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, rr] = await Promise.all([
        superAdminApi.getPlatformStats(),
        superAdminApi.getRevenueStats(period),
      ]);
      setStats(sr.data.data);
      setRevenue(rr.data.data);
    } catch (err) { console.error('Failed to fetch analytics:', err); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Build chart data
  const revenueChartData = revenue?.labels.map((label, i) => ({
    label, revenue: revenue.revenue[i], subscriptions: revenue.subscriptions[i],
  })) ?? [];

  const fmt = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Platform Analytics" description="Platform-wide metrics and performance insights" />

        {/* Period picker */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {(['7d', '30d', '90d', '1y'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === p ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard title="Total Schools"    value={(stats.totalSchools ?? 0).toLocaleString()}
            icon={<School    size={20} className="text-primary-600" />} iconColor="bg-primary-50 text-primary-600" />
          <KpiCard title="Active Schools"   value={(stats.activeSchools ?? 0).toLocaleString()}
            icon={<UserCheck size={20} className="text-success-600" />} iconColor="bg-success-50 text-success-600"
            trend="up" change={`${stats.activeSchools} active`} />
          <KpiCard title="Total Users"      value={(stats.totalUsers ?? 0).toLocaleString()}
            icon={<Users     size={20} className="text-info-600"    />} iconColor="bg-info-50 text-info-600" />
          <KpiCard title="Total Students"   value={(stats.totalStudents ?? 0).toLocaleString()}
            icon={<GraduationCap size={20} className="text-warning-600" />} iconColor="bg-warning-50 text-warning-600" />
          <KpiCard title="Total Teachers"   value={(stats.totalTeachers ?? 0).toLocaleString()}
            icon={<Users     size={20} className="text-primary-600" />} iconColor="bg-primary-50 text-primary-600" />
          <KpiCard title="Active Subscriptions" value={(stats.activeSubscriptions ?? 0).toLocaleString()}
            icon={<CreditCard size={20} className="text-success-600" />} iconColor="bg-success-50 text-success-600" />
          <KpiCard title="Total Revenue"    value={fmt(stats.totalRevenue ?? 0)}
            icon={<DollarSign size={20} className="text-success-600" />} iconColor="bg-success-50 text-success-600"
            trend="up" />
          <KpiCard title="MRR"              value={fmt(stats.monthlyRecurringRevenue ?? 0)}
            icon={<TrendingUp size={20} className="text-primary-600" />} iconColor="bg-primary-50 text-primary-600"
            trend="up" />
        </div>
      ) : null}

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SkeletonChart /><SkeletonChart />
        </div>
      ) : revenueChartData.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Revenue bar chart */}
          <Card>
            <CardHeader title="Revenue Over Time" description={`Last ${period}`} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill={chartColors.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Subscriptions line chart */}
          <Card>
            <CardHeader title="Active Subscriptions" description={`Trend over last ${period}`} />
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="subscriptions" name="Subscriptions"
                  stroke={chartColors.primary} strokeWidth={2.5}
                  dot={{ r: 4, fill: chartColors.primary, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : !loading ? (
        <Card>
          <EmptyState icon={<BarChart3 size={36} />} title="No revenue data" description="No revenue data available for this period." />
        </Card>
      ) : null}
    </div>
  );
};

export default PlatformAnalyticsPage;
