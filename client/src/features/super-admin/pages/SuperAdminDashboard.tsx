import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { superAdminApi } from '../services/superAdminApi';

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<{ totalSchools: number; totalStudents: number; totalUsers: number; activeSubscriptions: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await superAdminApi.getPlatformStats();
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to fetch platform stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.firstName} {user?.lastName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform administration dashboard. Manage schools, subscriptions, and monitor platform activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Schools</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '-' : stats?.totalSchools ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏫</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '-' : stats?.activeSubscriptions ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '-' : stats?.totalUsers ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '-' : stats?.totalStudents ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/super-admin/schools"
            className="flex items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <span className="text-2xl mr-3">🏫</span>
            <div>
              <p className="font-medium text-indigo-900">Manage Schools</p>
              <p className="text-sm text-indigo-600">View and manage all schools</p>
            </div>
          </a>
          <a
            href="/super-admin/subscriptions"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl mr-3">💳</span>
            <div>
              <p className="font-medium text-green-900">Subscriptions</p>
              <p className="text-sm text-green-600">Manage plans & subscriptions</p>
            </div>
          </a>
          <a
            href="/super-admin/analytics"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-2xl mr-3">📈</span>
            <div>
              <p className="font-medium text-purple-900">Platform Analytics</p>
              <p className="text-sm text-purple-600">View platform-wide metrics</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;