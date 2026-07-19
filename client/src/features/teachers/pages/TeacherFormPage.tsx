import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { teacherService } from '../../../services/teacherService';
import { PageHeader } from '../../../components/ui/PageHeader';
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
  const [saving, setSaving]     = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError]       = useState<string | null>(null);

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
      isEdit && id ? await teacherService.update(id, data) : await teacherService.create(data);
      navigate('/teachers');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (fetching) return <div className="max-w-2xl mx-auto"><SkeletonCard /></div>;

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
