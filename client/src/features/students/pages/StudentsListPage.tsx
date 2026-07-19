import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Search, Upload, AlertCircle, Download, Loader2 } from 'lucide-react';
import { studentService } from '../../../services/studentService';
import { Student } from '../../../types/student';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { downloadPdf } from '../../../utils/downloadPdf';
import { useToastStore } from '../../../store/toastStore';

export function StudentsListPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [students, setStudents]           = useState<Student[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [total, setTotal]                 = useState(0);
  const [search, setSearch]               = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingSummaryId, setDownloadingSummaryId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await studentService.getAll(page, 20, search || undefined);
      setStudents(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await studentService.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete student');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage all students enrolled in your school"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/students/import')}>
              <Upload size={15} /> Import
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/students/new')}>
              <Plus size={15} /> Add Student
            </Button>
          </>
        }
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {/* Card */}
      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {/* Search toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or admission number…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400"
            />
          </div>
          {!isLoading && total > 0 && (
            <span className="text-sm text-gray-500 ml-auto">{total} student{total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={6} /></div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={40} />}
            title="No students yet"
            description={search ? `No students match "${search}".` : 'Add your first student to get started.'}
            actionLabel={search ? undefined : 'Add Student'}
            onAction={search ? undefined : () => navigate('/students/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Admission No.', 'Name', 'Gender', 'Status', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{s.admissionNumber}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{s.firstName} {s.lastName}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{s.gender || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.isActive ? 'success' : 'danger'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => navigate(`/students/${s.id}/edit`)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                        <button
                          disabled={downloadingSummaryId === s.id}
                          onClick={() => downloadPdf(
                            `/v1/results/academic-summary/${s.id}`,
                            `academic-summary-${s.admissionNumber}.pdf`,
                            () => setDownloadingSummaryId(s.id),
                            () => setDownloadingSummaryId(null),
                            (msg) => addToast('error', msg),
                          )}
                          className="text-sm font-medium text-success-600 hover:text-success-700 flex items-center gap-1 disabled:opacity-40"
                          title="Download Academic Summary"
                        >
                          {downloadingSummaryId === s.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Download size={13} />}
                          Summary
                        </button>
                        <button
                          disabled={downloadingId === s.id}
                          onClick={() => downloadPdf(
                            `/v1/results/transcript/${s.id}`,
                            `transcript-${s.admissionNumber}.pdf`,
                            () => setDownloadingId(s.id),
                            () => setDownloadingId(null),
                            (msg) => addToast('error', msg),
                          )}
                          className="text-sm font-medium text-info-600 hover:text-info-700 flex items-center gap-1 disabled:opacity-40"
                          title="Download Transcript"
                        >
                          {downloadingId === s.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Download size={13} />}
                          Transcript
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete student?"
        message={`"${deleteTarget?.firstName} ${deleteTarget?.lastName}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
