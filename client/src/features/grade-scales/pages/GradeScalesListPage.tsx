import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, AlertCircle, Edit3 } from 'lucide-react';
import { gradeScaleService } from '../../../services/gradeScaleService';
import { GradeScale, UpdateGradeScaleEntry } from '../../../types/gradeScale';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';

// Map grade letter to badge colour
function gradeBadgeVariant(grade: string): BadgeVariant {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'success';
  if (g.startsWith('B')) return 'primary';
  if (g.startsWith('C')) return 'info';
  if (g.startsWith('D')) return 'warning';
  return 'danger';
}

// Check if two ranges overlap
function rangesOverlap(a: { min: number; max: number }, b: { min: number; max: number }) {
  return a.min <= b.max && b.min <= a.max;
}

export function GradeScalesListPage() {
  const navigate = useNavigate();
  const [scales, setScales] = useState<GradeScale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<GradeScale | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchScaleEntries, setBatchScaleEntries] = useState<UpdateGradeScaleEntry[]>([]);
  const [batchValidationError, setBatchValidationError] = useState<string | null>(null);

  const fetchScales = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await gradeScaleService.getAll(page, 50);
      // Sort descending by minScore so highest grades appear first
      setScales([...res.data].sort((a, b) => b.minScore - a.minScore));
      if (res.meta) setTotalPages(res.meta.totalPages);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load grade scales'); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetchScales(); }, [fetchScales]);

  // Initialize batch edit with current scales
  const openBatchEdit = () => {
    setBatchScaleEntries(scales.map(s => ({
      id: s.id,
      grade: s.grade,
      minScore: s.minScore,
      maxScore: s.maxScore,
      remark: s.remark,
      points: s.points,
      isActive: s.isActive,
    })));
    setShowBatchEdit(true);
    setBatchValidationError(null);
  };

  // Update a single scale entry in batch
  const updateBatchScale = (index: number, field: keyof UpdateGradeScaleEntry, value: any) => {
    const updated = [...batchScaleEntries];
    updated[index] = { ...updated[index], [field]: value };
    setBatchScaleEntries(updated);
    setBatchValidationError(null); // Clear error on edit
  };

  // Validate all scales for overlaps before saving
  const validateBatch = async () => {
    if (batchScaleEntries.length < 2) {
      setBatchValidationError('At least 2 grade scales are required');
      return false;
    }

    // Sort by minScore and check for overlaps
    const sorted = [...batchScaleEntries].sort((a, b) => (a.minScore || 0) - (b.minScore || 0));
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = { min: sorted[i].minScore || 0, max: sorted[i].maxScore || 100 };
      const next = { min: sorted[i + 1].minScore || 0, max: sorted[i + 1].maxScore || 100 };
      
      if (rangesOverlap(current, next)) {
        setBatchValidationError(
          `Scale ${sorted[i].grade || `#${i + 1}`} (${current.min}-${current.max}) overlaps with ` +
          `${sorted[i + 1].grade || `#${i + 2}`} (${next.min}-${next.max})`
        );
        return false;
      }
    }

    // Check for gaps greater than 1 (optional validation)
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = { min: sorted[i].minScore || 0, max: sorted[i].maxScore || 100 };
      const next = { min: sorted[i + 1].minScore || 0, max: sorted[i + 1].maxScore || 100 };
      
      if (current.max + 1 < next.min) {
        // Optional: warn about gaps but allow them
        // console.warn(`Gap between ${current.max} and ${next.min}`);
      }
    }

    // Try API validation
    try {
      await gradeScaleService.validateBatch({ scales: batchScaleEntries });
      setBatchValidationError(null);
      return true;
    } catch (err: any) {
      setBatchValidationError(err.response?.data?.message || 'Validation failed');
      return false;
    }
  };

  const saveBatch = async () => {
    if (!await validateBatch()) return;

    try {
      await gradeScaleService.updateBatch({ scales: batchScaleEntries });
      setShowBatchEdit(false);
      fetchScales();
    } catch (err: any) {
      setBatchValidationError(err.response?.data?.message || 'Failed to save');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await gradeScaleService.remove(deleteTarget.id);
      setDeleteTarget(null); fetchScales();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  // Width of the range bar as percentage of 100-point scale
  const rangeWidth = (s: GradeScale) =>
    Math.min(100, Math.round(((s.maxScore - s.minScore + 1) / 100) * 100));

  // Check if a specific entry has overlap issues
  const checkEntryOverlaps = (entry: UpdateGradeScaleEntry, index: number) => {
    if (!entry.minScore || !entry.maxScore) return false;
    
    const current = { min: entry.minScore, max: entry.maxScore };
    
    for (let i = 0; i < batchScaleEntries.length; i++) {
      if (i === index) continue;
      const other = batchScaleEntries[i];
      if (!other.minScore || !other.maxScore) continue;
      
      const otherRange = { min: other.minScore, max: other.maxScore };
      if (rangesOverlap(current, otherRange)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade Scales"
        description="Configure the grading system used for result computation"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={openBatchEdit}>
              <Edit3 size={15} /> Batch Edit
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/grade-scales/new')}>
              <Plus size={15} /> Add Grade Scale
            </Button>
          </div>
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
        ) : scales.length === 0 ? (
          <EmptyState
            icon={<Layers size={40} />}
            title="No grade scales yet"
            description="Define your grading system so results can be computed and assigned grades."
            actionLabel="Add Grade Scale"
            onAction={() => navigate('/grade-scales/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Score Range', 'Grade', 'Points', 'Range Width', 'Remark', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scales.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">

                    {/* Score range */}
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {s.minScore} – {s.maxScore}
                    </td>

                    {/* Grade badge */}
                    <td className="px-5 py-3.5">
                      <Badge variant={gradeBadgeVariant(s.grade)}>{s.grade}</Badge>
                    </td>

                    {/* Points */}
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-700 tabular-nums">
                      {(s.points ?? 0).toFixed(1)}
                    </td>

                    {/* Range bar */}
                    <td className="px-5 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={[
                              'h-full rounded-full',
                              s.grade.toUpperCase().startsWith('A') ? 'bg-success-500' :
                              s.grade.toUpperCase().startsWith('B') ? 'bg-primary-500' :
                              s.grade.toUpperCase().startsWith('C') ? 'bg-info-500'    :
                              s.grade.toUpperCase().startsWith('D') ? 'bg-warning-500' :
                              'bg-danger-500',
                            ].join(' ')}
                            style={{ width: `${rangeWidth(s)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums w-8">{rangeWidth(s)}%</span>
                      </div>
                    </td>

                    {/* Remark */}
                    <td className="px-5 py-3.5 text-sm italic text-gray-600">{s.remark}</td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <Badge variant={s.isActive ? 'success' : 'gray'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => navigate(`/grade-scales/${s.id}/edit`)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                        <button onClick={() => setDeleteTarget(s)}
                          className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
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
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <span className="text-sm text-gray-600">{page} / {totalPages}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete grade scale?"
        message={`Grade "${deleteTarget?.grade}" (${deleteTarget?.minScore}–${deleteTarget?.maxScore}) will be permanently deleted. Results using this scale may be affected.`}
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* Batch Edit Modal */}
      <Modal
        isOpen={showBatchEdit}
        onClose={() => setShowBatchEdit(false)}
        title="Batch Grade Scale Editor"
        description="Edit all grade scales at once. Ranges will be validated for overlaps."
        size="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {batchValidationError && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
              <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{batchValidationError}</p>
            </div>
          )}

          <Card className="p-4">
            <div className="grid grid-cols-12 gap-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Grade</div>
              <div className="col-span-4">Score Range</div>
              <div className="col-span-2">Points</div>
              <div className="col-span-3">Remark</div>
              <div className="col-span-1 text-center">Active</div>
            </div>
            
            <div className="space-y-2">
              {batchScaleEntries.map((entry, index) => {
                const hasOverlap = checkEntryOverlaps(entry, index);
                return (
                  <div key={entry.id} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg ${hasOverlap ? 'bg-danger-50 border border-danger-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    {/* Grade */}
                    <div className="col-span-2">
                      <Input
                        value={entry.grade || ''}
                        onChange={(e: any) => updateBatchScale(index, 'grade', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="e.g. A"
                      />
                    </div>

                    {/* Score Range */}
                    <div className="col-span-4 flex gap-2">
                      <Input
                        type="number"
                        value={entry.minScore ?? ''}
                        onChange={(e: any) => updateBatchScale(index, 'minScore', Number(e.target.value))}
                        className="h-9 text-sm"
                        placeholder="Min"
                      />
                      <span className="self-center text-gray-400">-</span>
                      <Input
                        type="number"
                        value={entry.maxScore ?? ''}
                        onChange={(e: any) => updateBatchScale(index, 'maxScore', Number(e.target.value))}
                        className="h-9 text-sm"
                        placeholder="Max"
                      />
                    </div>

                    {/* Points */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={entry.points ?? ''}
                        onChange={(e: any) => updateBatchScale(index, 'points', Number(e.target.value))}
                        className="h-9 text-sm"
                        placeholder="0.0"
                      />
                    </div>

                    {/* Remark */}
                    <div className="col-span-3">
                      <Input
                        value={entry.remark || ''}
                        onChange={(e: any) => updateBatchScale(index, 'remark', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="e.g. Excellent"
                      />
                    </div>

                    {/* Active toggle */}
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        checked={entry.isActive ?? true}
                        onChange={(e) => updateBatchScale(index, 'isActive', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-gray-500">
                {batchScaleEntries.length} scales configured
              </p>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={saveBatch}
                disabled={!!batchValidationError}
              >
                Save All Changes
              </Button>
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
