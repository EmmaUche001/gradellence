import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { subjectService } from '../../../services/subjectService';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';
import { Tabs, TabList, TabTrigger, TabPanel } from '../../../components/ui/Tabs';

const singleSchema = z.object({
  name:        z.string().min(1, 'Subject name is required'),
  code:        z.string().min(1, 'Subject code is required'),
  description: z.string().optional(),
});

const bulkSchema = z.object({
  lines: z.string().min(1, 'Enter at least one subject'),
});

type SingleFormData = z.infer<typeof singleSchema>;
type BulkFormData   = z.infer<typeof bulkSchema>;

export function SubjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [saving, setSaving]           = useState(false);
  const [fetching, setFetching]       = useState(isEdit);
  const [error, setError]             = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<number | null>(null);

  const singleForm = useForm<SingleFormData>({ resolver: zodResolver(singleSchema) });
  const bulkForm   = useForm<BulkFormData>({ resolver: zodResolver(bulkSchema) });

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    subjectService.getById(id)
      .then(r => singleForm.reset({ name: r.data.name, code: r.data.code, description: r.data.description || '' }))
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setFetching(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitSingle = async (data: SingleFormData) => {
    setSaving(true); setError(null);
    try {
      isEdit && id ? await subjectService.update(id, data) : await subjectService.create(data);
      navigate('/subjects');
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const onSubmitBulk = async (data: BulkFormData) => {
    setSaving(true); setError(null); setBulkSuccess(null);
    try {
      const subjects = data.lines
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => {
          const [name, code] = l.split(',').map(s => s.trim());
          if (!name || !code) throw new Error(`Invalid line: "${l}". Format: Name,CODE`);
          return { name, code };
        });
      await subjectService.bulkCreate({ subjects });
      setBulkSuccess(subjects.length);
      bulkForm.reset();
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  if (fetching) return <div className="max-w-2xl mx-auto"><SkeletonCard /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Subject' : 'Add Subjects'}
        description={isEdit ? 'Update subject information' : 'Create subjects individually or upload in bulk'}
        breadcrumbs={[{ label: 'Subjects', onClick: () => navigate('/subjects') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {bulkSuccess !== null && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-success-50 border border-success-100">
          <CheckCircle2 size={16} className="text-success-600 shrink-0 mt-0.5" />
          <p className="text-sm text-success-700">{bulkSuccess} subject{bulkSuccess !== 1 ? 's' : ''} created successfully.</p>
        </div>
      )}

      {/* Edit mode — always single form */}
      {isEdit ? (
        <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="space-y-5">
          <FormSection title="Subject Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input {...singleForm.register('name')} id="name" label="Subject Name *"
                placeholder="e.g. Mathematics" error={singleForm.formState.errors.name?.message} />
              <Input {...singleForm.register('code')} id="code" label="Subject Code *"
                placeholder="e.g. MTH101" error={singleForm.formState.errors.code?.message} />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea {...singleForm.register('description')} rows={3}
                  placeholder="Optional description"
                  className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-surface
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none" />
              </div>
            </div>
          </FormSection>
          <FormActions onCancel={() => navigate('/subjects')} submitLabel="Update Subject" loading={saving} />
        </form>
      ) : (
        /* Create mode — tabbed: Single | Bulk */
        <Tabs defaultTab="single">
          <TabList>
            <TabTrigger id="single">Single</TabTrigger>
            <TabTrigger id="bulk">Bulk Import</TabTrigger>
          </TabList>

          <TabPanel id="single">
            <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="space-y-5">
              <FormSection title="Subject Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input {...singleForm.register('name')} id="name-s" label="Subject Name *"
                    placeholder="e.g. Mathematics" error={singleForm.formState.errors.name?.message} />
                  <Input {...singleForm.register('code')} id="code-s" label="Subject Code *"
                    placeholder="e.g. MTH101" error={singleForm.formState.errors.code?.message} />
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea {...singleForm.register('description')} rows={3} placeholder="Optional description"
                      className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-surface
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none" />
                  </div>
                </div>
              </FormSection>
              <FormActions onCancel={() => navigate('/subjects')} submitLabel="Create Subject" loading={saving} />
            </form>
          </TabPanel>

          <TabPanel id="bulk">
            <form onSubmit={bulkForm.handleSubmit(onSubmitBulk)} className="space-y-5">
              <FormSection title="Bulk Import"
                description="Paste or type subjects — one per line. Format: Name,CODE">
                <div>
                  <textarea {...bulkForm.register('lines')} rows={10}
                    placeholder={'Mathematics,MAT1\nEnglish Language,ENG1\nFurther Mathematics,MAT2\nPhysics,PHY1'}
                    className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-surface
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono resize-none" />
                  {bulkForm.formState.errors.lines && (
                    <p className="mt-1.5 text-xs font-medium text-danger-600">{bulkForm.formState.errors.lines.message}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Each line must follow the format <code className="bg-gray-100 px-1 rounded">Subject Name,CODE</code>. Duplicates will be skipped.
                  </p>
                </div>
              </FormSection>
              <FormActions onCancel={() => navigate('/subjects')} submitLabel="Import Subjects" loading={saving} />
            </form>
          </TabPanel>
        </Tabs>
      )}
    </div>
  );
}
