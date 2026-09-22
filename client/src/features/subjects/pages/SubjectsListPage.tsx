import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Search, AlertCircle, X, MoreVertical, Download,
  Upload, Eye, Pencil, Archive, Trash2, ChevronLeft, ChevronRight,
  GraduationCap, CheckCircle2, BookMarked, LayoutGrid, List,
  Tag, Clock,
} from 'lucide-react';
import { subjectService } from '../../../services/subjectService';
import { Subject } from '../../../types/subject';
import {
  Button, Badge, EmptyState, SkeletonTable, SkeletonKpiCard,
  SkeletonListItem, ConfirmDialog, IconButton,
} from '../../../components/ui';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Derive a colour + label for the subject based on its name / code */
function subjectMeta(s: Subject): { bg: string; text: string; icon: string } {
  const n = s.name.toLowerCase();
  if (n.includes('math') || n.includes('further')) return { bg: 'bg-blue-50', text: 'text-blue-600', icon: '📐' };
  if (n.includes('english') || n.includes('language') || n.includes('literature')) return { bg: 'bg-violet-50', text: 'text-violet-600', icon: '📝' };
  if (n.includes('physics') || n.includes('chemistry') || n.includes('biology') || n.includes('science')) return { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: '🔬' };
  if (n.includes('history') || n.includes('civic') || n.includes('government') || n.includes('social')) return { bg: 'bg-amber-50', text: 'text-amber-600', icon: '📜' };
  if (n.includes('art') || n.includes('music') || n.includes('creative')) return { bg: 'bg-pink-50', text: 'text-pink-600', icon: '🎨' };
  if (n.includes('commerce') || n.includes('account') || n.includes('economics')) return { bg: 'bg-orange-50', text: 'text-orange-600', icon: '📊' };
  if (n.includes('computer') || n.includes('ict') || n.includes('technology')) return { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: '💻' };
  if (n.includes('agric') || n.includes('home') || n.includes('vocation')) return { bg: 'bg-green-50', text: 'text-green-600', icon: '🌱' };
  return { bg: 'bg-gray-50', text: 'text-gray-500', icon: '📚' };
}

/** "Added X days/weeks ago" relative label */
function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Added today';
  if (days === 1) return 'Added yesterday';
  if (days < 7) return `Added ${days} days ago`;
  if (days < 14) return 'Added 1 week ago';
  if (days < 30) return `Added ${Math.floor(days / 7)} weeks ago`;
  return `Added ${Math.floor(days / 30)} months ago`;
}

/** Returns true if the subject was created within the current academic term (approx 90 days) */
function isThisTerm(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 90 * 86_400_000;
}

// ─── Row overflow menu ────────────────────────────────────────────────────────

interface RowMenuProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RowMenu({ onView, onEdit, onDelete }: RowMenuProps) {
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
        <div className="absolute right-0 top-9 z-20 w-44 bg-surface border border-border rounded-xl shadow-md p-1.5 animate-fade-in">
          {item(<Eye size={14} />, 'View Details', onView)}
          {item(<Pencil size={14} />, 'Edit', onEdit)}
          {item(<Archive size={14} />, 'Archive', () => {})}
          <div className="my-1 border-t border-border" />
          {item(<Trash2 size={14} />, 'Delete', onDelete, true)}
        </div>
      )}
    </div>
  );
}

// ─── Subject Details Drawer ───────────────────────────────────────────────────

interface SubjectDrawerProps {
  subject: Subject | null;
  onClose: () => void;
  onEdit: (s: Subject) => void;
}

