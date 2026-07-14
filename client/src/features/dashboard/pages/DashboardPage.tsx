import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { auditLogService } from '../../../services/auditLogService';
import type { AuditLog } from '../../../types/auditLog';

export function DashboardPage() {
  const { user } = useAuthStore();
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    auditLogService.getAll(1, 10)
      .then((res) => setRecentLogs(res.data || []))
      .catch(() => { /* silently fail */ })
      .finally(() => setLogsLoading(false));
  }, []);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-NG', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE') || action.includes('PATCH')) return 'text-blue-600 bg-blue-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Stats */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to SRMS</h2>
        <p className="text-gray-600 mb-4">
          Hello, {user?.firstName} {user?.lastName}!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900">Students</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900">Teachers</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900">Classes</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Widget */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Link
            to="/audit-logs"
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            View all →
          </Link>
        </div>

        {logsLoading ? (
          <p className="text-sm text-gray-400">Loading activity...</p>
        ) : recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-gray-500 font-medium">Time</th>
                  <th className="text-left pb-2 text-gray-500 font-medium">Actor</th>
                  <th className="text-left pb-2 text-gray-500 font-medium">Action</th>
                  <th className="text-left pb-2 text-gray-500 font-medium">Entity</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="py-2 pr-4">
                      {log.actor ? (
                        <span className="text-gray-700">{log.actor.firstName} {log.actor.lastName}</span>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{log.entityType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
