import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, AlertCircle } from 'lucide-react';
import { subjectService } from '../../../services/subjectService';
import { Subject } from '../../../types/subject';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

export function SubjectsListPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await subjectService.getAll(page, 20, search || undefined);
      setSubjects(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load subjects'); }
    finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await subjectService.remove(deleteTarget.id); setDeleteTarget(null); fetch(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to delete'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader title="Subjects" description="Manage all subjects offered in your school"
        actions={<Button variant="primary" size="sm" onClick={() => navigate('/subjects/new')}><Plus size={15} /> Add Subject</Button>} />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name or code…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400" />
          </div>
          {!isLoading && total > 0 && <span className="text-sm text-gray-500 ml-auto">{total} subject{total !== 1 ? 's' : ''}</span>}
        </div>

        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={5} /></div>
        ) : subjects.length === 0 ? (
          <EmptyState icon={<BookOpen size={40} />} title="No subjects yet"
            description={search ? `No subjects match "${search}".` : 'Add subjects to start assigning them to classes.'}
            actionLabel={search ? undefined : 'Add Subject'} onAction={search ? undefined : () => navigate('/subjects/new')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Code', 'Name', 'Description', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{s.code}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{s.name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 max-w-xs truncate">{s.description || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.isActive ? 'success' : 'danger'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => navigate(`/subjects/${s.id}/edit`)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                        <button onClick={() => setDeleteTarget(s)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
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

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Delete subject?" loading={deleting}
        message={`"${deleteTarget?.name}" will be permanently deleted and removed from all classes.`} confirmLabel="Delete" />
    </div>
  );
}
