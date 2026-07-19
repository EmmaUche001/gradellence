import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, AlertCircle, X } from 'lucide-react';
import { teacherService } from '../../../services/teacherService';
import { classService } from '../../../services/classService';
import { Teacher } from '../../../types/teacher';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';

export function TeachersListPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers]       = useState<Teacher[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [search, setSearch]           = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deleting, setDeleting]       = useState(false);

  // Assignment modal
  const [modalTeacher, setModalTeacher]           = useState<Teacher | null>(null);
  const [classes, setClasses]                     = useState<Class[]>([]);
  const [classSubjects, setClassSubjects]         = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId]     = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [assignments, setAssignments]             = useState<any[]>([]);
  const [modalLoading, setModalLoading]           = useState(false);
  const [assigning, setAssigning]                 = useState(false);
  const [assigningCT, setAssigningCT]             = useState(false);
  const [subjectsLoading, setSubjectsLoading]     = useState(false);

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await teacherService.getAll(page, 20, search || undefined);
      setTeachers(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teachers');
    } finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await teacherService.remove(deleteTarget.id);
      setDeleteTarget(null); fetchTeachers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete'); setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const fetchClassSubjects = async (classId: string) => {
    if (!classId) { setClassSubjects([]); return; }
    setSubjectsLoading(true);
    try { setClassSubjects((await classService.getClassSubjects(classId)).data); }
    catch { setClassSubjects([]); }
    finally { setSubjectsLoading(false); }
  };

  const openModal = async (t: Teacher) => {
    setModalTeacher(t); setModalLoading(true); setError(null);
    setSelectedClassId(''); setSelectedSubjectIds(new Set()); setClassSubjects([]);
    try {
      const [cr, ar] = await Promise.all([classService.getAll(1, 100), teacherService.getAssignments(t.id)]);
      setClasses(cr.data.filter(c => c.isActive)); setAssignments(ar.data || []);
    } catch { setError('Failed to load assignment data'); }
    finally { setModalLoading(false); }
  };

  const closeModal = () => {
    setModalTeacher(null); setClasses([]); setClassSubjects([]);
    setAssignments([]); setSelectedSubjectIds(new Set());
  };

  const handleAssign = async () => {
    if (!modalTeacher || !selectedClassId || selectedSubjectIds.size === 0) return;
    setAssigning(true);
    try {
      await Promise.all(Array.from(selectedSubjectIds).map(sid =>
        teacherService.assignSubject({ teacherId: modalTeacher.id, subjectId: sid, classId: selectedClassId })
      ));
      setAssignments((await teacherService.getAssignments(modalTeacher.id)).data || []);
      setSelectedClassId(''); setSelectedSubjectIds(new Set());
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to assign'); }
    finally { setAssigning(false); }
  };

  const handleAssignCT = async () => {
    if (!modalTeacher || !selectedClassId) return;
    setAssigningCT(true);
    try {
      await teacherService.assignAsClassTeacher(modalTeacher.id, selectedClassId);
      setAssignments((await teacherService.getAssignments(modalTeacher.id)).data || []);
      setSelectedClassId('');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed'); }
    finally { setAssigningCT(false); }
  };

  const handleRemoveAssignment = async (subjectId: string, classId: string) => {
    if (!modalTeacher) return;
    try {
      await teacherService.removeSubjectAssignment(modalTeacher.id, subjectId, classId);
      setAssignments((await teacherService.getAssignments(modalTeacher.id)).data || []);
    } catch { setError('Failed to remove assignment'); }
  };

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description="Manage staff and their subject assignments"
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('/teachers/new')}>
            <Plus size={15} /> Add Teacher
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
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name or employee ID…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400" />
          </div>
          {!isLoading && total > 0 && <span className="text-sm text-gray-500 ml-auto">{total} teacher{total !== 1 ? 's' : ''}</span>}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={6} /></div>
        ) : teachers.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="No teachers yet"
            description={search ? `No teachers match "${search}".` : 'Add your first teacher to get started.'}
            actionLabel={search ? undefined : 'Add Teacher'}
            onAction={search ? undefined : () => navigate('/teachers/new')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Employee ID', 'Name', 'Qualification', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{t.employeeId}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{t.firstName} {t.lastName}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{t.qualification || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={t.isActive ? 'success' : 'danger'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openModal(t)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Assignments</button>
                        <button onClick={() => navigate(`/teachers/${t.id}/edit`)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                        <button onClick={() => setDeleteTarget(t)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
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
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Delete teacher?" loading={deleting}
        message={`"${deleteTarget?.firstName} ${deleteTarget?.lastName}" will be permanently removed.`}
        confirmLabel="Delete" />

      {/* Assignment Modal */}
      <Modal isOpen={!!modalTeacher} onClose={closeModal} size="md"
        title={`Assignments — ${modalTeacher?.firstName} ${modalTeacher?.lastName}`}
        footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
        {modalLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-6">
            {/* Assign as Class Teacher */}
            <div className="space-y-3 pb-5 border-b border-border">
              <h4 className="text-sm font-semibold text-gray-800">Assign as Class Teacher</h4>
              <Select
                options={classes.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select class…"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
              />
              <Button variant="secondary" size="sm" onClick={handleAssignCT}
                loading={assigningCT} disabled={!selectedClassId}>
                Assign as Class Teacher
              </Button>
              <p className="text-xs text-gray-400">Sets this teacher as class teacher and auto-assigns all class subjects.</p>
            </div>

            {/* Assign Subject */}
            <div className="space-y-3 pb-5 border-b border-border">
              <h4 className="text-sm font-semibold text-gray-800">Assign Subject</h4>
              <Select
                options={classes.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select class…"
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); setSelectedSubjectIds(new Set()); fetchClassSubjects(e.target.value); }}
              />
              {selectedClassId && (
                <div className="max-h-44 overflow-y-auto border border-border rounded-xl p-2 space-y-1">
                  {subjectsLoading ? (
                    <p className="text-xs text-gray-400 text-center py-3">Loading subjects…</p>
                  ) : classSubjects.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No subjects assigned to this class.</p>
                  ) : classSubjects.map(s => (
                    <label key={s.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedSubjectIds.has(s.id)}
                        onChange={() => setSelectedSubjectIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                        className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm text-gray-700">{s.name}</span>
                      <span className="text-xs text-gray-400">({s.code})</span>
                    </label>
                  ))}
                </div>
              )}
              <Button variant="primary" size="sm" onClick={handleAssign}
                loading={assigning} disabled={!selectedClassId || selectedSubjectIds.size === 0}>
                Assign {selectedSubjectIds.size > 0 ? `${selectedSubjectIds.size} Subject${selectedSubjectIds.size > 1 ? 's' : ''}` : 'Subject'}
              </Button>
            </div>

            {/* Current assignments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Current Assignments</h4>
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-400">No assignments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((a: any, i: number) => (
                    <li key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="font-medium text-gray-800">{a.subject?.name || 'Subject'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{a.class?.name || 'Class'}</span>
                        <button onClick={() => handleRemoveAssignment(a.subjectId, a.classId)}
                          className="text-danger-500 hover:text-danger-700 transition-colors" aria-label="Remove">
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
