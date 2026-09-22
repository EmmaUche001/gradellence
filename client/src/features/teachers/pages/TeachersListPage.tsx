import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, AlertCircle, X, MoreVertical, Download,
  Upload, Eye, Pencil, UserX, Trash2, UserCheck, BookOpen,
  School, Activity, ChevronLeft, ChevronRight,
  GraduationCap, BarChart3,
} from 'lucide-react';
import { teacherService } from '../../../services/teacherService';
import { classService } from '../../../services/classService';
import { Teacher } from '../../../types/teacher';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';
import {
  Button, Badge, EmptyState, SkeletonTable, SkeletonKpiCard,
  SkeletonListItem, ConfirmDialog, Modal, Select, Avatar, IconButton,
} from '../../../components/ui';

// ─── Helpers ────────────────────────────────────────────────────────────────

function qualBadge(q: string | null): { label: string; cls: string } {
  if (!q) return { label: '—', cls: 'bg-gray-100 text-gray-500' };
  const u = q.toUpperCase();
  if (u.includes('PHD') || u.includes('PH.D')) return { label: 'PhD', cls: 'bg-purple-100 text-purple-700' };
  if (u.includes('MSC') || u.includes('M.SC') || u.includes('M.ED') || u.includes('MED'))
    return { label: 'M.Sc', cls: 'bg-blue-100 text-blue-700' };
  if (u.includes('BSC') || u.includes('B.SC') || u.includes('B.ED') || u.includes('BED') || u.includes('HND'))
    return { label: 'B.Ed', cls: 'bg-emerald-100 text-emerald-700' };
  return { label: q, cls: 'bg-gray-100 text-gray-600' };
}

/** Deterministic workload % from teacher data (uses assignment count as proxy) */
function workloadPct(t: Teacher): number {
  const assigned = t.subjectAssignments?.length ?? 0;
  return Math.min(Math.round((assigned / 8) * 100), 100);
}

function WorkloadBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? 'bg-danger-500' : pct >= 60 ? 'bg-warning-500' : 'bg-primary-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

// ─── Row overflow menu ────────────────────────────────────────────────────────

