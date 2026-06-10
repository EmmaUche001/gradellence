import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { enrollmentService } from '../../../services/enrollmentService';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { sessionService } from '../../../services/sessionService';
import { Student } from '../../../types/student';
import { Class } from '../../../types/class';
import { Term } from '../../../types/session';

const enrollmentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  classId: z.string().min(1, 'Class is required'),
  termId: z.string().min(1, 'Term is required'),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export function EnrollmentFormPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
  });

  useEffect(() => {
    Promise.all([
      studentService.getAll(1, 100),
      classService.getAll(1, 100),
      sessionService.getAll(1, 100),
    ]).then(([studentsRes, classesRes, sessionsRes]) => {
      setStudents(studentsRes.data.filter(s => s.isActive));
      setClasses(classesRes.data.filter(c => c.isActive));
      // Terms are nested in sessions — flatten for the picker
      const flattenedTerms: Term[] = [];
      for (const s of sessionsRes.data) {
        if (s.terms) {
          flattenedTerms.push(...s.terms);
        }
      }
      setTerms(flattenedTerms);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  const onSubmit = async (data: EnrollmentFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await enrollmentService.create(data);
      navigate('/enrollments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create enrollment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Enrollment</h1>
        <p className="mt-1 text-sm text-gray-500">Assign a student to a class for a term</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div>
          <label className="label">Student *</label>
          <select {...register('studentId')} className="input">
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.admissionNumber})
              </option>
            ))}
          </select>
          {errors.studentId && <p className="mt-1 text-sm text-red-600">{errors.studentId.message}</p>}
        </div>

        <div>
          <label className="label">Class *</label>
          <select {...register('classId')} className="input">
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear})
              </option>
            ))}
          </select>
          {errors.classId && <p className="mt-1 text-sm text-red-600">{errors.classId.message}</p>}
        </div>

        <div>
          <label className="label">Term *</label>
          <select {...register('termId')} className="input">
            <option value="">Select a term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()})
              </option>
            ))}
          </select>
          {errors.termId && <p className="mt-1 text-sm text-red-600">{errors.termId.message}</p>}
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/enrollments')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Create Enrollment'}
          </button>
        </div>
      </form>
    </div>
  );
}