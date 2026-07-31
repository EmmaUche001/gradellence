import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Copy, CheckCircle2, KeyRound } from 'lucide-react';
import { teacherService } from '../../../services/teacherService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

const schema = z.object({
  firstName:     z.string().min(1, 'Required'),
  lastName:      z.string().min(1, 'Required'),
  gender:        z.string().optional(),
  dateOfBirth:   z.string().optional(),
  email:         z.string().email('Invalid email').optional().or(z.literal('')),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  qualification: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function TeacherFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving]               = useState(false);
  const [fetching, setFetching]           = useState(isEdit);
  const [error, setError]                 = useState<string | null>(null);
  const [credentials, setCredentials]     = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied]               = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    teacherService.getById(id)
      .then(r => {
        const t = r.data;
        reset({
          firstName: t.firstName, lastName: t.lastName, gender: t.gender || '',
          dateOfBirth: t.dateOfBirth ? t.dateOfBirth.split('T')[0] : '',
          email: t.email || '', phone: t.phone || '', address: t.address || '',
          qualification: t.qualification || '',
        });
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError(null);
    try {
      if (isEdit && id) {
        await teacherService.update(id, data);
        navigate('/teachers');
      } else {
        const res = await teacherService.create(data);
        const tempPassword = res?.temporaryPassword;
        if (tempPassword && data.email) {
          setCredentials({ email: data.email, password: tempPassword });
        } else {
          navigate('/teachers');
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(
      `Email: ${credentials.email}\nPassword: ${credentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (fetching) return <div className="max-w-2xl mx-auto"><SkeletonCard /></div>;

  // ── Credential reveal screen ────────────────────────────────────────────
  if (credentials) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <PageHeader
          title="Teacher Created"
          description="Share these login credentials with the teacher"
          breadcrumbs={[{ label: 'Teachers', onClick: () => navigate('/teachers') }, { label: 'New' }]}
        />

        <div className="bg-surface rounded-card border-2 border-success-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 bg-success-50 border-b border-success-200">
            <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-success-900">Account created successfully</p>
              <p className="text-xs text-success-700 mt-0.5">
                {credentials.email} · Temporary password generated
              </p>
            </div>
          </div>

          {/* Credentials */}
          <div className="px-6 py-5 space-y-4">
            <div className="bg-gray-50 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Login Credentials</span>
                <button
                  onClick={copyCredentials}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
                >
                  {copied
                    ? <><CheckCircle2 size={13} className="text-success-600" /> Copied!</>
                    : <><Copy size={13} /> Copy both</>}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between bg-surface rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{credentials.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-surface rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Temporary Password</p>
                    <p className="text-base font-bold text-gray-900 font-mono tracking-widest">{credentials.password}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(credentials.password); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Copy password"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 bg-warning-50 border border-warning-100 rounded-xl px-3.5 py-3">
              <KeyRound size={15} className="text-warning-600 shrink-0 mt-0.5" />
              <p className="text-xs text-warning-700 leading-relaxed">
                <strong>Share these credentials securely.</strong> The teacher should change their password on first login.
                {' '}An email with the credentials{' '}
                <span className="font-semibold">has also been queued</span> for delivery once your email provider is configured.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50">
            <Button variant="secondary" onClick={() => { setCredentials(null); }}>
              Add Another Teacher
            </Button>
            <Button variant="primary" onClick={() => navigate('/teachers')}>
              Back to Teachers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create / Edit form ──────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Teacher' : 'Add New Teacher'}
        description={isEdit ? 'Update teacher information' : 'Enter details for the new staff member'}
        breadcrumbs={[{ label: 'Teachers', onClick: () => navigate('/teachers') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {!isEdit && (
        <div className="flex items-start gap-2.5 bg-info-50 border border-info-100 rounded-xl px-4 py-3">
          <KeyRound size={15} className="text-info-600 shrink-0 mt-0.5" />
          <p className="text-xs text-info-700">
            A temporary login password will be auto-generated and shown to you after saving.
            {' '}Add an email to also queue a credentials email to the teacher.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormSection title="Personal Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input {...register('firstName')} id="firstName" label="First Name *" placeholder="First name" error={errors.firstName?.message} />
            <Input {...register('lastName')} id="lastName" label="Last Name *" placeholder="Last name" error={errors.lastName?.message} />
            <Select {...register('gender')} id="gender" label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} placeholder="Select gender" />
            <Input {...register('dateOfBirth')} id="dateOfBirth" type="date" label="Date of Birth" />
            <Input {...register('email')} id="email" type="email" label="Email" placeholder="teacher@school.com" error={errors.email?.message} />
            <Input {...register('phone')} id="phone" label="Phone" placeholder="+234-800-000-0000" />
            <div className="md:col-span-2">
              <Input {...register('address')} id="address" label="Address" placeholder="Home address" />
            </div>
            <div className="md:col-span-2">
              <Input {...register('qualification')} id="qualification" label="Qualification" placeholder="e.g. B.Ed, M.Sc, PhD" />
            </div>
          </div>
        </FormSection>

        <FormActions onCancel={() => navigate('/teachers')} submitLabel={isEdit ? 'Update Teacher' : 'Create Teacher'} loading={saving} />
      </form>
    </div>
  );
}
