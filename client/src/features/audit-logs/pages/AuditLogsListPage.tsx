import { useState, useEffect, useCallback } from 'react';
import { BookMarked, AlertCircle } from 'lucide-react';
import { auditLogService } from '../../../services/auditLogService';
import { AuditLog } from '../../../types/auditLog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';

// Map action verb to badge variant
function actionBadge(action: string): BadgeVariant {
  if (action.includes('CREATE')) return 'success';
  if (action.includes('UPDATE') || action.includes('PATCH')) return 'primary';
  if (action.includes('DELETE') || action.includes('REMOVE')) return 'danger';
  if (action.includes('PUBLISH')) return 'info';
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'warning';
  return 'gray';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AuditLogsListPage() {
  const [logs, setLogs]             = useState<AuditLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await auditLogService.getAll(page, 20);
      setLogs(res.data || []);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? (res.data || []).length); }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all activities and changes made within your school"
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-5"><SkeletonTable rows={8} cols={5} /></div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<BookMarked size={40} />}
            title="No audit logs yet"
            description="System activities will be recorded here automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Date / Time', 'Actor', 'Action', 'Entity Type', 'Entity ID'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.actor ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${log.actor.firstName} ${log.actor.lastName}`} size="xs" />
                          <span className="text-sm text-gray-700">{log.actor.firstName} {log.actor.lastName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 font-mono">{log.actorId.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={actionBadge(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{log.entityType}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-400 font-mono" title={log.entityId}>
                        {log.entityId.slice(0, 8)}…
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-sm text-gray-500">Showing {start}–{end} of {total}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
              <span className="text-sm text-gray-600 px-1">{page} / {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
