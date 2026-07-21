import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  School, Plus, Search, ChevronRight, Users, BookOpen,
  MoreVertical, Pencil, Trash2, BookMarked, GraduationCap,
  RefreshCw, ChevronLeft, ChevronRight as ChevronRightIcon,
  X, Check,
} from 'lucide-react';
import { classService } from '../../../services/classService';
import { subjectService } from '../../../services/subjectService';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { useToastStore } from '../../../store/toastStore';

// ─── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-surface rounded-card border border-border shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Level badge colour ─────────────────────────────────────────────────────
const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-primary-100 text-primary-700',
  2: 'bg-success-100 text-success-700',
  3: 'bg-warning-100 text-warning-700',
  4: 'bg-danger-100 text-danger-700',
  5: 'bg-purple-100 text-purple-700',
  6: 'bg-indigo-100 text-indigo-700',
};
function levelColor(level: number) {
  return LEVEL_COLORS[level] ?? 'bg-gray-100 text-gray-600';
}

// ─── Row overflow menu ──────────────────────────────────────────────────────
function RowMenu({
  cls, onEdit, onAssign, onDelete,
}: {
  cls: Class;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
          hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="More actions"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border
          rounded-xl shadow-md py-1 z-20 animate-fade-in">
          <button onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700
              hover:bg-gray-50 transition-colors">
            <Pencil size={14} className="text-gray-400" /> Edit Class
          </button>
          <button onClick={() => { setOpen(false); onAssign(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700
              hover:bg-gray-50 transition-colors">
            <BookMarked size={14} className="text-gray-400" /> Assign Subjects
          </button>
          <div className="my-1 border-t border-border" />
          <button onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-danger-600
              hover:bg-danger-50 transition-colors">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export function ClassesListPage() {
  const navigate            = useNavigate();
  const { addToast }        = useToastStore();
  const [classes, setClasses]           = useState<Class[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatus]       = useState<'all' | 'active' | 'inactive'>('all');
  const [classSubjects, setClassSubjects] = useState<Record<string, Subject[]>>({});
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Subject modal
  const [modalClass, setModalClass]     = useState<Class | null>(null);
  const [allSubjects, setAllSubjects]   = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving]   = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await classService.getAll(page, 20, search || undefined);
      let data = res.data;
      if (statusFilter === 'active')   data = data.filter(c => c.isActive);
      if (statusFilter === 'inactive') data = data.filter(c => !c.isActive);
      setClasses(data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? data.length); }
      // Fetch subjects per class
      const subMap: Record<string, Subject[]> = {};
      await Promise.all(res.data.map(async c => {
        try { subMap[c.id] = (await classService.getClassSubjects(c.id)).data; }
        catch { subMap[c.id] = []; }
      }));
      setClassSubjects(subMap);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load classes');
    } finally { setIsLoading(false); }
  }, [page, search, statusFilter]); // eslint-disable-line

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeCount      = classes.filter(c => c.isActive).length;
  const totalStudents    = classes.reduce((s, c) => s + (c._count?.enrollments ?? 0), 0);
  const assignedTeachers = classes.filter(c => c.classTeacherId).length;
  const totalSubjectsAll = Object.values(classSubjects).reduce((s, arr) => s + arr.length, 0);

  // ── Actions ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await classService.remove(deleteTarget.id);
      addToast('success', `Class "${deleteTarget.name}" deleted`);
      setDeleteTarget(null); fetchClasses();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const openSubjectModal = async (cls: Class) => {
    setModalClass(cls); setModalLoading(true);
    try {
      const [sr, ar] = await Promise.all([
        subjectService.getAll(1, 100),
        classService.getClassSubjects(cls.id),
      ]);
      setAllSubjects(sr.data.filter(s => s.isActive));
      setSelectedIds(new Set(ar.data.map(s => s.id)));
    } catch { addToast('error', 'Failed to load subjects'); }
    finally { setModalLoading(false); }
  };

  const saveSubjects = async () => {
    if (!modalClass) return;
    setModalSaving(true);
    try {
      await classService.assignSubjects(modalClass.id, Array.from(selectedIds));
      setClassSubjects(prev => ({
        ...prev,
        [modalClass.id]: allSubjects.filter(s => selectedIds.has(s.id)),
      }));
      addToast('success', 'Subjects updated');
      setModalClass(null);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to save subjects');
    } finally { setModalSaving(false); }
  };

  // ── Bulk selection ────────────────────────────────────────────────────────
  const allSelected   = classes.length > 0 && classes.every(c => selected.has(c.id));
  const someSelected  = selected.size > 0;
  const toggleAll     = () => setSelected(allSelected ? new Set() : new Set(classes.map(c => c.id)));
  const toggleOne     = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Academics</span>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium">Classes</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title text-gray-900">Classes</h1>
            <p className="mt-1 text-sm text-gray-500">Manage all school classes and their subject assignments</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/classes/new')}>
            <Plus size={15} /> Add Class
          </Button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<School size={20} className="text-primary-600" />}
          label="Total Classes" value={total || classes.length}
          sub={`${activeCount} active`} color="bg-primary-50" />
        <KpiCard icon={<GraduationCap size={20} className="text-success-600" />}
          label="Total Students" value={totalStudents.toLocaleString()}
          sub="Across all classes" color="bg-success-50" />
        <KpiCard icon={<Users size={20} className="text-warning-600" />}
          label="Teachers Assigned" value={assignedTeachers}
          sub="Class teachers" color="bg-warning-50" />
        <KpiCard icon={<BookOpen size={20} className="text-info-600" />}
          label="Total Subjects" value={totalSubjectsAll}
          sub="Across all classes" color="bg-info-50" />
      </div>

      {/* ── Table card ──────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
          {/* Search */}
          <div className="relative w-60">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search classes…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-9 pl-9 pr-3 text-sm bg-gray-50 border border-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                className={[
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize',
                  statusFilter === s ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!isLoading && (
              <span className="text-sm text-gray-400">
                {total || classes.length} class{(total || classes.length) !== 1 ? 'es' : ''}
              </span>
            )}
            <button onClick={fetchClasses}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Refresh">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-primary-50 border-b border-primary-100">
            <span className="text-sm font-medium text-primary-700">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="secondary" size="sm"
                onClick={async () => {
                  const ids = Array.from(selected);
                  for (const id of ids) {
                    try { await classService.remove(id); } catch { /* skip */ }
                  }
                  setSelected(new Set());
                  addToast('success', `${ids.length} class${ids.length !== 1 ? 'es' : ''} deleted`);
                  fetchClasses();
                }}>
                <Trash2 size={13} /> Delete Selected
              </Button>
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table body */}
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={6} /></div>
        ) : classes.length === 0 ? (
          <EmptyState icon={<School size={40} />} title="No classes yet"
            description={search ? `No classes match "${search}".` : 'Create your first class to begin organising students.'}
            actionLabel={search ? undefined : 'Add Class'}
            onAction={search ? undefined : () => navigate('/classes/new')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border sticky top-0">
                  <th className="pl-5 pr-3 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                  </th>
                  {['Class', 'Class Teacher', 'Students', 'Subjects', 'Status', ''].map(h => (
                    <th key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider last:w-12">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.map(cls => {
                  const subs      = classSubjects[cls.id] ?? [];
                  const isChecked = selected.has(cls.id);
                  const teacher   = cls.classTeacher;
                  return (
                    <tr key={cls.id}
                      className={[
                        'group transition-colors',
                        isChecked ? 'bg-primary-50' : 'hover:bg-gray-50',
                      ].join(' ')}>
                      {/* Checkbox */}
                      <td className="pl-5 pr-3 py-4">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleOne(cls.id)}
                          className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                      </td>

                      {/* Class name + level badge */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${levelColor(cls.level)}`}>
                            {cls.name.slice(0, 3).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{cls.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Level {cls.level}{cls.stream ? ` · ${cls.stream}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Class teacher */}
                      <td className="px-4 py-4">
                        {teacher ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                              {teacher.firstName[0]}{teacher.lastName[0]}
                            </div>
                            <span className="text-sm text-gray-700">
                              {teacher.firstName} {teacher.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Students */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm font-semibold text-gray-800">
                            {cls._count?.enrollments ?? 0}
                          </span>
                          <span className="text-xs text-gray-400">students</span>
                        </div>
                      </td>

                      {/* Subjects */}
                      <td className="px-4 py-4">
                        {subs.length === 0 ? (
                          <button
                            onClick={() => openSubjectModal(cls)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                              text-primary-600 bg-primary-50 border border-primary-200 rounded-lg
                              hover:bg-primary-100 transition-colors">
                            <BookMarked size={12} /> Assign Subjects
                          </button>
                        ) : (
                          <div className="flex flex-wrap gap-1 items-center">
                            {subs.slice(0, 2).map(s => (
                              <span key={s.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px]
                                  font-medium bg-gray-100 text-gray-600">
                                {s.code}
                              </span>
                            ))}
                            {subs.length > 2 && (
                              <span className="text-[11px] text-gray-400 font-medium">
                                +{subs.length - 2} more
                              </span>
                            )}
                            <button
                              onClick={() => openSubjectModal(cls)}
                              className="text-[11px] text-primary-600 hover:text-primary-800
                                font-medium ml-0.5 hover:underline">
                              Edit
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={[
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                          cls.isActive
                            ? 'bg-success-50 text-success-700'
                            : 'bg-gray-100 text-gray-500',
                        ].join(' ')}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cls.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
                          {cls.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions menu */}
                      <td className="px-4 py-4">
                        <RowMenu
                          cls={cls}
                          onEdit={() => navigate(`/classes/${cls.id}/edit`)}
                          onAssign={() => openSubjectModal(cls)}
                          onDelete={() => setDeleteTarget(cls)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-sm text-gray-500">
              Showing {start}–{end} of {total} classes
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                  text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={[
                    'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
                    p === page
                      ? 'bg-primary-600 text-white'
                      : 'border border-border text-gray-600 hover:bg-gray-50',
                  ].join(' ')}>
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                  text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRightIcon size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Showing count when no pagination */}
        {totalPages <= 1 && classes.length > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <p className="text-sm text-gray-400">
              Showing {classes.length} of {total || classes.length} classes
            </p>
          </div>
        )}
      </div>

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete class?"
        loading={deleting}
        message={`"${deleteTarget?.name}" and all related data will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
      />

      {/* ── Assign Subjects modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={!!modalClass}
        onClose={() => setModalClass(null)}
        size="md"
        title={`Assign Subjects — ${modalClass?.name}`}
        description="Select subjects to assign to this class. Changes apply immediately on save."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalClass(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveSubjects} loading={modalSaving}>
              <Check size={14} /> Save Subjects
            </Button>
          </>
        }
      >
        {modalLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading subjects…</div>
        ) : allSubjects.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No active subjects found.</p>
            <p className="text-xs text-gray-400 mt-1">Create subjects first before assigning them to classes.</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto -mx-1 px-1">
            {/* Select all */}
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={allSubjects.every(s => selectedIds.has(s.id))}
                onChange={() => {
                  const all = allSubjects.every(s => selectedIds.has(s.id));
                  setSelectedIds(all ? new Set() : new Set(allSubjects.map(s => s.id)));
                }}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-gray-700">Select all</span>
              <span className="text-xs text-gray-400 ml-auto">{selectedIds.size} selected</span>
            </label>

            {allSubjects.map(s => (
              <label key={s.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50
                  cursor-pointer transition-colors group">
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => setSelectedIds(prev => {
                    const n = new Set(prev);
                    n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                    return n;
                  })}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                </div>
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                  {s.code}
                </span>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
