import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { sessionService } from '../../../services/sessionService';
import { Session } from '../../../types/session';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

export function SessionsListPage() {
  const navigate = useNavigate();
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [sessionTerms, setSessionTerms] = useState<Record<string, any[]>>({});
  const [termsLoading, setTermsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await sessionService.getAll(page, 20);
      setSessions(res.data);
      if (res.meta) setTotalPages(res.meta.totalPages);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load sessions'); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSetCurrentSession = async (id: string) => {
    try { await sessionService.setCurrentSession(id); fetch(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleSetCurrentTerm = async (id: string) => {
    try { await sessionService.setCurrentTerm(id); setSessionTerms({}); fetch(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleToggleTerms = async (sessionId: string) => {
    if (expandedId === sessionId) { setExpandedId(null); return; }
    if (!sessionTerms[sessionId]) {
      setTermsLoading(true);
      try {
        const res = await sessionService.getById(sessionId);
        setSessionTerms(prev => ({ ...prev, [sessionId]: res.data.terms || [] }));
      } catch { setError('Failed to load terms'); }
      finally { setTermsLoading(false); }
    }
    setExpandedId(sessionId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await sessionService.remove(deleteTarget.id); setDeleteTarget(null); fetch(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to delete'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader title="Academic Sessions" description="Manage sessions and their terms"
        actions={<Button variant="primary" size="sm" onClick={() => navigate('/sessions/new')}><Plus size={15} /> Add Session</Button>} />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={4} cols={6} /></div>
        ) : sessions.length === 0 ? (
          <EmptyState icon={<CalendarDays size={40} />} title="No sessions yet"
            description="Create an academic session with 3 terms to start recording results."
            actionLabel="Add Session" onAction={() => navigate('/sessions/new')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['', 'Session', 'Start Date', 'End Date', 'Status', 'Current', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map(s => (
                  <>
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      {/* Expand toggle */}
                      <td className="pl-4 pr-2 py-3.5 w-8">
                        <button onClick={() => handleToggleTerms(s.id)} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                          {expandedId === s.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{s.name}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{fmt(s.startDate)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{fmt(s.endDate)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={s.isActive !== false ? 'success' : 'danger'}>{s.isActive !== false ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.isCurrent ? (
                          <Badge variant="primary">Current</Badge>
                        ) : (
                          <button onClick={() => handleSetCurrentSession(s.id)} className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">Set Current</button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => navigate(`/sessions/${s.id}/edit`)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                          <button onClick={() => setDeleteTarget(s)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded terms */}
                    {expandedId === s.id && (
                      <tr key={`${s.id}-terms`}>
                        <td colSpan={7} className="p-0">
                          <div className="bg-gray-50 border-t border-border px-12 py-4">
                            {termsLoading ? (
                              <p className="text-sm text-gray-400">Loading terms…</p>
                            ) : (sessionTerms[s.id] || []).length === 0 ? (
                              <p className="text-sm text-gray-400">No terms found.</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {['Term', 'Start', 'End', 'Status', 'Current'].map(h => (
                                      <th key={h} className="pb-2 pr-6">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {(sessionTerms[s.id] || []).map((t: any) => (
                                    <tr key={t.id}>
                                      <td className="py-2.5 pr-6 font-medium text-gray-800">{t.name}</td>
                                      <td className="py-2.5 pr-6 text-gray-600">{fmt(t.startDate)}</td>
                                      <td className="py-2.5 pr-6 text-gray-600">{fmt(t.endDate)}</td>
                                      <td className="py-2.5 pr-6">
                                        <Badge variant={t.isActive !== false ? 'success' : 'danger'} >{t.isActive !== false ? 'Active' : 'Inactive'}</Badge>
                                      </td>
                                      <td className="py-2.5 pr-6">
                                        {t.isCurrent ? (
                                          <Badge variant="primary">Current</Badge>
                                        ) : (
                                          <button onClick={() => handleSetCurrentTerm(t.id)} className="text-xs font-medium text-primary-600 hover:underline">Set Current</button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <span className="text-sm text-gray-600">{page} / {totalPages}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Delete session?" loading={deleting}
        message={`"${deleteTarget?.name}" and all its terms will be permanently deleted.`} confirmLabel="Delete" />
    </div>
  );
}
