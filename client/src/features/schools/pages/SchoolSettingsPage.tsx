import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../services/apiClient';

interface School {
  id: string;
  name: string;
  alias: string | null;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
}

export function SchoolSettingsPage() {
  const { user } = useAuthStore();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
  });

  const fetchSchool = async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/v1/schools/${user.schoolId}`);
      const s = data.data || data;
      setSchool(s);
      setForm({
        name: s.name || '',
        address: s.address || '',
        phone: s.phone || '',
        email: s.email || '',
        logo: s.logo || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load school');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchool(); }, [user?.schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, string> = {};
      if (form.name !== school.name) payload.name = form.name;
      if (form.address !== (school.address || '')) payload.address = form.address;
      if (form.phone !== (school.phone || '')) payload.phone = form.phone;
      if (form.email !== (school.email || '')) payload.email = form.email;
      if (form.logo !== (school.logo || '')) payload.logo = form.logo;

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes to save.');
        setSaving(false);
        return;
      }

      await apiClient.patch(`/v1/schools/${school.id}`, payload);
      setSuccess('School settings updated successfully!');
      fetchSchool();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save school settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading school settings...</p></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your school profile information.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">School Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="e.g. Springfield Elementary"
              required
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="e.g. +2348012345678"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="e.g. info@school.edu"
              type="email"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
              placeholder="e.g. 123 Main St"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Logo URL</label>
            <input
              value={form.logo}
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
              className="input"
              placeholder="e.g. https://example.com/logo.png"
            />
          </div>
        </div>

        {school && (
          <div className="text-sm text-gray-500 border-t border-gray-200 pt-4">
            <p>Slug: <span className="font-mono">{school.slug}</span></p>
            <p>Alias: {school.alias || '—'}</p>
          </div>
        )}

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}