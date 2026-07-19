import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollText, AlertCircle, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { resultService } from '../../../services/resultService';
import { Result } from '../../../types/result';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { downloadPdf } from '../../../utils/downloadPdf';
import { useToastStore } from '../../../store/toastStore';

// Map grade letter to badge colour
function gradeBadge(grade: string | null): BadgeVariant {
  if (!grade) return 'gray';
  if (grade.startsWith('A')) return 'success';
  if (grade.startsWith('B')) return 'primary';
  if (grade.startsWith('C')) return 'info';
  if (grade.startsWith('D')) return 'warning';
  return 'danger'; // F / E
}

type Filter = 'all' | 'published' | 'draft';

export function ResultsListPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [results, setResults]               = useState<Result[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [total, setTotal]                   = useState(0);
  const [filter, setFilter]                 = useState<Filter>('all');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const filters: { isPublished?: boolean } = {};
      if (filter === 'published') filters.isPublished = true;
      if (filter === 'draft')     filters.isPublished = false;
      const res = await resultService.getAll(page, 20, filters);
      setResults(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load results');
    } finally { setIsLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        description="View and manage computed student results"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/results/broadsheet')}>
            <FileSpreadsheet size={15} /> Broadsheet
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-border">
          {(['all', 'published', 'draft'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={[
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150',
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              ].join(' ')}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {!isLoading && total > 0 && (
            <span className="text-sm text-gray-500 ml-auto">{total} result{total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={7} cols={7} /></div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={<ScrollText size={40} />}
            title="No results found"
            description={filter !== 'all' ? `No ${filter} results.` : 'Compute results from the Broadsheet page.'}
            actionLabel="Open Broadsheet"
            onAction={() => navigate('/results/broadsheet')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Student', 'Subject', 'Term', 'Score', 'Grade', 'Remark', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}
                      </p>
                      {r.student && <p className="text-xs text-gray-400">{r.student.admissionNumber}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {r.subject?.name || '—'}
                      {r.subject?.code && <span className="ml-1 text-xs text-gray-400">({r.subject.code})</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{r.term?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums">
                      {r.totalScore.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.grade ? (
                        <Badge variant={gradeBadge(r.grade)}>{r.grade}</Badge>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 italic">{r.remark || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={r.isPublished ? 'success' : 'gray'}>
                        {r.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.isPublished && r.student && r.term && (
                        <button
                          disabled={downloadingKey === `${r.student.id}-${r.termId}`}
                          onClick={() => {
                            const key = `${r.student!.id}-${r.termId}`;
                            downloadPdf(
                              `/v1/results/report-card/${r.student!.id}/${r.termId}`,
                              `report-card-${r.student!.admissionNumber}-${r.term!.name}.pdf`,
                              () => setDownloadingKey(key),
                              () => setDownloadingKey(null),
                              (msg) => addToast('error', msg),
                            );
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-40"
                          title="Download Report Card"
                        >
                          {downloadingKey === `${r.student.id}-${r.termId}`
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Download size={13} />}
                          Report Card
                        </button>
                      )}
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
