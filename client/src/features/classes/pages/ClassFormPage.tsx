import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { classService } from '../../../services/classService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

const schema = z.object({
  names:  z.string().min(1, 'At least one class name is required'),
  stream: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function ClassFormPage() {
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
    classService.getById(id)
      .then(r => reset({ names: r.data.name, stream: r.data.stream || '' }))
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError(null);
    try {
      isEdit && id ? await classService.update(id, data) : await classService.create(data);
      navigate('/classes');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (fetching) return <div className="max-w-2xl mx-auto"><SkeletonCard /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Class' : 'Add New Classes'}
        description={isEdit ? 'Update class information' : 'Enter names separated by commas to create multiple classes at once'}
        breadcrumbs={[{ label: 'Classes', onClick: () => navigate('/classes') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormSection title="Class Details">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Class Names <span className="text-danger-500">*</span>
              </label>
              <textarea
                {...register('names')}
                rows={isEdit ? 2 : 4}
                placeholder={isEdit ? 'Class name' : 'e.g. JSS1A, JSS1B, JSS2A, SS1A, SS1B'}
                className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-surface
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              {errors.names && <p className="mt-1.5 text-xs font-medium text-danger-600">{errors.names.message}</p>}
              {!isEdit && <p className="mt-1.5 text-xs text-gray-400">Separate multiple class names with commas.</p>}
            </div>
            <Input {...register('stream')} id="stream" label="Stream" placeholder="e.g. Science, Arts (optional)" />
          </div>
        </FormSection>

        <FormActions onCancel={() => navigate('/classes')} submitLabel={isEdit ? 'Update Class' : 'Create Classes'} loading={saving} />
      </form>
    </div>
  );
}
