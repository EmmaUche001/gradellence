import { useState, useEffect } from 'react';
import { auditLogService } from '../../../services/auditLogService';
import { AuditLog } from '../../../types/auditLog';

export function AuditLogsListPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditLogService.getAll(page, limit);
      setLogs(res.data || []);
      if (res.meta) setTotalPages(res.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE') || action.includes('PATCH')) return 'text-blue-600 bg-blue-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading audit logs...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">Track all activities and changes made within your school.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header">Date/Time</th>
                <th className="table-header">Actor</th>
                <th className="table-header">Action</th>
                <th className="table-header">Entity</th>
                <th className="table-header">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-gray-400 py-8">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="table-cell text-sm text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="table-cell">
                      {log.actor ? (
                        <span className="text-sm">{log.actor.firstName} {log.actor.lastName}</span>
                      ) : (
                        <span className="text-sm text-gray-400">{log.actorId}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="table-cell text-sm">{log.entityType}</td>
                    <td className="table-cell text-sm text-gray-500 font-mono max-w-[120px] truncate" title={log.entityId}>
                      {log.entityId.substring(0, 8)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex space-x-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}