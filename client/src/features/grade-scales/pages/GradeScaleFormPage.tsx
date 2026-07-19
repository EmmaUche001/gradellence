import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { gradeScaleService } from '../../../services/gradeScaleService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

const schema = z.object({
  minScore: z.coerce.number().min(0, 'Min must be 0 or greater').max(100, 'Max 100'),
  maxScore: z.coerce.number().min(0, 'Max must be 0 or greater').max(100, 'Max 100'),
  grade:    z.string().min(1, 'Grade letter is required').max(5, 'Grade too long'),
  remark:   z.string().min(1, 'Remark is required').max(100, 'Too long'),
  points:   z.coerce.number().min(0).max(10).default(0),
  isActive: z.boolean().optional(),
}).refine(d => d.minScore < d.maxScore, {
  message: 'Min score must be less than max score',
  path: ['minScore'],
});

type FormData = z.infer<typeof schema>;

function gradeBadgeVariant(grade: string): BadgeVariant {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'success';
  if (g.startsWith('B')) return 'primary';
  if (g.startsWith('C')) return 'info';
  if (g.startsWith('D')) return 'warning';
  return 'danger';
}

function rangeBgClass(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'bg-success-500';
  if (g.startsWith('B')) return 'bg-primary-500';
  if (g.startsWith('C')) return 'bg-info-500';
  if (g.startsWith('D')) return 'bg-warning-500';
  return 'bg-danger-500';
}

export function GradeScaleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving]     = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError]       = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { minScore: 0, maxScore: 100, points: 0, isActive: true },
  });

  const grade   = watch('grade', '');
  const minScore = watch('minScore', 0);
  const maxScore = watch('maxScore', 100);

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    gradeScaleService.getById(id)
      .then(r => {
        const s = r.data;
        reset({ minScore: s.minScore, maxScore: s.maxScore, grade: s.grade, remark: s.remark, points: s.points ?? 0, isActive: s.isActive });
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError(null);
    try {
      isEdit && id ? await gradeScaleService.update(id, data) : await gradeScaleService.create(data);
      navigate('/grade-scales');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const rangeWidth = (min: number, max: number) =>
    Math.min(100, Math.round(((max - min + 1) / 100) * 100));

  if (fetching) return <div className="max-w-lg mx-auto"><SkeletonCard /></div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Grade Scale' : 'Add Grade Scale'}
        description="Define a score range, grade letter, and remark"
        breadcrumbs={[{ label: 'Grade Scales', onClick: () => navigate('/grade-scales') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormSection title="Score Range">
          <div className="grid grid-cols-2 gap-4">
            <Input {...register('minScore')} id="minScore" type="number" label="Min Score *"
              placeholder="e.g. 70" error={errors.minScore?.message} />
            <Input {...register('maxScore')} id="maxScore" type="number" label="Max Score *"
              placeholder="e.g. 100" error={errors.maxScore?.message} />
          </div>

          {/* Visual range preview */}
          {maxScore > minScore && (
            <div className="mt-4 bg-gray-50 rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Range Preview</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${grade ? rangeBgClass(grade) : 'bg-primary-400'}`}
                    style={{ width: `${rangeWidth(minScore, maxScore)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">
                  {maxScore - minScore + 1} pts ({rangeWidth(minScore, maxScore)}%)
                </span>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection title="Grade Details">
          <div className="space-y-4">
            {/* Grade + live preview */}
            <div>
              <Input {...register('grade')} id="grade" label="Grade Letter *"
                placeholder="e.g. A, B+, C-" error={errors.grade?.message} />
              {grade && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <Badge variant={gradeBadgeVariant(grade)}>{grade}</Badge>
                </div>
              )}
            </div>

            <Input {...register('remark')} id="remark" label="Remark *"
              placeholder="e.g. Excellent, Very Good, Pass, Fail" error={errors.remark?.message} />

            <div>
              <Input {...register('points')} id="points" type="number" label="Grade Points (0–10)"
                placeholder="e.g. 5.0 for A, 4.0 for B"
                helperText="Used for GPA / CGPA calculation" />
              {errors.points && <p className="mt-1 text-xs text-danger-600">{errors.points.message}</p>}
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-gray-50 cursor-pointer transition-colors">
              <input {...register('isActive')} type="checkbox"
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Active</p>
                <p className="text-xs text-gray-400">Include this grade in result computation</p>
              </div>
            </label>
          </div>
        </FormSection>

        <FormActions
          onCancel={() => navigate('/grade-scales')}
          submitLabel={isEdit ? 'Update Grade Scale' : 'Create Grade Scale'}
          loading={saving}
        />
      </form>
    </div>
  );
}
