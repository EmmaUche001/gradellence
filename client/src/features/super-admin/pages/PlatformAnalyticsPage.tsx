import React, { useState, useEffect, useCallback } from 'react';
import { superAdminApi } from '../services/superAdminApi';
import type { PlatformStats, RevenueData } from '../types';

const PlatformAnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, revenueRes] = await Promise.all([
        superAdminApi.getPlatformStats(),
        superAdminApi.getRevenueStats(period),
      ]);
      setStats(statsRes.data.data);
      setRevenue(revenueRes.data.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const metrics = [
    { label: 'Total Schools', value: stats?.totalSchools ?? '-', color: 'indigo' },
    { label: 'Active Schools', value: stats?.activeSchools ?? '-', color: 'green' },
    { label: 'Total Users', value: stats?.totalUsers ?? '-', color: 'blue' },
    { label: 'Total Students', value: stats?.totalStudents ?? '-', color: 'purple' },
    { label: 'Total Teachers', value: stats?.totalTeachers ?? '-', color: 'orange' },
    { label: 'Active Subscriptions', value: stats?.activeSubscriptions ?? '-', color: 'teal' },
    { label: 'Total Revenue', value: stats ? `₦${stats.totalRevenue.toLocaleString()}` : '-', color: 'emerald' },
    { label: 'MRR', value: stats ? `₦${stats.monthlyRecurringRevenue.toLocaleString()}` : '-', color: 'pink' },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    green: { bg: 'bg-green-100', text: 'text-green-700' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Platform-wide metrics and performance insights.</p>
        </div>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d', '1y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading analytics data...</div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric) => {
              const colors = colorClasses[metric.color] || colorClasses.indigo;
              return (
                <div key={metric.label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <p className="text-sm text-gray-500 font-medium mb-1">{metric.label}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <span className={`text-lg ${colors.text}`}>{metric.label[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
            {revenue && revenue.labels.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-end space-x-1" style={{ height: '200px' }}>
                  {revenue.revenue.map((value, i) => {
                    const max = Math.max(...revenue.revenue, 1);
                    const height = (value / max) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors relative group"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                          ₦{value.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  {revenue.labels.map((label, i) => (
                    <span key={i} className="truncate" style={{ maxWidth: `${100 / revenue.labels.length}%` }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No revenue data available for this period.</p>
            )}
          </div>

          {/* Active Subscriptions Chart */}
          {revenue && revenue.subscriptions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Subscriptions</h2>
              <div className="flex items-end space-x-1" style={{ height: '150px' }}>
                {revenue.subscriptions.map((value, i) => {
                  const max = Math.max(...revenue.subscriptions, 1);
                  const height = (value / max) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-colors relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                {revenue.labels.map((label, i) => (
                  <span key={i} className="truncate" style={{ maxWidth: `${100 / revenue.labels.length}%` }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlatformAnalyticsPage;