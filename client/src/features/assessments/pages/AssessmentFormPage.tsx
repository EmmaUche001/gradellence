import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { assessmentService } from '../../../services/assessmentService';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { subjectService } from '../../../services/subjectService';
import { sessionService } from '../../../services/sessionService';
import { Student } from '../../../types/student';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';
import { Term } from '../../../types/session';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

const schema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  classId:   z.string().min(1, 'Class is required'),
  termId:    z.string().min(1, 'Term is required'),
  type:      z.string().min(1, 'Type is required'),
  score:     z.coerce.number().min(0, 'Score must be 0 or greater'),
  maxScore:  z.coerce.number().min(1, 'Max score must be at least 1'),
  weight:    z.coerce.number().min(0).max(1).optional(),
  remarks:   z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const ASSESSMENT_TYPES = [
  { value: 'CA1',  label: 'CA 1 — Continuous Assessment' },
  { value: 'CA2',  label: 'CA 2 — Continuous Assessment' },
  { value: 'CA3',  label: 'CA 3 — Continuous Assessment' },
  { value: 'EXAM', label: 'Final Examination' },
];

export function AssessmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [saving, setSaving]     = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError]       = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses]   = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms]       = useState<Term[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { maxScore: 100, type: 'CA1', weight: 1 },
  });

  // Load dropdown options
  useEffect(() => {
    Promise.all([
      studentService.getAll(1, 500),
      classService.getAll(1, 100),
      subjectService.getAll(1, 100),
      sessionService.getAll(1, 100),
    ]).then(([sr, cr, subr, sesr]) => {
      setStudents(sr.data);
      setClasses(cr.data.filter(c => c.isActive));
      setSubjects(subr.data.filter(s => s.isActive));
      const flat: Term[] = [];
      for (const s of sesr.data) if (s.terms) flat.push(...s.terms);
      setTerms(flat);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  // Load existing record for edit
  useEffect(() => {
    if (!id) return;
    setFetching(true);
    assessmentService.getById(id)
      .then(r => {
        const a = r.data;
        reset({
          studentId: a.studentId, subjectId: a.subjectId, classId: a.classId,
          termId: a.termId, type: a.type, score: a.score, maxScore: a.maxScore,
          weight: a.weight ?? 1, remarks: a.remarks || '',
        });
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError(null);
    try {
      isEdit && id ? await assessmentService.update(id, data) : await assessmentService.create(data);
      navigate('/assessments');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (fetching) return <div className="max-w-2xl mx-auto space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Assessment' : 'New Assessment'}
        description="Record a student score for an assessment"
        breadcrumbs={[{ label: 'Assessments', onClick: () => navigate('/assessments') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <FormSection title="Assessment Details">
          <div className="space-y-4">
            {/* Student — full width */}
            <Select
              {...register('studentId')}
              id="studentId"
              label="Student *"
              options={students.map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.admissionNumber})` }))}
              placeholder="Select a student"
              error={errors.studentId?.message}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select {...register('subjectId')} id="subjectId" label="Subject *"
                options={subjects.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                placeholder="Select subject" error={errors.subjectId?.message} />
              <Select {...register('classId')} id="classId" label="Class *"
                options={classes.map(c => ({ value: c.id, label: `${c.name} (Level ${c.level})` }))}
                placeholder="Select class" error={errors.classId?.message} />
              <Select {...register('termId')} id="termId" label="Term *"
                options={terms.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Select term" error={errors.termId?.message} />
              <Select {...register('type')} id="type" label="Assessment Type *"
                options={ASSESSMENT_TYPES} error={errors.type?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Score">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input {...register('score')} id="score" type="number" label="Score *"
              placeholder="e.g. 75" error={errors.score?.message} />
            <Input {...register('maxScore')} id="maxScore" type="number" label="Max Score *"
              placeholder="e.g. 100" error={errors.maxScore?.message} />
            <Input {...register('weight')} id="weight" type="number" label="Weight (0–1)"
              placeholder="e.g. 1" helperText="Contribution to final score" />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
            <textarea {...register('remarks')} rows={2} placeholder="Optional teacher remarks"
              className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900
                placeholder-gray-400 bg-surface focus:outline-none focus:ring-2
                focus:ring-primary-500 focus:border-primary-500 resize-none" />
          </div>
        </FormSection>

        <FormActions
          onCancel={() => navigate('/assessments')}
          submitLabel={isEdit ? 'Update Assessment' : 'Create Assessment'}
          loading={saving}
        />
      </form>
    </div>
  );
}
