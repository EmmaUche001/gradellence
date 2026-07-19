import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { sessionService } from '../../../services/sessionService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

const schema = z.object({
  name:            z.string().min(1, 'Session name is required'),
  startDate:       z.string().min(1, 'Required'),
  endDate:         z.string().min(1, 'Required'),
  firstTermStart:  z.string().min(1, 'Required'),
  firstTermEnd:    z.string().min(1, 'Required'),
  secondTermStart: z.string().min(1, 'Required'),
  secondTermEnd:   z.string().min(1, 'Required'),
  thirdTermStart:  z.string().min(1, 'Required'),
  thirdTermEnd:    z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof schema>;

// Helper: compact date field pair
function TermDates({
  register,
  errors,
  startKey,
  endKey,
}: {
  register: any;
  errors: any;
  startKey: keyof FormData;
  endKey: keyof FormData;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input {...register(startKey)} id={startKey} type="date" label="Start Date *" error={errors[startKey]?.message} />
      <Input {...register(endKey)}   id={endKey}   type="date" label="End Date *"   error={errors[endKey]?.message} />
    </div>
  );
}

export function SessionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving]     = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError]       = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    sessionService.getById(id)
      .then(r => {
        const s = r.data;
        const terms = s.terms || [];
        const [t1, t2, t3] = [terms[0] || {}, terms[1] || {}, terms[2] || {}];
        reset({
          name:            s.name,
          startDate:       s.startDate?.split('T')[0] ?? '',
          endDate:         s.endDate?.split('T')[0]   ?? '',
          firstTermStart:  t1.startDate?.split('T')[0] ?? '',
          firstTermEnd:    t1.endDate?.split('T')[0]   ?? '',
          secondTermStart: t2.startDate?.split('T')[0] ?? '',
          secondTermEnd:   t2.endDate?.split('T')[0]   ?? '',
          thirdTermStart:  t3.startDate?.split('T')[0] ?? '',
          thirdTermEnd:    t3.endDate?.split('T')[0]   ?? '',
        });
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError(null);
    try {
      isEdit && id
        ? await sessionService.update(id, data)
        : await sessionService.createWithTerms(data);
      navigate('/sessions');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (fetching) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Session' : 'New Academic Session'}
        description={isEdit ? 'Update session and term dates' : 'Create a session with 3 terms. All dates are required.'}
        breadcrumbs={[{ label: 'Sessions', onClick: () => navigate('/sessions') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Session */}
        <FormSection title="Session Details">
          <div className="space-y-4">
            <Input {...register('name')} id="name" label="Session Name *"
              placeholder="e.g. 2025/2026" error={errors.name?.message} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input {...register('startDate')} id="startDate" type="date"
                label="Session Start *" error={errors.startDate?.message} />
              <Input {...register('endDate')} id="endDate" type="date"
                label="Session End *" error={errors.endDate?.message} />
            </div>
          </div>
        </FormSection>

        {/* 1st Term */}
        <FormSection title="1st Term">
          <TermDates register={register} errors={errors}
            startKey="firstTermStart" endKey="firstTermEnd" />
        </FormSection>

        {/* 2nd Term */}
        <FormSection title="2nd Term">
          <TermDates register={register} errors={errors}
            startKey="secondTermStart" endKey="secondTermEnd" />
        </FormSection>

        {/* 3rd Term */}
        <FormSection title="3rd Term">
          <TermDates register={register} errors={errors}
            startKey="thirdTermStart" endKey="thirdTermEnd" />
        </FormSection>

        <FormActions
          onCancel={() => navigate('/sessions')}
          submitLabel={isEdit ? 'Update Session' : 'Create Session'}
          loading={saving}
        />
      </form>
    </div>
  );
}
