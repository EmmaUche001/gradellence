import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sessionService } from '../../../services/sessionService';

const sessionSchema = z.object({
  name: z.string().min(1, 'Session name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isCurrent: z.boolean().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

export function SessionFormPage() {
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
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
  });

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      sessionService
        .getById(id)
        .then((response) => {
          const session = response.data;
          reset({
            name: session.name,
            startDate: session.startDate ? session.startDate.split('T')[0] : '',
            endDate: session.endDate ? session.endDate.split('T')[0] : '',
            isCurrent: session.isCurrent,
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load session'))
        .finally(() => setIsFetching(false));
    }
  }, [id, reset]);

  const onSubmit = async (data: SessionFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isEdit && id) {
        await sessionService.update(id, data);
      } else {
        await sessionService.create(data);
      }
      navigate('/sessions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save session');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading session details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Session' : 'Add New Session'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update academic session details' : 'Create a new academic session'}
        </p>
      </div>
      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Session Name *</label>
            <input {...register('name')} className="input" placeholder="e.g. 2024/2025" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Start Date *</label>
            <input {...register('startDate')} type="date" className="input" />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="label">End Date *</label>
            <input {...register('endDate')} type="date" className="input" />
            {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input {...register('isCurrent')} type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
              <span className="text-sm font-medium text-gray-700">Mark as Current Session</span>
            </label>
            <p className="mt-1 text-xs text-gray-500">Only one session can be current at a time</p>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/sessions')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
            {isLoading ? 'Saving...' : isEdit ? 'Update Session' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  );
}