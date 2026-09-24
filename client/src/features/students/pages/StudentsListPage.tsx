import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Plus, Search, Upload, AlertCircle, Download,
  Loader2, MoreHorizontal, Users, UserCheck, Filter, X, Trash2,
} from 'lucide-react';
import { useCountUp } from '../../../hooks/useCountUp';
import { studentService } from '../../../services/studentService';
import { Student } from '../../../types/student';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable, SkeletonKpiCard } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Checkbox } from '../../../components/ui/Checkbox';
import { downloadPdf } from '../../../utils/downloadPdf';
import { useToastStore } from '../../../store/toastStore';
import { useTableStagger } from '../../../hooks/useTableStagger';

// ─── Avatar initials with deterministic colour ────────────────────────────────
const AVATAR_PALETTES = [
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { bg: 'bg-emerald-100',text: 'text-emerald-700' },
  { bg: 'bg-amber-100',  text: 'text-amber-700'   },
  { bg: 'bg-rose-100',   text: 'text-rose-700'    },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700'    },
  { bg: 'bg-orange-100', text: 'text-orange-700'  },
  { bg: 'bg-pink-100',   text: 'text-pink-700'    },
];

function avatarPalette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

// ─── Tiny sparkline (SVG) ─────────────────────────────────────────────────────
function Sparkline({ color }: { color: string }) {
  // Decorative static sparkline — the API doesn't expose time-series data
  const pts = [4, 8, 6, 10, 7, 12, 9, 14, 11, 16];
  const w = 60, h = 24;
  const min = Math.min(...pts), max = Math.max(...pts);
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w);
  const ys = pts.map(v => h - ((v - min) / (max - min || 1)) * h * 0.8 - h * 0.1);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-70">
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Overflow row menu ────────────────────────────────────────────────────────
interface RowMenuProps {
  student: Student;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadSummary: () => void;
  onDownloadTranscript: () => void;
  downloadingId: string | null;
  downloadingSummaryId: string | null;
}

