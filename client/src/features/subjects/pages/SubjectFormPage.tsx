import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { subjectService } from '../../../services/subjectService';

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().min(1, 'Subject code is required'),
  description: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export function SubjectFormPage() {
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
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      subjectService
        .getById(id)
        .then((response) => {
          const subject = response.data;
          reset({
            name: subject.name,
            code: subject.code,
            description: subject.description || '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load subject'))
        .finally(() => setIsFetching(false));
    }
  }, [id, reset]);

  const onSubmit = async (data: SubjectFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isEdit && id) {
        await subjectService.update(id, data);
      } else {
        await subjectService.create(data);
      }
      navigate('/subjects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading subject details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Subject' : 'Add New Subject'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update subject information' : 'Enter the details for the new subject'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Subject Name *</label>
            <input {...register('name')} className="input" placeholder="e.g. Mathematics" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Subject Code *</label>
            <input {...register('code')} className="input" placeholder="e.g. MTH101" />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea {...register('description')} className="input" rows={3} placeholder="Optional description" />
          </div>
        </div>
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/subjects')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
            {isLoading ? 'Saving...' : isEdit ? 'Update Subject' : 'Create Subject'}
          </button>
        </div>
      </form>
    </div>
  );
}