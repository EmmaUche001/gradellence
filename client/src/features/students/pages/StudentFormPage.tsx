import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { Class } from '../../../types/class';

const studentSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  classId: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export function StudentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    classService.getAll(1, 100).then((response) => {
      setClasses(response.data.filter(c => c.isActive));
    });
  }, []);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      studentService
        .getById(id)
        .then((response) => {
          const student: any = response.data;
          reset({
            admissionNumber: student.admissionNumber,
            firstName: student.firstName,
            lastName: student.lastName,
            gender: student.gender || '',
            dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
            email: student.email || '',
            phone: student.phone || '',
            address: student.address || '',
            parentName: student.parentName || '',
            parentPhone: student.parentPhone || '',
            parentEmail: student.parentEmail || '',
            classId: student.enrollments?.[0]?.classId || '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load student'))
        .finally(() => setIsFetching(false));
    }
  }, [id, reset]);

  const onSubmit = async (data: StudentFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEdit && id) {
        await studentService.update(id, data);
      } else {
        await studentService.create(data);
      }
      navigate('/students');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save student');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading student details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Student' : 'Add New Student'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update student information' : 'Enter the details for the new student'}
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
            <label className="label">Admission Number *</label>
            <input {...register('admissionNumber')} className="input" placeholder="e.g. GDL/2025/001" />
            {errors.admissionNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.admissionNumber.message}</p>
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
            <label className="label">Assign to Class (optional)</label>
            <select {...register('classId')} className="input">
              <option value="">Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Level {c.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date of Birth</label>
            <input {...register('dateOfBirth')} type="date" className="input" />
          </div>

          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="student@example.com" />
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
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Parent/Guardian Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Parent Name</label>
              <input {...register('parentName')} className="input" placeholder="Parent/guardian name" />
            </div>
            <div>
              <label className="label">Parent Phone</label>
              <input {...register('parentPhone')} className="input" placeholder="Parent phone number" />
            </div>
            <div>
              <label className="label">Parent Email</label>
              <input {...register('parentEmail')} type="email" className="input" placeholder="parent@example.com" />
              {errors.parentEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.parentEmail.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEdit ? 'Update Student' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  );
}