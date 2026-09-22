import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { sessionService } from '../../../services/sessionService';
import { Class } from '../../../types/class';
import { Term } from '../../../types/session';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';
import { downloadPdf } from '../../../utils/downloadPdf';
import { useToastStore } from '../../../store/toastStore';

const schema = z.object({
  admissionNumber: z.string().min(1, 'Required'),
  firstName:       z.string().min(1, 'Required'),
  lastName:        z.string().min(1, 'Required'),
  gender:          z.string().optional(),
  dateOfBirth:     z.string().optional(),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  phone:           z.string().optional(),
  address:         z.string().optional(),
  parentName:      z.string().optional(),
  parentPhone:     z.string().optional(),
  parentEmail:     z.string().email('Invalid email').optional().or(z.literal('')),
  classId:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function StudentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { addToast } = useToastStore();
  const [saving, setSaving]           = useState(false);
  const [fetching, setFetching]       = useState(isEdit);
  const [error, setError]             = useState<string | null>(null);
  const [classes, setClasses]         = useState<Class[]>([]);
  const [terms, setTerms]             = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    classService.getAll(1, 100).then(r => setClasses(r.data.filter(c => c.isActive)));
    sessionService.getAll(1, 100).then(r => {
      const flat: Term[] = [];
      for (const s of r.data) if (s.terms) flat.push(...s.terms);
      setTerms(flat);
      const current = flat.find(t => t.isCurrent);
      if (current) setSelectedTermId(current.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    studentService.getById(id)
      .then(r => {
        const s: any = r.data;
        reset({
          admissionNumber: s.admissionNumber, firstName: s.firstName, lastName: s.lastName,
          gender: s.gender || '', dateOfBirth: s.dateOfBirth ? s.dateOfBirth.split('T')[0] : '',
          email: s.email || '', phone: s.phone || '', address: s.address || '',
          parentName: s.parentName || '', parentPhone: s.parentPhone || '', parentEmail: s.parentEmail || '',
          classId: s.enrollments?.[0]?.classId || '',
        });
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError(null);
    try {
      const { classId, ...studentData } = data;

      if (isEdit && id) {
        await studentService.update(id, studentData);
        // Handle class assignment via enrollment if a class is selected
        if (classId) {
          const currentTerm = terms.find(t => t.isCurrent);
          if (currentTerm) {
            try {
              const { enrollmentService } = await import('../../../services/enrollmentService');
              await enrollmentService.create({
                studentId: id,
                classId,
                termId: currentTerm.id,
              });
            } catch { /* non-fatal — enrollment may already exist */ }
          }
        }
      } else {
        await studentService.create({ ...studentData, classId });
      }
      navigate('/students');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (fetching) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Student' : 'Add New Student'}
        description={isEdit ? 'Update student information' : 'Enter details for the new student'}
        breadcrumbs={[{ label: 'Students', onClick: () => navigate('/students') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormSection title="Student Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input {...register('admissionNumber')} id="admissionNumber" label="Admission Number *" placeholder="GDL/2025/001" error={errors.admissionNumber?.message} />
            <Select {...register('gender')} id="gender" label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} placeholder="Select gender" />
            <Input {...register('firstName')} id="firstName" label="First Name *" placeholder="First name" error={errors.firstName?.message} />
            <Input {...register('lastName')} id="lastName" label="Last Name *" placeholder="Last name" error={errors.lastName?.message} />
            <Select {...register('classId')} id="classId" label="Assign to Class" options={classes.map(c => ({ value: c.id, label: `${c.name} (Level ${c.level})` }))} placeholder="Select class (optional)" />
            <Input {...register('dateOfBirth')} id="dateOfBirth" type="date" label="Date of Birth" />
            <Input {...register('email')} id="email" type="email" label="Email" placeholder="student@example.com" error={errors.email?.message} />
            <Input {...register('phone')} id="phone" label="Phone" placeholder="+234-800-000-0000" />
            <div className="md:col-span-2">
              <Input {...register('address')} id="address" label="Address" placeholder="Home address" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Parent / Guardian" description="Contact information for the student's parent or guardian">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input {...register('parentName')} id="parentName" label="Parent Name" placeholder="Full name" />
            <Input {...register('parentPhone')} id="parentPhone" label="Parent Phone" placeholder="+234-800-000-0000" />
            <div className="md:col-span-2">
              <Input {...register('parentEmail')} id="parentEmail" type="email" label="Parent Email" placeholder="parent@example.com" error={errors.parentEmail?.message} />
            </div>
          </div>
        </FormSection>

        {/* ── PDF Documents (edit mode only) ──────────── */}
        {isEdit && id && (
          <FormSection
            title="Documents"
            description="Download PDF documents for this student"
          >
            <div className="space-y-4">
              {/* Report Card — needs a term selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Report Card
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs">
                    <select
                      value={selectedTermId}
                      onChange={e => setSelectedTermId(e.target.value)}
                      className="w-full h-10 rounded-input border border-border px-4 text-sm text-gray-900 bg-surface
                        focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a term…</option>
                      {terms.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedTermId || downloadingKey === 'report-card'}
                    onClick={() => downloadPdf(
                      `/v1/results/report-card/${id}/${selectedTermId}`,
                      `report-card-${id}-${selectedTermId}.pdf`,
                      () => setDownloadingKey('report-card'),
                      () => setDownloadingKey(null),
                      (msg) => addToast('error', msg),
                    )}
                    className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-primary-600 
                      rounded-btn hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloadingKey === 'report-card'
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Download size={15} />}
                    Download
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">PDF includes scores, grades, remarks and QR verification.</p>
              </div>

              {/* Transcript — no term needed, covers all */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-gray-700">Academic Transcript</p>
                  <p className="text-xs text-gray-400 mt-0.5">Full academic history across all sessions — GPA included.</p>
                </div>
                <button
                  type="button"
                  disabled={downloadingKey === 'transcript'}
                  onClick={() => downloadPdf(
                    `/v1/results/transcript/${id}`,
                    `transcript-${id}.pdf`,
                    () => setDownloadingKey('transcript'),
                    () => setDownloadingKey(null),
                    (msg) => addToast('error', msg),
                  )}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-primary-600 bg-primary-50 
                    rounded-btn hover:bg-primary-100 disabled:opacity-40 transition-colors"
                >
                  {downloadingKey === 'transcript'
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Download size={15} />}
                  Download
                </button>
              </div>

              {/* Academic Summary */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-gray-700">Academic Summary</p>
                  <p className="text-xs text-gray-400 mt-0.5">Overall performance summary — pass rate, averages, term-by-term breakdown.</p>
                </div>
                <button
                  type="button"
                  disabled={downloadingKey === 'summary'}
                  onClick={() => downloadPdf(
                    `/v1/results/academic-summary/${id}`,
                    `academic-summary-${id}.pdf`,
                    () => setDownloadingKey('summary'),
                    () => setDownloadingKey(null),
                    (msg) => addToast('error', msg),
                  )}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-success-600 bg-success-50 
                    rounded-btn hover:bg-success-100 disabled:opacity-40 transition-colors"
                >
                  {downloadingKey === 'summary'
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Download size={15} />}
                  Download
                </button>
              </div>
            </div>
          </FormSection>
        )}

        <FormActions onCancel={() => navigate('/students')} submitLabel={isEdit ? 'Update Student' : 'Create Student'} loading={saving} />
      </form>
    </div>
  );
}