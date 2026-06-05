import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { classService } from '../../../services/classService';
import { teacherService } from '../../../services/teacherService';
import { Teacher } from '../../../types/teacher';

const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  classTeacherId: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100'),
  description: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

export function ClassFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      capacity: 30,
    },
  });

  useEffect(() => {
    teacherService.getAll(1, 100).then((response) => {
      setTeachers(response.data.filter(t => t.isActive));
    });
  }, []);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      classService
        .getById(id)
        .then((response) => {
          const cls = response.data;
          reset({
            name: cls.name,
            academicYear: cls.academicYear,
            classTeacherId: cls.classTeacherId || '',
            capacity: cls.capacity,
            description: cls.description || '',
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
          {isEdit ? 'Edit Class' : 'Add New Class'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update class information' : 'Enter the details for the new class'}
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
            <label className="label">Class Name *</label>
            <input {...register('name')} className="input" placeholder="e.g. JSS 1A, SS 2B" />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="label">Academic Year *</label>
            <input {...register('academicYear')} className="input" placeholder="e.g. 2024/2025" />
            {errors.academicYear && (
              <p className="mt-1 text-sm text-red-600">{errors.academicYear.message}</p>
            )}
          </div>

          <div>
            <label className="label">Class Teacher</label>
            <select {...register('classTeacherId')} className="input">
              <option value="">Select class teacher (optional)</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName} ({teacher.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Capacity *</label>
            <input
              {...register('capacity', { valueAsNumber: true })}
              type="number"
              className="input"
              placeholder="e.g. 30"
              min="1"
              max="100"
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              className="input"
              rows={3}
              placeholder="Optional description"
            />
          </div>
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
            {isLoading ? 'Saving...' : isEdit ? 'Update Class' : 'Create Class'}
          </button>
        </div>
      </form>
    </div>
  );
}