import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus, Upload, AlertCircle, Grid3x3 } from 'lucide-react';
import { assessmentService } from '../../../services/assessmentService';
import { Assessment } from '../../../types/assessment';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

// Assessment type → badge variant
function typeBadge(type: string) {
  const map: Record<string, 'primary' | 'info' | 'warning' | 'success' | 'gray'> = {
    CA1: 'primary', CA2: 'primary', CA3: 'primary', EXAM: 'info',
  };
  return map[type] ?? 'gray';
}

export function AssessmentsListPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  // Confirm dialogs
  const [deleteTarget, setDeleteTarget]   = useState<Assessment | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const fetchAssessments = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await assessmentService.getAll(page, 20);
      setAssessments(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assessments');
    } finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assessmentService.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchAssessments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Manage student scores and assessments"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/assessments/import')}>
              <Upload size={15} /> Import Scores
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/assessments/score-entry')}>
              <Grid3x3 size={15} /> Score Entry
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/assessments/new')}>
              <Plus size={15} /> New Assessment
            </Button>
          </>
        }
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          {!isLoading && total > 0 && (
            <span className="text-sm text-gray-500 ml-auto">{total} assessment{total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={7} /></div>
        ) : assessments.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={40} />}
            title="No assessments yet"
            description="Record student scores to get started."
            actionLabel="New Assessment"
            onAction={() => navigate('/assessments/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Student', 'Subject', 'Type', 'Score', 'Term', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assessments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {a.student ? `${a.student.firstName} ${a.student.lastName}` : '—'}
                      </p>
                      {a.student && <p className="text-xs text-gray-400">{a.student.admissionNumber}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{a.subject?.name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={typeBadge(a.type)}>{a.type}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 tabular-nums">
                      {a.score} <span className="text-gray-400 font-normal">/ {a.maxScore}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{a.term?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => navigate(`/assessments/${a.id}/edit`)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                        <button onClick={() => setDeleteTarget(a)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
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
            <p className="text-sm text-gray-500">Showing {start}–{end} of {total}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
              <span className="text-sm text-gray-600 px-1">{page} / {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete assessment?"
        message="This assessment and its scores will be permanently removed."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