interface RowMenuProps {
  teacher: Teacher;
  onView: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function RowMenu({ teacher, onView, onEdit, onAssign, onToggleActive, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button
      onClick={() => { action(); setOpen(false); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left
        ${danger ? 'text-danger-600 hover:bg-danger-50' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <IconButton aria-label="Actions" size="sm" onClick={() => setOpen(v => !v)}>
        <MoreVertical size={15} />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-48 bg-surface border border-border rounded-xl shadow-md p-1.5 animate-fade-in">
          {item(<Eye size={14} />, 'View Profile', onView)}
          {item(<BookOpen size={14} />, 'Assignments', onAssign)}
          {item(<Pencil size={14} />, 'Edit', onEdit)}
          {item(
            teacher.isActive ? <UserX size={14} /> : <UserCheck size={14} />,
            teacher.isActive ? 'Deactivate' : 'Activate',
            onToggleActive,
          )}
          <div className="my-1 border-t border-border" />
          {item(<Trash2 size={14} />, 'Delete', onDelete, true)}
        </div>
      )}
    </div>
  );
}

// ─── Profile Drawer ───────────────────────────────────────────────────────────

interface ProfileDrawerProps {
  teacher: Teacher | null;
  onClose: () => void;
  onEdit: (t: Teacher) => void;
  onAssign: (t: Teacher) => void;
}

function ProfileDrawer({ teacher, onClose, onEdit, onAssign }: ProfileDrawerProps) {
  if (!teacher) return null;
  const qual = qualBadge(teacher.qualification);
  const subjects = teacher.subjectAssignments?.map(a => a.subject.name) ?? [];
  const uniqueSubjects = [...new Set(subjects)];
  const classes = teacher.classTeacher?.map(c => c.name) ?? [];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 h-full w-[360px] z-50 bg-surface shadow-lg border-l border-border
        flex flex-col animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-card-title text-gray-900">Teacher Profile</h2>
          <IconButton aria-label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <Avatar name={`${teacher.firstName} ${teacher.lastName}`} size="xl" />
            <div>
              <p className="text-base font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{teacher.employeeId}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={teacher.isActive ? 'success' : 'danger'}>
                  {teacher.isActive ? '● Active' : '● Inactive'}
                </Badge>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${qual.cls}`}>
                  {qual.label}
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-surface-alt rounded-xl p-4 space-y-2">
            {teacher.email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-16 shrink-0 text-xs">Email</span>
                <span className="text-gray-700 truncate">{teacher.email}</span>
              </div>
            )}
            {teacher.phone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-16 shrink-0 text-xs">Phone</span>
                <span className="text-gray-700">{teacher.phone}</span>
              </div>
            )}
            {teacher.gender && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-16 shrink-0 text-xs">Gender</span>
                <span className="text-gray-700">{teacher.gender}</span>
              </div>
            )}
          </div>

          {/* Subjects */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Subjects</p>
            {uniqueSubjects.length ? (
              <div className="flex flex-wrap gap-1.5">
                {uniqueSubjects.map(s => (
                  <span key={s} className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium">{s}</span>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No subjects assigned</p>}
          </div>

          {/* Class Teacher */}
          {classes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Class Teacher</p>
              <div className="flex flex-wrap gap-1.5">
                {classes.map(c => (
                  <span key={c} className="px-2.5 py-1 bg-success-50 text-success-700 rounded-lg text-xs font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Workload */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Workload</p>
            <WorkloadBar pct={workloadPct(teacher)} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onAssign(teacher)}>
            <BookOpen size={14} /> Assignments
          </Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onEdit(teacher)}>
            <Pencil size={14} /> Edit
          </Button>
        </div>
      </aside>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function TeachersListPage() {
  const navigate = useNavigate();

  // Core list state
  const [teachers, setTeachers]     = useState<Teacher[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Actions
  const [deleteTarget, setDeleteTarget]     = useState<Teacher | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [profileTeacher, setProfileTeacher] = useState<Teacher | null>(null);

  // Assignment modal
  const [modalTeacher, setModalTeacher]               = useState<Teacher | null>(null);
  const [classes, setClasses]                         = useState<Class[]>([]);
  const [classSubjects, setClassSubjects]             = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId]         = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds]   = useState<Set<string>>(new Set());
  const [assignments, setAssignments]                 = useState<any[]>([]);
  const [modalLoading, setModalLoading]               = useState(false);
  const [assigning, setAssigning]                     = useState(false);
  const [assigningCT, setAssigningCT]                 = useState(false);
  const [subjectsLoading, setSubjectsLoading]         = useState(false);

  // Sidebar widget data (derived)
  const activeCount    = teachers.filter(t => t.isActive).length;
  const inactiveCount  = teachers.length - activeCount;
  const newThisMonth   = teachers.filter(t => {
    const d = new Date(t.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  // Dept map (from qualification as proxy — real dept not in type)
  const deptMap: Record<string, number> = {};
  teachers.forEach(t => {
    const dept = t.qualification ? qualBadge(t.qualification).label : 'Other';
    deptMap[dept] = (deptMap[dept] ?? 0) + 1;
  });
  const deptEntries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await teacherService.getAll(page, 10, search || undefined);
      setTeachers(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teachers');
    } finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  // Reset page on search change
  useEffect(() => { setPage(1); }, [search]);

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
      setClasses(cr.data.filter((c: Class) => c.isActive)); setAssignments(ar.data || []);
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

  // Selection helpers
  const allSelected = teachers.length > 0 && teachers.every(t => selected.has(t.id));
  const someSelected = selected.size > 0;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(teachers.map(t => t.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filteredTeachers = statusFilter
    ? teachers.filter(t => statusFilter === 'active' ? t.isActive : !t.isActive)
    : teachers;

  const start = (page - 1) * 10 + 1;
  const end   = Math.min(page * 10, total);

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title text-gray-900 flex items-center gap-2">
            Teachers <span aria-hidden>👩🏽‍🏫</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage teachers, their assignments and workloads.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm">
            <Upload size={14} /> Import CSV
          </Button>
          <Button variant="ghost" size="sm">
            <Download size={14} /> Export
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/teachers/new')}>
            <Plus size={14} /> Add Teacher
          </Button>
        </div>
      </div>

      {/* ── KPI Pills ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Teachers', value: total, icon: <Users size={20} />, color: 'bg-primary-50 text-primary-600', change: newThisMonth > 0 ? `+${newThisMonth} this month` : undefined, trend: 'up' as const },
            { label: 'Active Teachers', value: activeCount, icon: <UserCheck size={20} />, color: 'bg-success-50 text-success-600', change: total > 0 ? `${Math.round((activeCount / total) * 100)}% of total` : undefined, trend: 'up' as const },
            { label: 'Inactive', value: inactiveCount, icon: <UserX size={20} />, color: 'bg-warning-50 text-warning-600', change: inactiveCount > 0 ? `${inactiveCount} staff` : undefined, trend: inactiveCount > 0 ? 'down' as const : 'neutral' as const },
            { label: 'New This Month', value: newThisMonth, icon: <GraduationCap size={20} />, color: 'bg-info-50 text-info-600', change: 'Joined recently', trend: 'neutral' as const },
          ].map(kpi => (
            <div key={kpi.label} className="kpi-card bg-surface rounded-card p-5 shadow-sm border border-border flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{kpi.value}</p>
                {kpi.change && <p className="text-xs text-gray-400 truncate">{kpi.change}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-danger-400 hover:text-danger-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Main table panel ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-surface rounded-card shadow-sm border border-border overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap gap-y-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search teachers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-700
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {!isLoading && (
              <span className="ml-auto text-sm text-gray-400">
                {total} teacher{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Bulk action bar */}
          {someSelected && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-primary-50 border-b border-primary-100">
              <span className="text-sm font-medium text-primary-700">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="secondary" size="sm"><BookOpen size={13} /> Assign Subjects</Button>
                <Button variant="secondary" size="sm"><School size={13} /> Assign Classes</Button>
                <Button variant="secondary" size="sm"><Download size={13} /> Export</Button>
                <Button variant="danger" size="sm"><UserX size={13} /> Deactivate</Button>
              </div>
            </div>
          )}

          {/* Table content */}
          {isLoading ? (
            <div className="p-5"><SkeletonTable rows={7} cols={7} /></div>
          ) : filteredTeachers.length === 0 ? (
            <EmptyState
              icon={<Users size={40} />}
              title="No teachers found"
              description={search ? `No teachers match "${search}".` : 'Add your first teacher to get started.'}
              actionLabel={search ? undefined : 'Add Teacher'}
              onAction={search ? undefined : () => navigate('/teachers/new')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        aria-label="Select all"
                      />
                    </th>
                    {['Teacher', 'Department', 'Subjects', 'Classes', 'Workload', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:w-10">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTeachers.map(t => {
                    const qual = qualBadge(t.qualification);
                    const subjects = t.subjectAssignments ?? [];
                    const uniqueSubjects = [...new Set(subjects.map(s => s.subject.name))];
                    const classNames = t.subjectAssignments
                      ? [...new Set(subjects.map(s => s.class.name))]
                      : [];
                    const ctClasses = t.classTeacher?.map(c => c.name) ?? [];
                    const allClasses = [...new Set([...classNames, ...ctClasses])];
                    const pct = workloadPct(t);

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                        onClick={() => setProfileTeacher(t)}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(t.id)}
                            onChange={() => toggleOne(t.id)}
                            className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                            aria-label={`Select ${t.firstName}`}
                          />
                        </td>

                        {/* Teacher cell */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${t.firstName} ${t.lastName}`} size="md" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {t.firstName} {t.lastName}
                              </p>
                              <p className="text-xs font-mono text-gray-400 mt-0.5">{t.employeeId}</p>
                              {t.email && (
                                <p className="text-xs text-gray-400 truncate max-w-[140px]">{t.email}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Department / Qualification */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${qual.cls}`}>
                            {qual.label}
                          </span>
                        </td>

                        {/* Subjects */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {uniqueSubjects.slice(0, 2).map(s => (
                              <span key={s} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md text-xs">{s}</span>
                            ))}
                            {uniqueSubjects.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs">
                                +{uniqueSubjects.length - 2}
                              </span>
                            )}
                            {uniqueSubjects.length === 0 && <span className="text-xs text-gray-300">—</span>}
                          </div>
                        </td>

                        {/* Classes */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {allClasses.slice(0, 2).map(c => (
                              <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs">{c}</span>
                            ))}
                            {allClasses.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs">
                                +{allClasses.length - 2}
                              </span>
                            )}
                            {allClasses.length === 0 && <span className="text-xs text-gray-300">—</span>}
                          </div>
                        </td>

                        {/* Workload */}
                        <td className="px-4 py-3.5">
                          <div onClick={e => e.stopPropagation()}>
                            <WorkloadBar pct={pct} />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <Badge variant={t.isActive ? 'success' : 'danger'}>
                            {t.isActive ? '● Active' : '● Inactive'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <RowMenu
                            teacher={t}
                            onView={() => setProfileTeacher(t)}
                            onEdit={() => navigate(`/teachers/${t.id}/edit`)}
                            onAssign={() => openModal(t)}
                            onToggleActive={() => {/* TODO: toggle active */}}
                            onDelete={() => setDeleteTarget(t)}
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
                Showing {start}–{end} of {total} teachers
              </p>
              <div className="flex items-center gap-1">
                <IconButton
                  aria-label="Previous page"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft size={15} />
                </IconButton>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = page <= 3 ? i + 1 : page + i - 2;
                  if (pg < 1 || pg > totalPages) return null;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors
                        ${pg === page
                          ? 'bg-primary-600 text-white font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <IconButton
                  aria-label="Next page"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight size={15} />
                </IconButton>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 space-y-4 hidden lg:block">

          {/* Qualification Distribution */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <p className="text-card-title text-gray-900 mb-4">Qualification Mix</p>
            {isLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonListItem key={i} />)}</div>
            ) : deptEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <div className="space-y-3">
                {deptEntries.map(([label, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{label}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 pt-1">Total: {total} teachers</p>
              </div>
            )}
          </div>

          {/* New Teachers */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-card-title text-gray-900">New Teachers</p>
              <span className="text-xs text-gray-400">This month</span>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <SkeletonListItem key={i} />)}</div>
            ) : newThisMonth === 0 ? (
              <p className="text-sm text-gray-400">No new teachers this month</p>
            ) : (
              <>
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {teachers
                    .filter(t => {
                      const d = new Date(t.createdAt);
                      const now = new Date();
                      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
                    })
                    .slice(0, 4)
                    .map(t => (
                      <Avatar key={t.id} name={`${t.firstName} ${t.lastName}`} size="sm" />
                    ))}
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{newThisMonth}</span> teacher{newThisMonth !== 1 ? 's' : ''} joined this month
                </p>
              </>
            )}
          </div>

          {/* Pending Assignments */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-card-title text-gray-900">Pending</p>
            </div>
            {isLoading ? (
              <SkeletonListItem />
            ) : (() => {
              const unassigned = teachers.filter(t =>
                (!t.subjectAssignments || t.subjectAssignments.length === 0) && t.isActive
              ).length;
              return unassigned > 0 ? (
                <div className="flex items-start gap-3 p-3 bg-warning-50 border border-warning-100 rounded-xl">
                  <Activity size={16} className="text-warning-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-warning-700">
                    <span className="font-semibold">{unassigned}</span> active teacher{unassigned !== 1 ? 's' : ''} have no subject assignments.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-success-50 border border-success-100 rounded-xl">
                  <UserCheck size={16} className="text-success-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-success-700">All active teachers are assigned.</p>
                </div>
              );
            })()}
          </div>

          {/* Quick Actions */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <p className="text-card-title text-gray-900 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Plus size={14} />, label: 'Add Teacher', action: () => navigate('/teachers/new') },
                { icon: <BookOpen size={14} />, label: 'Assign Subjects', action: () => {} },
                { icon: <School size={14} />, label: 'Assign Classes', action: () => {} },
                { icon: <BarChart3 size={14} />, label: 'Reports', action: () => {} },
              ].map(qa => (
                <button
                  key={qa.label}
                  onClick={qa.action}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-gray-700
                    bg-gray-50 hover:bg-primary-50 hover:text-primary-700 border border-border
                    rounded-xl transition-colors text-left"
                >
                  {qa.icon}
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

        </aside>
      </div>

      {/* ── Profile Drawer ─────────────────────────────────────────────────── */}
      <ProfileDrawer
        teacher={profileTeacher}
        onClose={() => setProfileTeacher(null)}
        onEdit={t => { setProfileTeacher(null); navigate(`/teachers/${t.id}/edit`); }}
        onAssign={t => { setProfileTeacher(null); openModal(t); }}
      />

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete teacher?"
        loading={deleting}
        message={`"${deleteTarget?.firstName} ${deleteTarget?.lastName}" will be permanently removed.`}
        confirmLabel="Delete"
      />

      {/* ── Assignment Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={!!modalTeacher}
        onClose={closeModal}
        size="md"
        title={`Assignments — ${modalTeacher?.firstName} ${modalTeacher?.lastName}`}
        footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}
      >
        {modalLoading ? (
          <div className="py-8 space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonListItem key={i} />)}
          </div>
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
                        <button
                          onClick={() => handleRemoveAssignment(a.subjectId, a.classId)}
                          className="text-danger-400 hover:text-danger-600 transition-colors"
                          aria-label="Remove assignment"
                        >
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
