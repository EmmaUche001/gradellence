import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { assessmentService } from '../../../services/assessmentService';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { subjectService } from '../../../services/subjectService';
import { sessionService } from '../../../services/sessionService';
import { Student } from '../../../types/student';
import { Class } from '../../../types/class';
import { Subject } from '../../../types/subject';
import { Term } from '../../../types/session';

const assessmentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  termId: z.string().min(1, 'Term is required'),
  type: z.string().min(1, 'Type is required'),
  score: z.coerce.number().min(0, 'Score must be 0 or greater'),
  maxScore: z.coerce.number().min(1, 'Max score must be at least 1'),
  weight: z.coerce.number().min(0).max(1).optional(),
  remarks: z.string().optional(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

export function AssessmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { maxScore: 100, type: 'CA1', weight: 1 },
  });

  useEffect(() => {
    Promise.all([
      studentService.getAll(1, 200),
      classService.getAll(1, 100),
      subjectService.getAll(1, 100),
      sessionService.getAll(1, 100),
    ]).then(([studentsRes, classesRes, subjectsRes, sessionsRes]) => {
      setStudents(studentsRes.data);
      setClasses(classesRes.data.filter(c => c.isActive));
      setSubjects(subjectsRes.data.filter(s => s.isActive));
      const flattenedTerms: Term[] = [];
      for (const s of sessionsRes.data) {
        if (s.terms) flattenedTerms.push(...s.terms);
      }
      setTerms(flattenedTerms);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      assessmentService.getById(id)
        .then((response) => {
          const a = response.data;
          reset({
            studentId: a.studentId,
            subjectId: a.subjectId,
            classId: a.classId,
            termId: a.termId,
            type: a.type,
            score: a.score,
            maxScore: a.maxScore,
            weight: a.weight || 1,
            remarks: a.remarks || '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load assessment'))
        .finally(() => setIsFetching(false));
    }
  }, [id, reset]);

  const onSubmit = async (data: AssessmentFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isEdit && id) {
        await assessmentService.update(id, data);
      } else {
        await assessmentService.create(data);
      }
      navigate('/assessments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save assessment');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading assessment details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Assessment' : 'New Assessment'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Record a student score for an assessment</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Subject *</label>
            <select {...register('subjectId')} className="input">
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            {errors.subjectId && <p className="mt-1 text-sm text-red-600">{errors.subjectId.message}</p>}
          </div>

          <div>
            <label className="label">Class *</label>
            <select {...register('classId')} className="input">
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.academicYear})</option>
              ))}
            </select>
            {errors.classId && <p className="mt-1 text-sm text-red-600">{errors.classId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Term *</label>
            <select {...register('termId')} className="input">
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.termId && <p className="mt-1 text-sm text-red-600">{errors.termId.message}</p>}
          </div>

          <div>
            <label className="label">Assessment Type *</label>
            <select {...register('type')} className="input">
              <option value="CA1">CA 1 (Continuous Assessment)</option>
              <option value="CA2">CA 2</option>
              <option value="CA3">CA 3</option>
              <option value="EXAM">Final Exam</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Score *</label>
            <input {...register('score')} type="number" step="0.01" min="0" className="input" placeholder="e.g. 75" />
            {errors.score && <p className="mt-1 text-sm text-red-600">{errors.score.message}</p>}
          </div>
          <div>
            <label className="label">Max Score *</label>
            <input {...register('maxScore')} type="number" min="1" className="input" placeholder="e.g. 100" />
            {errors.maxScore && <p className="mt-1 text-sm text-red-600">{errors.maxScore.message}</p>}
          </div>
          <div>
            <label className="label">Weight (0-1)</label>
            <input {...register('weight')} type="number" step="0.1" min="0" max="1" className="input" placeholder="e.g. 1" />
          </div>
        </div>

        <div>
          <label className="label">Remarks</label>
          <textarea {...register('remarks')} className="input" rows={2} placeholder="Optional teacher remarks" />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/assessments')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
            {isLoading ? 'Saving...' : isEdit ? 'Update Assessment' : 'Create Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}