function SubjectDrawer({ subject, onClose, onEdit }: SubjectDrawerProps) {
  if (!subject) return null;
  const meta = subjectMeta(subject);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-[340px] z-50 bg-surface shadow-lg border-l border-border
        flex flex-col animate-slide-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-card-title text-gray-900">Subject Details</h2>
          <IconButton aria-label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Icon + name */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${meta.bg}`}>
              {meta.icon}
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{subject.name}</p>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{subject.code}</p>
              <div className="mt-2">
                <Badge variant={subject.isActive ? 'success' : 'danger'}>
                  {subject.isActive ? '● Active' : '● Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {subject.description && (
            <div className="bg-surface-alt rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{subject.description}</p>
            </div>
          )}

          {/* Meta info */}
          <div className="bg-surface-alt rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Code</span>
              <span className="text-sm font-mono font-semibold text-gray-800">{subject.code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Status</span>
              <Badge variant={subject.isActive ? 'success' : 'danger'}>
                {subject.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Added</span>
              <span className="text-sm text-gray-600">{relativeDate(subject.createdAt)}</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onEdit(subject)}>
            <Pencil size={14} /> Edit Subject
          </Button>
        </div>
      </aside>
    </>
  );
}

// ─── Card View Item ───────────────────────────────────────────────────────────

function SubjectCard({ subject, onClick }: { subject: Subject; onClick: () => void }) {
  const meta = subjectMeta(subject);
  return (
    <div
      onClick={onClick}
      className="bg-surface rounded-card border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5
        transition-all duration-150 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${meta.bg}`}>
          {meta.icon}
        </div>
        <Badge variant={subject.isActive ? 'success' : 'danger'}>
          {subject.isActive ? '● Active' : '● Inactive'}
        </Badge>
      </div>
      <p className="text-sm font-bold text-gray-900 truncate">{subject.name}</p>
      <p className="text-xs font-mono text-gray-400 mt-0.5">{subject.code}</p>
      {subject.description && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{subject.description}</p>
      )}
      <p className="text-xs text-gray-300 mt-3">{relativeDate(subject.createdAt)}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function SubjectsListPage() {
  const navigate = useNavigate();

  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode]         = useState<'table' | 'grid'>('table');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Actions
  const [deleteTarget, setDeleteTarget]     = useState<Subject | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [detailSubject, setDetailSubject]   = useState<Subject | null>(null);

  // Derived stats (from the current page data — full counts from meta)
  const activeCount   = subjects.filter(s => s.isActive).length;
  const inactiveCount = subjects.length - activeCount;
  const newThisTerm   = subjects.filter(s => isThisTerm(s.createdAt)).length;

  // Category breakdown from subject names
  const categoryMap: Record<string, number> = {};
  subjects.forEach(s => {
    const cat = s.name.toLowerCase().includes('math') ? 'Mathematics'
      : s.name.toLowerCase().includes('english') || s.name.toLowerCase().includes('language') ? 'Languages'
      : s.name.toLowerCase().includes('science') || s.name.toLowerCase().includes('physics') || s.name.toLowerCase().includes('chemistry') || s.name.toLowerCase().includes('biology') ? 'Sciences'
      : s.name.toLowerCase().includes('civic') || s.name.toLowerCase().includes('government') || s.name.toLowerCase().includes('history') ? 'Social Science'
      : s.name.toLowerCase().includes('art') || s.name.toLowerCase().includes('music') ? 'Arts'
      : s.name.toLowerCase().includes('commerce') || s.name.toLowerCase().includes('account') ? 'Commercial'
      : 'Other';
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
  });
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Recently added (last 30 days)
  const recentlyAdded = [...subjects]
    .filter(s => Date.now() - new Date(s.createdAt).getTime() < 30 * 86_400_000)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await subjectService.getAll(page, 10, search || undefined);
      setSubjects(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load subjects');
    } finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);
  useEffect(() => { setPage(1); }, [search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await subjectService.remove(deleteTarget.id);
      setDeleteTarget(null); fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete'); setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  // Selection helpers
  const allSelected = subjects.length > 0 && subjects.every(s => selected.has(s.id));
  const someSelected = selected.size > 0;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(subjects.map(s => s.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filteredSubjects = statusFilter
    ? subjects.filter(s => statusFilter === 'active' ? s.isActive : !s.isActive)
    : subjects;

  const start = (page - 1) * 10 + 1;
  const end   = Math.min(page * 10, total);

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title text-gray-900 flex items-center gap-2">
            Subjects <span aria-hidden>📚</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage curriculum, departments and subject allocations.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm">
            <Upload size={14} /> Import Subjects
          </Button>
          <Button variant="ghost" size="sm">
            <Download size={14} /> Export
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/subjects/new')}>
            <Plus size={14} /> Add Subject
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
            { label: 'Total Subjects', value: total, icon: <BookOpen size={20} />, color: 'bg-primary-50 text-primary-600', change: newThisTerm > 0 ? `+${newThisTerm} this term` : undefined },
            { label: 'Active Subjects', value: activeCount, icon: <CheckCircle2 size={20} />, color: 'bg-success-50 text-success-600', change: total > 0 ? `${Math.round((activeCount / total) * 100)}% of total` : undefined },
            { label: 'Inactive', value: inactiveCount, icon: <Archive size={20} />, color: 'bg-warning-50 text-warning-600', change: inactiveCount > 0 ? `${inactiveCount} subjects` : 'None' },
            { label: 'Categories', value: categoryEntries.length, icon: <Tag size={20} />, color: 'bg-info-50 text-info-600', change: 'Subject groups' },
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

        {/* ── Main panel ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-surface rounded-card shadow-sm border border-border overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap gap-y-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or code..."
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

            {/* View toggle */}
            <div className="flex items-center gap-1 ml-auto">
              <IconButton
                aria-label="Table view"
                size="sm"
                variant={viewMode === 'table' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('table')}
              >
                <List size={15} />
              </IconButton>
              <IconButton
                aria-label="Grid view"
                size="sm"
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={15} />
              </IconButton>
            </div>

            {!isLoading && (
              <span className="text-sm text-gray-400">
                {total} subject{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Bulk action bar */}
          {someSelected && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-primary-50 border-b border-primary-100">
              <span className="text-sm font-medium text-primary-700">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="secondary" size="sm"><GraduationCap size={13} /> Assign Teacher</Button>
                <Button variant="secondary" size="sm"><Tag size={13} /> Assign Dept.</Button>
                <Button variant="secondary" size="sm"><Download size={13} /> Export</Button>
                <Button variant="secondary" size="sm"><Archive size={13} /> Archive</Button>
                <Button variant="danger" size="sm"><Trash2 size={13} /> Delete</Button>
              </div>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="p-5">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <SkeletonKpiCard key={i} />)}
                </div>
              ) : (
                <SkeletonTable rows={7} cols={6} />
              )}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={40} />}
              title="No subjects found"
              description={search ? `No subjects match "${search}".` : 'Add your first subject to get started.'}
              actionLabel={search ? undefined : 'Add Subject'}
              onAction={search ? undefined : () => navigate('/subjects/new')}
            />
          ) : viewMode === 'grid' ? (
            /* ── Card grid view ─────────────────────────────────────────── */
            <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map(s => (
                <SubjectCard key={s.id} subject={s} onClick={() => setDetailSubject(s)} />
              ))}
            </div>
          ) : (
            /* ── Table view ─────────────────────────────────────────────── */
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
                    {['Subject', 'Code', 'Category', 'Description', 'Status', 'Added', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:w-10">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubjects.map(s => {
                    const meta = subjectMeta(s);
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                        onClick={() => setDetailSubject(s)}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleOne(s.id)}
                            className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                            aria-label={`Select ${s.name}`}
                          />
                        </td>

                        {/* Subject cell */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${meta.bg}`}>
                              {meta.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                              <p className="text-xs font-mono text-gray-400 mt-0.5">{s.code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-gray-100 text-gray-700">
                            {s.code}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
                            {s.name.toLowerCase().includes('math') ? 'Mathematics'
                              : s.name.toLowerCase().includes('english') || s.name.toLowerCase().includes('language') ? 'Languages'
                              : s.name.toLowerCase().includes('science') || s.name.toLowerCase().includes('physics') || s.name.toLowerCase().includes('chemistry') || s.name.toLowerCase().includes('biology') ? 'Sciences'
                              : s.name.toLowerCase().includes('civic') || s.name.toLowerCase().includes('government') ? 'Social Science'
                              : s.name.toLowerCase().includes('art') || s.name.toLowerCase().includes('music') ? 'Arts'
                              : s.name.toLowerCase().includes('commerce') || s.name.toLowerCase().includes('account') ? 'Commercial'
                              : 'Other'}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <p className="text-sm text-gray-500 truncate">{s.description || '—'}</p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <Badge variant={s.isActive ? 'success' : 'danger'}>
                            {s.isActive ? '● Active' : '● Inactive'}
                          </Badge>
                        </td>

                        {/* Added */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock size={11} />
                            {relativeDate(s.createdAt)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <RowMenu
                            onView={() => setDetailSubject(s)}
                            onEdit={() => navigate(`/subjects/${s.id}/edit`)}
                            onDelete={() => setDeleteTarget(s)}
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
                Showing {start}–{end} of {total} subjects
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
        <aside className="w-[268px] shrink-0 space-y-4 hidden lg:block">

          {/* Curriculum Health */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <p className="text-card-title text-gray-900 mb-4">Curriculum Health</p>
            {isLoading ? <SkeletonListItem /> : (
              <div className="flex items-center gap-4">
                {/* Donut ring */}
                <div className="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3.2" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={total > 0 && activeCount / total >= 0.9 ? '#22C55E' : '#F59E0B'}
                      strokeWidth="3.2"
                      strokeDasharray={`${total > 0 ? Math.round((activeCount / total) * 100) : 0} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                    {total > 0 ? `${Math.round((activeCount / total) * 100)}%` : '—'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {activeCount} Active
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">of {total} subjects</p>
                  {inactiveCount > 0 && (
                    <p className="text-xs text-warning-600 mt-1 font-medium">{inactiveCount} inactive</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <p className="text-card-title text-gray-900 mb-4">By Category</p>
            {isLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonListItem key={i} />)}</div>
            ) : categoryEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <div className="space-y-3">
                {categoryEntries.map(([label, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate">{label}</span>
                        <span className="text-xs text-gray-400 tabular-nums ml-2 shrink-0">{count} ({pct}%)</span>
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
                <p className="text-xs text-gray-400 pt-1">Total: {total} subjects</p>
              </div>
            )}
          </div>

          {/* Recently Added */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-card-title text-gray-900">Recently Added</p>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <SkeletonListItem key={i} />)}</div>
            ) : recentlyAdded.length === 0 ? (
              <p className="text-sm text-gray-400">No new subjects recently</p>
            ) : (
              <div className="space-y-3">
                {recentlyAdded.map(s => {
                  const meta = subjectMeta(s);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setDetailSubject(s)}
                      className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-xl p-1.5 -mx-1.5 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-primary-600 transition-colors">
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-400">{relativeDate(s.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-surface rounded-card p-5 shadow-sm border border-border">
            <p className="text-card-title text-gray-900 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Plus size={14} />, label: 'Add Subject', action: () => navigate('/subjects/new') },
                { icon: <Upload size={14} />, label: 'Import', action: () => navigate('/subjects/new') },
                { icon: <Download size={14} />, label: 'Export', action: () => {} },
                { icon: <BookMarked size={14} />, label: 'Curriculum', action: () => {} },
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

      {/* ── Subject Details Drawer ─────────────────────────────────────────── */}
      <SubjectDrawer
        subject={detailSubject}
        onClose={() => setDetailSubject(null)}
        onEdit={s => { setDetailSubject(null); navigate(`/subjects/${s.id}/edit`); }}
      />

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete subject?"
        loading={deleting}
        message={`"${deleteTarget?.name}" will be permanently deleted and removed from all classes.`}
        confirmLabel="Delete"
      />

    </div>
  );
}
