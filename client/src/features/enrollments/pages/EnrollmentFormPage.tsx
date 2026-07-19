import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { enrollmentService } from '../../../services/enrollmentService';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { sessionService } from '../../../services/sessionService';
import { Student } from '../../../types/student';
import { Class } from '../../../types/class';
import { Term } from '../../../types/session';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { FormSection, FormActions } from '../../../components/ui/FormSection';

const schema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  classId:   z.string().min(1, 'Class is required'),
  termId:    z.string().min(1, 'Term is required'),
});
type FormData = z.infer<typeof schema>;

export function EnrollmentFormPage() {
  const navigate = useNavigate();
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses]   = useState<Class[]>([]);
  const [terms, setTerms]       = useState<Term[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    Promise.all([
      studentService.getAll(1, 500),
      classService.getAll(1, 100),
      sessionService.getAll(1, 100),
    ]).then(([sr, cr, sesr]) => {
      setStudents(sr.data.filter(s => s.isActive));
      setClasses(cr.data.filter(c => c.isActive));
      const flat: Term[] = [];
      for (const s of sesr.data) if (s.terms) flat.push(...s.terms);
      setTerms(flat);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError(null);
    try {
      await enrollmentService.create(data);
      navigate('/enrollments');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to create enrollment'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <PageHeader
        title="New Enrollment"
        description="Assign a student to a class for a specific term"
        breadcrumbs={[{ label: 'Enrollments', onClick: () => navigate('/enrollments') }, { label: 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormSection title="Enrollment Details">
          <div className="space-y-4">
            <Select
              {...register('studentId')} id="studentId" label="Student *"
              options={students.map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.admissionNumber})` }))}
              placeholder="Select a student" error={errors.studentId?.message}
            />
            <Select
              {...register('classId')} id="classId" label="Class *"
              options={classes.map(c => ({ value: c.id, label: `${c.name} (Level ${c.level})` }))}
              placeholder="Select a class" error={errors.classId?.message}
            />
            <Select
              {...register('termId')} id="termId" label="Term *"
              options={terms.map(t => ({ value: t.id, label: `${t.name} · ${new Date(t.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${new Date(t.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` }))}
              placeholder="Select a term" error={errors.termId?.message}
            />
          </div>
        </FormSection>

        <FormActions onCancel={() => navigate('/enrollments')} submitLabel="Create Enrollment" loading={saving} />
      </form>
    </div>
  );
}
