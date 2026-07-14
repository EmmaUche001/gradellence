import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { subjectService } from '../../../services/subjectService';

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().min(1, 'Subject code is required'),
  description: z.string().optional(),
});

const bulkSchema = z.object({
  lines: z.string().min(1, 'Enter at least one subject'),
});

type SubjectFormData = z.infer<typeof subjectSchema>;
type BulkFormData = z.infer<typeof bulkSchema>;

export function SubjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const singleForm = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  const bulkForm = useForm<BulkFormData>({
    resolver: zodResolver(bulkSchema),
  });

  // Load existing subject for edit mode
  useEffect(() => {
    if (id) {
      setIsFetching(true);
      subjectService
        .getById(id)
        .then((response) => {
          const subject = response.data;
          singleForm.reset({
            name: subject.name,
            code: subject.code,
            description: subject.description || '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load subject'))
        .finally(() => setIsFetching(false));
    }
  }, [id, singleForm.reset]);

  const onSubmitSingle = async (data: SubjectFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isEdit && id) {
        await subjectService.update(id, data);
      } else {
        await subjectService.create(data);
      }
      navigate('/subjects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitBulk = async (data: BulkFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const subjects = data.lines
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [name, code] = line.split(',').map(s => s.trim());
          if (!name || !code) throw new Error(`Invalid line: "${line}". Use format: Name,CODE`);
          return { name, code };
        });

      await subjectService.bulkCreate({ subjects });
      bulkForm.reset();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create subjects');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading subject details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Subject' : 'Add New Subjects'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update subject information' : 'Create subjects individually or in bulk'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}


      {/* Mode toggle — only show for new subjects */}
      {!isEdit && (
        <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 w-fit">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${mode === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Single Create
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${mode === 'bulk' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Bulk Create
          </button>
        </div>
      )}

      {mode === 'single' && !isEdit && (
        <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Subject Name *</label>
              <input {...singleForm.register('name')} className="input" placeholder="e.g. Mathematics" />
              {singleForm.formState.errors.name && <p className="mt-1 text-sm text-red-600">{singleForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Subject Code *</label>
              <input {...singleForm.register('code')} className="input" placeholder="e.g. MTH101" />
              {singleForm.formState.errors.code && <p className="mt-1 text-sm text-red-600">{singleForm.formState.errors.code.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea {...singleForm.register('description')} className="input" rows={3} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => navigate('/subjects')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Create Subject'}
            </button>
          </div>
        </form>
      )}

      {mode === 'bulk' && (
        <form onSubmit={bulkForm.handleSubmit(onSubmitBulk)} className="card p-6 space-y-6">
          <div>
            <label className="label">Subjects (one per line)</label>
            <textarea
              {...bulkForm.register('lines')}
              className="input"
              rows={8}
              placeholder="Mathematics,MAT1&#10;English Language,ENG1&#10;Further Mathematics,MAT2"
            />
            {bulkForm.formState.errors.lines && <p className="mt-1 text-sm text-red-600">{bulkForm.formState.errors.lines.message}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Enter each subject on a new line in the format: <strong>Name,CODE</strong>
            </p>
          </div>
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => navigate('/subjects')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Create Subjects'}
            </button>
          </div>
        </form>
      )}

      {/* Edit mode form (always single) */}
      {isEdit && (
        <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Subject Name *</label>
              <input {...singleForm.register('name')} className="input" placeholder="e.g. Mathematics" />
              {singleForm.formState.errors.name && <p className="mt-1 text-sm text-red-600">{singleForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Subject Code *</label>
              <input {...singleForm.register('code')} className="input" placeholder="e.g. MTH101" />
              {singleForm.formState.errors.code && <p className="mt-1 text-sm text-red-600">{singleForm.formState.errors.code.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea {...singleForm.register('description')} className="input" rows={3} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => navigate('/subjects')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Update Subject'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}