import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Plus, Upload, AlertCircle, Grid3x3, Search, X,
} from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { assessmentService } from '../../../services/assessmentService';
import { Assessment } from '../../../types/assessment';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function typeBadge(type: string): 'primary' | 'info' | 'warning' | 'success' | 'gray' {
  const map: Record<string, 'primary' | 'info' | 'warning' | 'success' | 'gray'> = {
    CA1: 'primary', CA2: 'primary', CA3: 'primary', EXAM: 'info',
  };
  return map[type] ?? 'gray';
}

interface SelectOption { value: string; label: string; }

export function AssessmentsListPage() {
  const navigate = useNavigate();

  // List state
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  // Filters
  const [search, setSearch]           = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [termFilter, setTermFilter]   = useState('');
  const [typeFilter, setTypeFilter]   = useState('');

  // Filter option lists (loaded once)
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [termOptions, setTermOptions]       = useState<SelectOption[]>([]);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Load subject + term options once
  useEffect(() => {
    Promise.all([
      apiClient.get('/v1/subjects?page=1&limit=100'),
      apiClient.get('/v1/sessions?page=1&limit=100'),
    ]).then(([subRes, sesRes]) => {
      setSubjectOptions(
        (subRes.data?.data ?? []).map((s: any) => ({ value: s.id, label: s.name }))
      );
      const terms: SelectOption[] = [];
      for (const session of sesRes.data?.data ?? []) {
        for (const term of session.terms ?? []) {
          terms.push({ value: term.id, label: `${term.name} — ${session.name}` });
        }
      }
      setTermOptions(terms);
    }).catch(() => {});
  }, []);

  // Fetch assessments — search is client-side since the server doesn't support
  // free-text search; subjectId / termId / type are passed to the API directly.
  const fetchAssessments = useCallback(async (overridePage?: number) => {
    const currentPage = overridePage ?? page;
    setIsLoading(true); setError(null);
    try {
      const res = await assessmentService.getAll(currentPage, 20, {
        subjectId: subjectFilter || undefined,
        termId:    termFilter    || undefined,
        type:      typeFilter    || undefined,
      });
      setAssessments(res.data);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? res.data.length); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assessments');
    } finally { setIsLoading(false); }
  }, [page, subjectFilter, termFilter, typeFilter]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [subjectFilter, termFilter, typeFilter]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assessmentService.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchAssessments(page);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const handlePageChange = (p: number) => { setPage(p); fetchAssessments(p); };

  const clearFilters = () => {
    setSearch(''); setSubjectFilter(''); setTermFilter(''); setTypeFilter('');
  };
  const hasFilters = !!(search || subjectFilter || termFilter || typeFilter);

  // Client-side search filter (student name or subject name)
  const displayed = search.trim()
    ? assessments.filter(a => {
        const q = search.toLowerCase();
        const studentName = a.student
          ? `${a.student.firstName} ${a.student.lastName}`.toLowerCase()
          : '';
        const subjectName = (a.subject?.name ?? '').toLowerCase();
        return studentName.includes(q) || subjectName.includes(q);
      })
    : assessments;

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
              <Grid3x3 size={15} /> Bulk Score Entry
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
          <button onClick={() => setError(null)} className="ml-auto text-danger-400 hover:text-danger-600">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">

        {/* ── Filter / Search bar ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student or subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm bg-gray-50 border border-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface
                placeholder-gray-400 transition-colors"
            />
          </div>

          {/* Subject */}
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Subject</option>
            {subjectOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Term */}
          <select
            value={termFilter}
            onChange={e => setTermFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Term</option>
            {termOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-gray-50 text-gray-600
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Type</option>
            <option value="CA1">CA 1</option>
            <option value="CA2">CA 2</option>
            <option value="CA3">CA 3</option>
            <option value="EXAM">Exam</option>
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="h-9 px-3 flex items-center gap-1.5 text-sm text-gray-500
                hover:text-gray-700 border border-border rounded-lg bg-gray-50
                hover:bg-gray-100 transition-colors"
            >
              <X size={13} /> Clear
            </button>
          )}

          {/* Count */}
          {!isLoading && (
            <span className="ml-auto text-sm text-gray-400">
              {total} assessment{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={6} /></div>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={40} />}
            title={hasFilters ? 'No matching assessments' : 'No assessments yet'}
            description={hasFilters ? 'Try adjusting the filters.' : 'Record student scores to get started.'}
            actionLabel={hasFilters ? undefined : 'New Assessment'}
            onAction={hasFilters ? undefined : () => navigate('/assessments/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Student', 'Subject', 'Type', 'Score', 'Term', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {a.student ? `${a.student.firstName} ${a.student.lastName}` : '—'}
                      </p>
                      {a.student && (
                        <p className="text-xs text-gray-400">{a.student.admissionNumber}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{a.subject?.name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={typeBadge(a.type)}>{a.type}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 tabular-nums">
                      {a.score}{' '}
                      <span className="text-gray-400 font-normal">/ {a.maxScore}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{a.term?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => navigate(`/assessments/${a.id}/edit`)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="text-sm font-medium text-danger-600 hover:text-danger-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-sm text-gray-500">
              Showing {start}–{end} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary" size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-1">{page} / {totalPages}</span>
              <Button
                variant="secondary" size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

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
