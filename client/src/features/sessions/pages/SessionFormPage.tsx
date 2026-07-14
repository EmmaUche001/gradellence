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
  firstTermStart: z.string().min(1, '1st term start date is required'),
  firstTermEnd: z.string().min(1, '1st term end date is required'),
  secondTermStart: z.string().min(1, '2nd term start date is required'),
  secondTermEnd: z.string().min(1, '2nd term end date is required'),
  thirdTermStart: z.string().min(1, '3rd term start date is required'),
  thirdTermEnd: z.string().min(1, '3rd term end date is required'),
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
          const s = response.data;
          const terms = s.terms || [];
          const t1 = terms[0] || {};
          const t2 = terms[1] || {};
          const t3 = terms[2] || {};
          reset({
            name: s.name,
            startDate: s.startDate ? s.startDate.split('T')[0] : '',
            endDate: s.endDate ? s.endDate.split('T')[0] : '',
            firstTermStart: t1.startDate ? t1.startDate.split('T')[0] : '',
            firstTermEnd: t1.endDate ? t1.endDate.split('T')[0] : '',
            secondTermStart: t2.startDate ? t2.startDate.split('T')[0] : '',
            secondTermEnd: t2.endDate ? t2.endDate.split('T')[0] : '',
            thirdTermStart: t3.startDate ? t3.startDate.split('T')[0] : '',
            thirdTermEnd: t3.endDate ? t3.endDate.split('T')[0] : '',
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
        await sessionService.createWithTerms(data);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Session' : 'Add New Session'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new academic session with 3 terms
        </p>
      </div>
      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="label">Session Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. 2025/2026" />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input {...register('startDate')} type="date" className="input" />
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">End Date *</label>
              <input {...register('endDate')} type="date" className="input" />
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">1st Term</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input {...register('firstTermStart')} type="date" className="input" />
              {errors.firstTermStart && <p className="mt-1 text-sm text-red-600">{errors.firstTermStart.message}</p>}
            </div>
            <div>
              <label className="label">End Date *</label>
              <input {...register('firstTermEnd')} type="date" className="input" />
              {errors.firstTermEnd && <p className="mt-1 text-sm text-red-600">{errors.firstTermEnd.message}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">2nd Term</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input {...register('secondTermStart')} type="date" className="input" />
              {errors.secondTermStart && <p className="mt-1 text-sm text-red-600">{errors.secondTermStart.message}</p>}
            </div>
            <div>
              <label className="label">End Date *</label>
              <input {...register('secondTermEnd')} type="date" className="input" />
              {errors.secondTermEnd && <p className="mt-1 text-sm text-red-600">{errors.secondTermEnd.message}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">3rd Term</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input {...register('thirdTermStart')} type="date" className="input" />
              {errors.thirdTermStart && <p className="mt-1 text-sm text-red-600">{errors.thirdTermStart.message}</p>}
            </div>
            <div>
              <label className="label">End Date *</label>
              <input {...register('thirdTermEnd')} type="date" className="input" />
              {errors.thirdTermEnd && <p className="mt-1 text-sm text-red-600">{errors.thirdTermEnd.message}</p>}
            </div>
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