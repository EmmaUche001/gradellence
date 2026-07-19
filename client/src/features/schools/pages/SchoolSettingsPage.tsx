import { useState, useEffect } from 'react';
import { School, AlertCircle, CheckCircle2, Phone, Mail, MapPin, Image } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../services/apiClient';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

interface SchoolData {
  id: string;
  name: string;
  alias: string | null;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
}

interface FormState {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

export function SchoolSettingsPage() {
  const { user } = useAuthStore();
  const [school, setSchool]   = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm]       = useState<FormState>({ name: '', address: '', phone: '', email: '', logo: '' });

  const fetchSchool = async () => {
    if (!user?.schoolId) return;
    setLoading(true); setError(null);
    try {
      const { data } = await apiClient.get(`/v1/schools/${user.schoolId}`);
      const s: SchoolData = data.data || data;
      setSchool(s);
      setForm({ name: s.name || '', address: s.address || '', phone: s.phone || '', email: s.email || '', logo: s.logo || '' });
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load school'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSchool(); }, [user?.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const payload: Partial<FormState> = {};
      if (form.name    !== school.name)              payload.name    = form.name;
      if (form.address !== (school.address  || ''))  payload.address = form.address;
      if (form.phone   !== (school.phone    || ''))  payload.phone   = form.phone;
      if (form.email   !== (school.email    || ''))  payload.email   = form.email;
      if (form.logo    !== (school.logo     || ''))  payload.logo    = form.logo;

      if (Object.keys(payload).length === 0) { setSuccess('No changes to save.'); setSaving(false); return; }

      await apiClient.patch(`/v1/schools/${school.id}`, payload);
      setSuccess('School settings saved successfully.');
      fetchSchool();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonCard /><SkeletonCard />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="School Settings" description="Manage your school's profile and contact information" />

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-success-50 border border-success-100">
          <CheckCircle2 size={16} className="text-success-600 shrink-0 mt-0.5" />
          <p className="text-sm text-success-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* School identity */}
        <FormSection title="School Identity">
          <div className="space-y-4">
            <Input
              id="name" label="School Name *" value={form.name} onChange={set('name')}
              placeholder="Kings International School" required
              startIcon={<School size={16} />}
            />
            {school && (
              <div className="grid grid-cols-2 gap-4 pt-1 pb-2 text-sm text-gray-500 border-t border-border">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Slug</span>
                  <p className="font-mono text-gray-700 mt-0.5">{school.slug}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Alias</span>
                  <p className="font-mono text-gray-700 mt-0.5">{school.alias || '—'}</p>
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* Contact details */}
        <FormSection title="Contact Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="phone" label="Phone" value={form.phone} onChange={set('phone')}
              placeholder="+234-800-000-0000" startIcon={<Phone size={16} />}
            />
            <Input
              id="email" type="email" label="Email" value={form.email} onChange={set('email')}
              placeholder="info@school.edu" startIcon={<Mail size={16} />}
            />
            <div className="md:col-span-2">
              <Input
                id="address" label="Address" value={form.address} onChange={set('address')}
                placeholder="123 School Road, City, State" startIcon={<MapPin size={16} />}
              />
            </div>
          </div>
        </FormSection>

        {/* Branding */}
        <FormSection title="Branding">
          <div className="space-y-4">
            <Input
              id="logo" label="Logo URL" value={form.logo} onChange={set('logo')}
              placeholder="https://example.com/logo.png" startIcon={<Image size={16} />}
              helperText="Paste a public URL to your school logo"
            />
            {form.logo && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-border">
                <img
                  src={form.logo} alt="Logo preview"
                  className="w-16 h-16 object-contain rounded-lg border border-border bg-surface"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="text-xs text-gray-500">
                  <p className="font-medium text-gray-700">Logo preview</p>
                  <p className="mt-0.5 text-gray-400 truncate max-w-[240px]">{form.logo}</p>
                </div>
              </div>
            )}
          </div>
        </FormSection>

        <FormActions onCancel={fetchSchool} cancelLabel="Reset" submitLabel="Save Changes" loading={saving} />
      </form>
    </div>
  );
}
