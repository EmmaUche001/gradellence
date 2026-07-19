import React, { useState, useEffect, useCallback } from 'react';
import { BookMarked, Search } from 'lucide-react';
import { superAdminApi } from '../services/superAdminApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { useToastStore } from '../../../store/toastStore';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    schoolId?: string;
    school?: { id: string; name: string } | null;
  };
}

function actionBadge(action: string): BadgeVariant {
  if (action.includes('CREATE')) return 'success';
  if (action.includes('UPDATE') || action.includes('PATCH')) return 'primary';
  if (action.includes('DELETE') || action.includes('REMOVE')) return 'danger';
  if (action.includes('PUBLISH')) return 'info';
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'warning';
  if (action.includes('SUSPEND') || action.includes('CANCEL')) return 'danger';
  return 'gray';
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ENTITY_TYPES = ['', 'Student', 'Teacher', 'Class', 'Subject', 'Assessment', 'Result', 'User', 'School', 'Enrollment'];

const PlatformAuditLogsPage: React.FC = () => {
  const { addToast } = useToastStore();
  const [logs, setLogs]             = useState<AuditEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [actionFilter, setAction]   = useState('');
  const [entityFilter, setEntity]   = useState('');
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getPlatformAuditLogs({
        page, limit,
        action:     actionFilter || undefined,
        entityType: entityFilter || undefined,
      });
      setLogs(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
    } catch {
      addToast('error', 'Failed to load audit logs');
    } finally { setLoading(false); }
  }, [page, actionFilter, entityFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Logs"
        description="Cross-school activity log — every action across all tenants"
      />

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
          {/* Action search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by action (e.g. CREATE)…"
              value={actionFilter}
              onChange={e => { setAction(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400"
            />
          </div>

          {/* Entity type dropdown */}
          <select
            value={entityFilter}
            onChange={e => { setEntity(e.target.value); setPage(1); }}
            className="h-10 px-3 text-sm bg-gray-50 border border-border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700"
          >
            <option value="">All entity types</option>
            {ENTITY_TYPES.filter(Boolean).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {!loading && total > 0 && (
            <span className="text-sm text-gray-500 ml-auto">
              {total.toLocaleString()} log{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-5"><SkeletonTable rows={8} cols={5} /></div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<BookMarked size={40} />}
            title="No audit logs found"
            description="No activity matches your current filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Date / Time', 'Actor', 'School', 'Action', 'Entity', 'Entity ID'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(log.createdAt)}</td>

                    {/* Actor */}
                    <td className="px-5 py-3">
                      {log.actor ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${log.actor.firstName} ${log.actor.lastName}`} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                              {log.actor.firstName} {log.actor.lastName}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate max-w-[120px]">{log.actor.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-mono">System</span>
                      )}
                    </td>

                    {/* School */}
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {log.actor?.school?.name ?? (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Action badge */}
                    <td className="px-5 py-3">
                      <Badge variant={actionBadge(log.action)}>
                        {log.action}
                      </Badge>
                    </td>

                    {/* Entity type */}
                    <td className="px-5 py-3 text-xs font-medium text-gray-700">{log.entityType}</td>

                    {/* Entity ID — truncated */}
                    <td className="px-5 py-3 text-xs text-gray-400 font-mono" title={log.entityId}>
                      {log.entityId?.slice(0, 8)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-sm text-gray-500">Showing {start}–{end} of {total.toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-1">{page}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformAuditLogsPage;
