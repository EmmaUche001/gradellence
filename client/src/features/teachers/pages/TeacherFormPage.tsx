import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { teacherService } from '../../../services/teacherService';

const teacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  qualification: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export function TeacherFormPage() {
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
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  });

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      teacherService
        .getById(id)
        .then((response) => {
          const teacher = response.data;
          reset({
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            gender: teacher.gender || '',
            dateOfBirth: teacher.dateOfBirth ? teacher.dateOfBirth.split('T')[0] : '',
            email: teacher.email || '',
            phone: teacher.phone || '',
            address: teacher.address || '',
            qualification: teacher.qualification || '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load teacher'))
        .finally(() => setIsFetching(false));
    }
  }, [id, reset]);

  const onSubmit = async (data: TeacherFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEdit && id) {
        await teacherService.update(id, data);
      } else {
        await teacherService.create(data);
      }
      navigate('/teachers');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save teacher');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading teacher details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update teacher information' : 'Enter the details for the new teacher'}
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
            <label className="label">First Name *</label>
            <input {...register('firstName')} className="input" placeholder="First name" />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="label">Last Name *</label>
            <input {...register('lastName')} className="input" placeholder="Last name" />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label className="label">Gender</label>
            <select {...register('gender')} className="input">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="label">Date of Birth</label>
            <input {...register('dateOfBirth')} type="date" className="input" />
          </div>

          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="teacher@example.com" />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input" placeholder="+234-800-XXX-XXXX" />
          </div>

          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input {...register('address')} className="input" placeholder="Home address" />
          </div>

          <div className="md:col-span-2">
            <label className="label">Qualification</label>
            <input {...register('qualification')} className="input" placeholder="e.g. B.Ed, M.Sc, PhD" />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/teachers')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEdit ? 'Update Teacher' : 'Create Teacher'}
          </button>
        </div>
      </form>
    </div>
  );
}