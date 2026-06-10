import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gradeScaleService } from '../../../services/gradeScaleService';

const gradeScaleSchema = z.object({
  minScore: z.coerce.number().min(0, 'Min must be 0 or greater').max(100, 'Min must be at most 100'),
  maxScore: z.coerce.number().min(0, 'Max must be 0 or greater').max(100, 'Max must be at most 100'),
  grade: z.string().min(1, 'Grade letter is required').max(5, 'Grade too long'),
  remark: z.string().min(1, 'Remark is required').max(100, 'Remark too long'),
  isActive: z.boolean().optional(),
}).refine(data => data.minScore < data.maxScore, {
  message: 'Min score must be less than max score',
  path: ['minScore'],
});

type GradeScaleFormData = z.infer<typeof gradeScaleSchema>;

export function GradeScaleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<GradeScaleFormData>({
    resolver: zodResolver(gradeScaleSchema),
    defaultValues: { minScore: 0, maxScore: 100, isActive: true },
  });

  const watchedGrade = watch('grade', '');
  const watchedMin = watch('minScore', 0);
  const watchedMax = watch('maxScore', 100);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      gradeScaleService.getById(id)
        .then((response) => {
          const s = response.data;
          reset({
            minScore: s.minScore,
            maxScore: s.maxScore,
            grade: s.grade,
            remark: s.remark,
            isActive: s.isActive,
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load grade scale'))
        .finally(() => setIsFetching(false));
    }
  }, [id, reset]);

  const onSubmit = async (data: GradeScaleFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isEdit && id) {
        await gradeScaleService.update(id, data);
      } else {
        await gradeScaleService.create(data);
      }
      navigate('/grade-scales');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save grade scale');
    } finally {
      setIsLoading(false);
    }
  };

  const previewColor = (() => {
    const g = (watchedGrade || '').toUpperCase();
    if (g.startsWith('A')) return 'bg-green-100 text-green-800';
    if (g.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (g.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  })();

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading grade scale details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Grade Scale' : 'Add New Grade Scale'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Define a grade range and its associated letter/remark</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Min Score *</label>
            <input {...register('minScore', { valueAsNumber: true })} type="number" min="0" max="100" className="input" placeholder="e.g. 70" />
            {errors.minScore && <p className="mt-1 text-sm text-red-600">{errors.minScore.message}</p>}
          </div>
          <div>
            <label className="label">Max Score *</label>
            <input {...register('maxScore', { valueAsNumber: true })} type="number" min="0" max="100" className="input" placeholder="e.g. 100" />
            {errors.maxScore && <p className="mt-1 text-sm text-red-600">{errors.maxScore.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Grade Letter *</label>
          <input {...register('grade')} className="input" placeholder="e.g. A, B+, C-" maxLength={5} />
          {errors.grade && <p className="mt-1 text-sm text-red-600">{errors.grade.message}</p>}
          {watchedGrade && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-sm text-gray-600">Preview:</span>
              <span className={`inline-flex w-10 h-10 items-center justify-center text-base font-bold rounded-full ${previewColor}`}>
                {watchedGrade}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="label">Remark *</label>
          <input {...register('remark')} className="input" placeholder="e.g. Excellent, Very Good, Pass" />
          {errors.remark && <p className="mt-1 text-sm text-red-600">{errors.remark.message}</p>}
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input {...register('isActive')} type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Active (used in result computation)</span>
          </label>
        </div>

        {watchedMin >= 0 && watchedMax > watchedMin && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Range Preview</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${previewColor.split(' ')[0].replace('100', '500')} opacity-60`}
                  style={{ width: `${((watchedMax - watchedMin + 1) / 100) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">{watchedMax - watchedMin + 1} point range</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/grade-scales')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
            {isLoading ? 'Saving...' : isEdit ? 'Update Grade Scale' : 'Create Grade Scale'}
          </button>
        </div>
      </form>
    </div>
  );
}