function RowMenu({
  student, onEdit, onDelete,
  onDownloadSummary, onDownloadTranscript,
  downloadingId, downloadingSummaryId,
}: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const item = (label: string, action: () => void, danger = false, loading = false) => (
    <button
      onClick={() => { if (!loading) { action(); setOpen(false); } }}
      disabled={loading}
      className={`w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-50
        ${danger ? 'text-danger-600 hover:bg-danger-50' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      {loading ? <span className="flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{label}</span> : label}
    </button>
  );

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Student actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 animate-fade-in">
          {item('View Profile', () => {})}
          {item('Academic Summary', onDownloadSummary, false, downloadingSummaryId === student.id)}
          {item('Transcript', onDownloadTranscript, false, downloadingId === student.id)}
          <div className="h-px bg-gray-100 my-1" />
          {item('Edit Student', onEdit)}
          <div className="h-px bg-gray-100 my-1" />
          {item('Delete', onDelete, true)}
        </div>
      )}
    </div>
  );
}

// ─── KPI stat card with count-up + project micro-interactions ────────────────
interface KpiStatCardProps {
  label: string;
  numericValue: number;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
  sparkColor: string;
  animationDelay: number;
}

function KpiStatCard({ label, numericValue, sub, trend, icon, iconBg, sparkColor, animationDelay }: KpiStatCardProps) {
  const countedValue = useCountUp(numericValue, 0.8, numericValue > 0);
  return (
    <div
      className="kpi-card animate-content-fade-in bg-surface rounded-card p-5 shadow-sm border border-border group"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Top row: icon + sparkline */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
          {icon}
        </div>
        <Sparkline color={sparkColor} />
      </div>

      {/* Label */}
      <p className="text-xs font-medium text-gray-500 truncate">{label}</p>

      {/* Value — count-up */}
      <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
        {countedValue}
      </p>

      {/* Sub-label with trend */}
      <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium
        ${trend === 'up' ? 'text-success-600' : 'text-gray-400'}`}>
        {trend === 'up' && <span>↑</span>}
        <span>{sub}</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function StudentsListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToastStore();

  const [students, setStudents]                         = useState<Student[]>([]);
  const [isLoading, setIsLoading]                       = useState(true);
  const [error, setError]                               = useState<string | null>(null);
  const [page, setPage]                                 = useState(1);
  const [totalPages, setTotalPages]                     = useState(1);
  const [total, setTotal]                               = useState(0);
  const [search, setSearch]                             = useState('');
  const [genderFilter, setGenderFilter]                 = useState('');
  const [statusFilter, setStatusFilter]                 = useState('');
  const [sessionFilter, setSessionFilter]               = useState('');
  const [sortBy, setSortBy]                             = useState('newest');
  const [selectedIds, setSelectedIds]                   = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget]                 = useState<Student | null>(null);
  const [deleting, setDeleting]                         = useState(false);
  const [downloadingId, setDownloadingId]               = useState<string | null>(null);
  const [downloadingSummaryId, setDownloadingSummaryId] = useState<string | null>(null);
  const [pageSize, setPageSize]                         = useState(20);

  const tbodyRef = useTableStagger(!isLoading && students.length > 0);

  // Derived stats from current page data + total from meta
  const maleCount    = students.filter(s => s.gender?.toLowerCase() === 'male').length;
  const femaleCount  = students.filter(s => s.gender?.toLowerCase() === 'female').length;
  const activeCount  = students.filter(s => s.isActive).length;
  // Graduated: not directly available on Student type; derive from !isActive as proxy
  const graduatedCount = students.filter(s => !s.isActive).length;
  const newThisMonth   = students.filter(s => {
    const d = new Date(s.createdAt), now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const allSelected  = students.length > 0 && selectedIds.size === students.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const fetchStudents = useCallback(async (overridePage?: number) => {
    const currentPage = overridePage ?? page;
    setIsLoading(true); setError(null);
    try {
      const res = await studentService.getAll(currentPage, pageSize, search || undefined);
      setStudents(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally { setIsLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, search]);  // `page` intentionally removed — passed explicitly instead

  useEffect(() => { fetchStudents(page); }, [fetchStudents, page]);
  useEffect(() => { setPage(1); }, [search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      await studentService.remove(target.id);

      // Clear selection first
      setSelectedIds(prev => { const n = new Set(prev); n.delete(target.id); return n; });

      // Reset to page 1 and await refetch
      setPage(1);
      await fetchStudents(1);

      addToast('success', `${target.firstName} ${target.lastName} deleted`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete student');
      await fetchStudents(page);
    } finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);

    const idsToDelete = Array.from(selectedIds);
    const count = idsToDelete.length;

    try {
      await studentService.bulkRemove(idsToDelete);

      // Clear selection BEFORE refetch so stale IDs don't interfere
      setSelectedIds(new Set());

      // Reset to page 1 in case the deleted items were the only ones on current page
      setPage(1);

      // Await the refetch explicitly — do NOT fire and forget
      await fetchStudents(1);

      addToast('success', `${count} student${count !== 1 ? 's' : ''} deleted successfully`);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete students');
      // Reload original data to revert any partial UI state
      await fetchStudents(page);
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchStudents(newPage);
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map(s => s.id)));
  };
  const toggleOne = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  // Pagination page numbers
  const pageNums: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  })();

  return (
    <div className="space-y-5">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all students enrolled in your school</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => navigate('/students/import')}>
            <Upload size={14} /> Import
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/students/new')}>
            <Plus size={14} /> Add Student
          </Button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-danger-400 hover:text-danger-600"><X size={14} /></button>
        </div>
      )}

      {/* ── 5 Stat Cards ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {(
            [
              {
                label: 'Total Students', value: total, numericValue: total,
                sub: newThisMonth > 0 ? `+${newThisMonth} this month` : 'Enrolled',
                trend: newThisMonth > 0 ? 'up' as const : 'neutral' as const,
                icon: <Users size={22} />, iconBg: 'bg-blue-50 text-blue-500',
                sparkColor: '#3B82F6',
              },
              {
                label: 'Male Students', value: maleCount, numericValue: maleCount,
                sub: total > 0 ? `${Math.round((maleCount / total) * 100)}% of total` : '—',
                trend: 'neutral' as const,
                icon: <span className="text-xl leading-none">♂</span>, iconBg: 'bg-green-50 text-green-500',
                sparkColor: '#22C55E',
              },
              {
                label: 'Female Students', value: femaleCount, numericValue: femaleCount,
                sub: total > 0 ? `${Math.round((femaleCount / total) * 100)}% of total` : '—',
                trend: 'neutral' as const,
                icon: <span className="text-xl leading-none">♀</span>, iconBg: 'bg-pink-50 text-pink-500',
                sparkColor: '#EC4899',
              },
              {
                label: 'Active Students', value: activeCount, numericValue: activeCount,
                sub: total > 0 ? `${((activeCount / total) * 100).toFixed(1)}% of total` : '—',
                trend: 'neutral' as const,
                icon: <UserCheck size={22} />, iconBg: 'bg-amber-50 text-amber-500',
                sparkColor: '#F59E0B',
              },
              {
                label: 'Graduated Students', value: graduatedCount, numericValue: graduatedCount,
                sub: 'This session',
                trend: 'neutral' as const,
                icon: <GraduationCap size={22} />, iconBg: 'bg-violet-50 text-violet-500',
                sparkColor: '#8B5CF6',
              },
            ] as const
          ).map((card, i) => (
            <KpiStatCard
              key={card.label}
              label={card.label}
              numericValue={card.numericValue}
              sub={card.sub}
              trend={card.trend}
              icon={card.icon}
              iconBg={card.iconBg}
              sparkColor={card.sparkColor}
              animationDelay={i * 70}
            />
          ))}
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, admission number or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-9 pl-9 pr-4 text-sm bg-gray-50 border border-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400 transition-colors"
            />
          </div>

          {/* Class dropdown (visual — class not on Student type yet) */}
          <select
            className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Class</option>
          </select>

          {/* Gender */}
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Session */}
          <select
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Session</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2024/2025">2024/2025</option>
          </select>

          {/* More Filters */}
          <button className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
            hover:bg-gray-100 transition-colors flex items-center gap-1.5">
            <Filter size={13} /> More Filters
          </button>

          {/* Sort — pushed to far right */}
          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
                focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={8} cols={7} /></div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={40} />}
            title="No students found"
            description={search ? `No students match "${search}".` : 'Add your first student to get started.'}
            actionLabel={search ? undefined : 'Add Student'}
            onAction={search ? undefined : () => navigate('/students/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={allSelected}
                      ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  {['Student', 'Admission No.', 'Class', 'Gender', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border" ref={tbodyRef}>
                {students.map(s => {
                  const isSelected = selectedIds.has(s.id);
                  const palette    = avatarPalette(`${s.firstName} ${s.lastName}`);
                  const isMale     = s.gender?.toLowerCase() === 'male';

                  return (
                    <tr
                      key={s.id}
                      className={`transition-all duration-150 ${isSelected ? 'bg-primary-50/50 animate-highlight-pulse' : 'hover:bg-gray-50'}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleOne(s.id)}
                          aria-label={`Select ${s.firstName}`}
                        />
                      </td>

                      {/* Student cell */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Avatar initials */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${palette.bg} ${palette.text}`}>
                            {initials(s.firstName, s.lastName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {s.email || s.admissionNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Admission No. */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-700">{s.admissionNumber}</span>
                      </td>

                      {/* Class — from latest enrollment */}
                      <td className="px-4 py-3.5">
                        {(() => {
                          const latest = s.enrollments?.[0];
                          if (!latest?.class) return <span className="text-sm text-gray-300">—</span>;
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {latest.class.name}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Gender */}
                      <td className="px-4 py-3.5">
                        {s.gender ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${isMale ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {s.gender}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium
                          ${s.isActive ? 'text-success-600' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <RowMenu
                          student={s}
                          onEdit={() => navigate(`/students/${s.id}/edit`)}
                          onDelete={() => setDeleteTarget(s)}
                          onDownloadSummary={() => downloadPdf(
                            `/v1/results/academic-summary/${s.id}`,
                            `academic-summary-${s.admissionNumber}.pdf`,
                            () => setDownloadingSummaryId(s.id),
                            () => setDownloadingSummaryId(null),
                            msg => addToast('error', msg),
                          )}
                          onDownloadTranscript={() => downloadPdf(
                            `/v1/results/transcript/${s.id}`,
                            `transcript-${s.admissionNumber}.pdf`,
                            () => setDownloadingId(s.id),
                            () => setDownloadingId(null),
                            msg => addToast('error', msg),
                          )}
                          downloadingId={downloadingId}
                          downloadingSummaryId={downloadingSummaryId}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Bottom bar: bulk actions (left) + pagination (right) ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-wrap gap-3">

          {/* Left: selection + bulk actions */}
          <div className="flex items-center gap-2">
            {/* Selection count chip */}
            <div className="flex items-center gap-1.5 h-8 px-3 bg-gray-50 border border-border rounded-lg text-sm text-gray-600">
              {selectedIds.size} selected
            </div>
            <button
              onClick={() => addToast('info', 'Assign Class coming soon')}
              className="h-8 px-3 flex items-center gap-1.5 text-sm border border-border rounded-lg
                bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Users size={13} /> Assign Class
            </button>
            <button
              onClick={() => addToast('info', 'Export coming soon')}
              className="h-8 px-3 flex items-center gap-1.5 text-sm border border-border rounded-lg
                bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Download size={13} /> Export
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="h-8 px-3 flex items-center gap-1.5 text-sm border border-danger-200 rounded-lg
                  bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>

          {/* Right: count + pagination + page size */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Showing {start} to {end} of {total.toLocaleString()} students
            </span>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                  text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                ‹
              </button>
              {pageNums.map((pn, i) =>
                pn === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">…</span>
                ) : (
                  <button
                    key={pn}
                    onClick={() => handlePageChange(pn as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors
                      ${pn === page
                        ? 'bg-primary-600 text-white font-semibold'
                        : 'border border-border text-gray-600 hover:bg-gray-100'}`}
                  >
                    {pn}
                  </button>
                )
              )}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                  text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                ›
              </button>
            </div>

            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={e => { const ps = Number(e.target.value); setPageSize(ps); setPage(1); fetchStudents(1); }}
              className="h-8 px-2 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
                focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
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
