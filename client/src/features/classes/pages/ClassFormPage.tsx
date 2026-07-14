import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { classService } from '../../../services/classService';

const classSchema = z.object({
  names: z.string().min(1, 'At least one class name is required'),
  stream: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

export function ClassFormPage() {
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
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
  });

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      classService
        .getById(id)
        .then((response) => {
          const cls = response.data;
          reset({
            names: cls.name,
            stream: cls.stream || '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load class'))
        .finally(() => setIsFetching(false));
    }
  }, [id, reset]);

  const onSubmit = async (data: ClassFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEdit && id) {
        await classService.update(id, data);
      } else {
        await classService.create(data);
      }
      navigate('/classes');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save class');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading class details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Class' : 'Add New Classes'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update class information' : 'Enter class names separated by commas to create multiple classes at once'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div>
          <label className="label">Class Names *</label>
          <textarea
            {...register('names')}
            className="input"
            rows={3}
            placeholder="e.g. JSS1, JSS2, SS1A, SS1B, SS1C"
          />
          {errors.names && (
            <p className="mt-1 text-sm text-red-600">{errors.names.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Separate multiple classes with commas
          </p>
        </div>

        <div>
          <label className="label">Stream</label>
          <input
            {...register('stream')}
            className="input"
            placeholder="e.g. A (optional)"
          />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEdit ? 'Update Class' : 'Create Classes'}
          </button>
        </div>
      </form>
    </div>
  );
}