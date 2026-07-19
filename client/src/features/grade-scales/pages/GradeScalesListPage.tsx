import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, AlertCircle } from 'lucide-react';
import { gradeScaleService } from '../../../services/gradeScaleService';
import { GradeScale } from '../../../types/gradeScale';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

// Map grade letter to badge colour
function gradeBadgeVariant(grade: string): BadgeVariant {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'success';
  if (g.startsWith('B')) return 'primary';
  if (g.startsWith('C')) return 'info';
  if (g.startsWith('D')) return 'warning';
  return 'danger';
}

export function GradeScalesListPage() {
  const navigate = useNavigate();
  const [scales, setScales]           = useState<GradeScale[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<GradeScale | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const fetchScales = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await gradeScaleService.getAll(page, 50);
      // Sort descending by minScore so highest grades appear first
      setScales([...res.data].sort((a, b) => b.minScore - a.minScore));
      if (res.meta) setTotalPages(res.meta.totalPages);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load grade scales'); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetchScales(); }, [fetchScales]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await gradeScaleService.remove(deleteTarget.id);
      setDeleteTarget(null); fetchScales();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  // Width of the range bar as percentage of 100-point scale
  const rangeWidth = (s: GradeScale) =>
    Math.min(100, Math.round(((s.maxScore - s.minScore + 1) / 100) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade Scales"
        description="Configure the grading system used for result computation"
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('/grade-scales/new')}>
            <Plus size={15} /> Add Grade Scale
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
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={7} /></div>
        ) : scales.length === 0 ? (
          <EmptyState
            icon={<Layers size={40} />}
            title="No grade scales yet"
            description="Define your grading system so results can be computed and assigned grades."
            actionLabel="Add Grade Scale"
            onAction={() => navigate('/grade-scales/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Score Range', 'Grade', 'Points', 'Range Width', 'Remark', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scales.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">

                    {/* Score range */}
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {s.minScore} – {s.maxScore}
                    </td>

                    {/* Grade badge */}
                    <td className="px-5 py-3.5">
                      <Badge variant={gradeBadgeVariant(s.grade)}>{s.grade}</Badge>
                    </td>

                    {/* Points */}
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-700 tabular-nums">
                      {(s.points ?? 0).toFixed(1)}
                    </td>

                    {/* Range bar */}
                    <td className="px-5 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={[
                              'h-full rounded-full',
                              s.grade.toUpperCase().startsWith('A') ? 'bg-success-500' :
                              s.grade.toUpperCase().startsWith('B') ? 'bg-primary-500' :
                              s.grade.toUpperCase().startsWith('C') ? 'bg-info-500'    :
                              s.grade.toUpperCase().startsWith('D') ? 'bg-warning-500' :
                              'bg-danger-500',
                            ].join(' ')}
                            style={{ width: `${rangeWidth(s)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums w-8">{rangeWidth(s)}%</span>
                      </div>
                    </td>

                    {/* Remark */}
                    <td className="px-5 py-3.5 text-sm italic text-gray-600">{s.remark}</td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <Badge variant={s.isActive ? 'success' : 'gray'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => navigate(`/grade-scales/${s.id}/edit`)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                        <button onClick={() => setDeleteTarget(s)}
                          className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
                      </div>
                    </td>
                  </tr>
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete grade scale?"
        message={`Grade "${deleteTarget?.grade}" (${deleteTarget?.minScore}–${deleteTarget?.maxScore}) will be permanently deleted. Results using this scale may be affected.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
