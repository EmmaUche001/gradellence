import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Plus, Search, AlertCircle } from 'lucide-react';
import { classService } from '../../../services/classService';
import { subjectService } from '../../../services/subjectService';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';

export function ClassesListPage() {
  const navigate = useNavigate();
  const [classes, setClasses]           = useState<Class[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [classSubjects, setClassSubjects] = useState<Record<string, Subject[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Subject modal
  const [modalClass, setModalClass]         = useState<Class | null>(null);
  const [allSubjects, setAllSubjects]       = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [modalLoading, setModalLoading]     = useState(false);
  const [modalSaving, setModalSaving]       = useState(false);

  const fetchClasses = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await classService.getAll(page, 20, search || undefined);
      setClasses(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
      const subMap: Record<string, Subject[]> = {};
      await Promise.all(res.data.map(async c => {
        try { subMap[c.id] = (await classService.getClassSubjects(c.id)).data; }
        catch { subMap[c.id] = []; }
      }));
      setClassSubjects(subMap);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load classes');
    } finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await classService.remove(deleteTarget.id); setDeleteTarget(null); fetchClasses(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to delete'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const openSubjectModal = async (cls: Class) => {
    setModalClass(cls); setModalLoading(true); setError(null);
    try {
      const [sr, ar] = await Promise.all([subjectService.getAll(1, 100), classService.getClassSubjects(cls.id)]);
      setAllSubjects(sr.data.filter(s => s.isActive));
      setSelectedIds(new Set(ar.data.map(s => s.id)));
    } catch { setError('Failed to load subjects'); }
    finally { setModalLoading(false); }
  };

  const saveSubjects = async () => {
    if (!modalClass) return;
    setModalSaving(true);
    try {
      await classService.assignSubjects(modalClass.id, Array.from(selectedIds));
      setClassSubjects(prev => ({ ...prev, [modalClass.id]: allSubjects.filter(s => selectedIds.has(s.id)) }));
      setModalClass(null);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save subjects'); }
    finally { setModalSaving(false); }
  };

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader title="Classes" description="Manage classes and their subject assignments"
        actions={<Button variant="primary" size="sm" onClick={() => navigate('/classes/new')}><Plus size={15} /> Add Class</Button>} />

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
            <input type="text" placeholder="Search classes…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400" />
          </div>
          {!isLoading && total > 0 && <span className="text-sm text-gray-500 ml-auto">{total} class{total !== 1 ? 'es' : ''}</span>}
        </div>

        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={7} /></div>
        ) : classes.length === 0 ? (
          <EmptyState icon={<School size={40} />} title="No classes yet"
            description={search ? `No classes match "${search}".` : 'Create your first class to begin organising students.'}
            actionLabel={search ? undefined : 'Add Class'} onAction={search ? undefined : () => navigate('/classes/new')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Name', 'Class Teacher', 'Students', 'Subjects', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.map(cls => {
                  const subs = classSubjects[cls.id] ?? [];
                  return (
                    <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{cls.name}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {cls.classTeacher ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{cls._count?.enrollments ?? 0}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 items-center">
                          {subs.length === 0 ? (
                            <button onClick={() => openSubjectModal(cls)} className="text-xs text-primary-600 hover:underline">Assign subjects</button>
                          ) : (
                            <>
                              {subs.slice(0, 3).map(s => (
                                <Badge key={s.id} variant="primary">{s.name}</Badge>
                              ))}
                              {subs.length > 3 && <Badge variant="gray">+{subs.length - 3}</Badge>}
                              <button onClick={() => openSubjectModal(cls)} className="text-xs text-primary-600 hover:underline ml-1">Edit</button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={cls.isActive ? 'success' : 'danger'}>{cls.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => navigate(`/classes/${cls.id}/edit`)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                          <button onClick={() => setDeleteTarget(cls)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
        title="Delete class?" loading={deleting}
        message={`"${deleteTarget?.name}" and all related data will be permanently removed.`} confirmLabel="Delete" />

      <Modal isOpen={!!modalClass} onClose={() => setModalClass(null)} size="md"
        title={`Subjects — ${modalClass?.name}`}
        footer={<><Button variant="ghost" onClick={() => setModalClass(null)}>Cancel</Button><Button variant="primary" onClick={saveSubjects} loading={modalSaving}>Save</Button></>}>
        {modalLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading subjects…</div>
        ) : allSubjects.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No active subjects found. Create subjects first.</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {allSubjects.map(s => (
              <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(s.id)}
                  onChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                <span className="text-sm font-medium text-gray-700">{s.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{s.code}</span>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
