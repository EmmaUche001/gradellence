import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, AlertCircle } from 'lucide-react';
import { enrollmentService } from '../../../services/enrollmentService';
import { Enrollment } from '../../../types/enrollment';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

export function EnrollmentsListPage() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const fetchEnrollments = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await enrollmentService.getAll(page, 20);
      setEnrollments(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load enrollments'); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await enrollmentService.remove(deleteTarget.id);
      setDeleteTarget(null); fetchEnrollments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove enrollment');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);
  const targetName = deleteTarget?.student
    ? `${deleteTarget.student.firstName} ${deleteTarget.student.lastName}`
    : 'this student';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        description="Manage student class enrollments"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/enrollments/bulk')}>
              <Users size={15} /> Bulk Enroll
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/enrollments/new')}>
              <Plus size={15} /> New Enrollment
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
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={7} /></div>
        ) : enrollments.length === 0 ? (
          <EmptyState
            icon={<Users size={40} />}
            title="No enrollments yet"
            description="Enrol students in a class to track their academic progress."
            actionLabel="New Enrollment"
            onAction={() => navigate('/enrollments/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Student', 'Admission No.', 'Class', 'Term', 'Enrolled On', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enrollments.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                      {e.student ? `${e.student.firstName} ${e.student.lastName}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{e.student?.admissionNumber || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {e.class ? `${e.class.name} (Level ${e.class.level})` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{e.term?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {new Date(e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={e.status === 'ACTIVE' ? 'success' : 'danger'}>{e.status ?? 'ACTIVE'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setDeleteTarget(e)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Remove</button>
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

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Remove enrollment?" loading={deleting}
        message={`Remove ${targetName}'s enrollment from ${deleteTarget?.class?.name ?? 'this class'}? The student's results will remain.`}
        confirmLabel="Remove" />
    </div>
  );
}
