import { useState, useEffect, useRef } from 'react';
import {
  School, Phone, Mail, MapPin, Palette, GraduationCap,
  Settings, Sliders, Upload, Link2, Eye, CheckCircle2,
  AlertCircle, ChevronRight, Lightbulb, Users, BookOpen,
  Layers, CalendarDays, BookMarked, BadgeCheck,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../services/apiClient';
import { analyticsService, OverviewData } from '../../../services/analyticsService';
import { subscriptionService } from '../../../services/subscriptionService';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';
import { useToastStore } from '../../../store/toastStore';

// ─── Types ─────────────────────────────────────────────────────────────────

interface SchoolData {
  id: string;
  name: string;
  alias: string | null;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  isActive: boolean;
}

interface FormState {
  name: string;
  alias: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

type Tab = 'profile' | 'academic' | 'system' | 'preferences';

// ─── Tab definitions ────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',     label: 'School Profile',    icon: <School size={15} /> },
  { id: 'academic',    label: 'Academic Settings',  icon: <GraduationCap size={15} /> },
  { id: 'system',      label: 'System Settings',    icon: <Settings size={15} /> },
  { id: 'preferences', label: 'Preferences',        icon: <Sliders size={15} /> },
];

// ─── Section card wrapper ───────────────────────────────────────────────────

function SectionCard({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-[18px] border border-border shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
          {icon}
        </div>
        <h3 className="text-card-title text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Coming Soon placeholder ────────────────────────────────────────────────

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Settings size={24} className="text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm">{description}</p>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function SchoolSettingsPage() {
  const { user }       = useAuthStore();
  const { addToast }   = useToastStore();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [school, setSchool]   = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState<FormState>({ name: '', alias: '', address: '', phone: '', email: '', logo: '' });
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Right-panel data
  const [overview, setOverview]   = useState<OverviewData | null>(null);
  const [planName, setPlanName]   = useState<string | null>(null);

  // ── Fetch school ──────────────────────────────────────────────────────────

  const fetchSchool = async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/schools/${user.schoolId}`);
      const s: SchoolData = data.data ?? data;
      setSchool(s);
      setForm({
        name:    s.name    ?? '',
        alias:   s.alias   ?? '',
        address: s.address ?? '',
        phone:   s.phone   ?? '',
        email:   s.email   ?? '',
        logo:    s.logo    ?? '',
      });
    } catch {
      addToast('error', 'Failed to load school settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchool(); }, [user?.schoolId]); // eslint-disable-line

  useEffect(() => {
    analyticsService.getOverview()
      .then(r => setOverview(r.data))
      .catch(() => {});
    subscriptionService.getMyPlan()
      .then(r => setPlanName(r.data?.plan?.name ?? null))
      .catch(() => {});
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleLogoFile = (file: File) => {
    if (!file.type.match(/^image\/(png|jpg|jpeg|svg\+xml)$/)) {
      addToast('error', 'Only PNG, JPG, or SVG files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'Logo must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, logo: e.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!school) return;
    setSaving(true);
    try {
      const payload: Partial<FormState> = {};
      if (form.name    !== (school.name    ?? '')) payload.name    = form.name;
      if (form.alias   !== (school.alias   ?? '')) payload.alias   = form.alias;
      if (form.address !== (school.address ?? '')) payload.address = form.address;
      if (form.phone   !== (school.phone   ?? '')) payload.phone   = form.phone;
      if (form.email   !== (school.email   ?? '')) payload.email   = form.email;
      if (form.logo    !== (school.logo    ?? '')) payload.logo    = form.logo;

      if (Object.keys(payload).length === 0) {
        addToast('info', 'No changes to save');
        setSaving(false);
        return;
      }
      await apiClient.patch(`/v1/schools/${school.id}`, payload);
      addToast('success', 'School settings saved successfully');
      fetchSchool();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded-btn animate-pulse" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
        <SkeletonCard />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <span>Dashboard</span>
            <ChevronRight size={12} />
            <span>Settings</span>
            <ChevronRight size={12} />
            <span className="text-gray-700 font-medium">School Settings</span>
          </nav>
          <h1 className="text-page-title text-gray-900">School Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your school profile, branding and preferences.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          className="shrink-0"
        >
          <CheckCircle2 size={15} />
          Save Changes
        </Button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-border">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}

      {activeTab === 'profile' && (
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">

            {/* ── Left column ──────────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* School Identity */}
              <SectionCard icon={<School size={18} />} title="School Identity">
                <div className="space-y-4">
                  <Input
                    id="name"
                    label="School Name *"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="e.g. Kings International School"
                    required
                    startIcon={<School size={16} />}
                    helperText="The official name used on reports and documents"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Slug
                      </label>
                      <div className="h-input flex items-center px-4 bg-gray-50 border border-border rounded-input text-sm text-gray-500 font-mono">
                        {school?.slug ?? '—'}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Used in your school's URL — cannot be changed</p>
                    </div>
                    <Input
                      id="alias"
                      label="Alias (Short Name)"
                      value={form.alias}
                      onChange={set('alias')}
                      placeholder="e.g. KIS"
                      helperText="Used for reports and documents"
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Contact Details */}
              <SectionCard icon={<Phone size={18} />} title="Contact Details">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      id="phone"
                      label="Phone"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="+234 800 000 0000"
                      startIcon={<Phone size={16} />}
                    />
                    <Input
                      id="email"
                      type="email"
                      label="Email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="info@school.edu"
                      startIcon={<Mail size={16} />}
                    />
                  </div>
                  <Input
                    id="address"
                    label="Address"
                    value={form.address}
                    onChange={set('address')}
                    placeholder="123 School Road, City, State, Nigeria"
                    startIcon={<MapPin size={16} />}
                  />
                </div>
              </SectionCard>

              {/* Branding */}
              <SectionCard icon={<Palette size={18} />} title="Branding">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Upload drop zone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
                      <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={[
                          'h-[100px] flex flex-col items-center justify-center gap-2 rounded-input border-2 border-dashed cursor-pointer transition-colors duration-150',
                          dragOver
                            ? 'border-primary-400 bg-primary-50'
                            : 'border-border bg-gray-50 hover:border-primary-300 hover:bg-primary-50/40',
                        ].join(' ')}
                      >
                        <Upload size={18} className="text-gray-400" />
                        <p className="text-xs font-medium text-gray-600">Upload Logo</p>
                        <p className="text-[10px] text-gray-400">PNG, JPG or SVG · Max 2 MB</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                        />
                      </div>
                    </div>

                    {/* Logo URL */}
                    <div className="space-y-3">
                      <Input
                        id="logo"
                        label="Logo URL (Optional)"
                        value={form.logo.startsWith('data:') ? '' : form.logo}
                        onChange={set('logo')}
                        placeholder="https://example.com/logo.png"
                        startIcon={<Link2 size={16} />}
                        helperText="Paste a public URL to your school logo"
                      />
                      {/* Preview */}
                      {form.logo && (
                        <div className="flex items-center gap-3 p-2.5 bg-gray-50 border border-border rounded-xl">
                          <img
                            src={form.logo}
                            alt="Logo preview"
                            className="w-10 h-10 object-contain rounded-lg border border-border bg-surface shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700">Preview</p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {form.logo.startsWith('data:') ? 'Uploaded file' : form.logo}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Bottom save actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => fetchSchool()} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving}>
                  <CheckCircle2 size={15} />
                  Save Changes
                </Button>
              </div>
            </div>

            {/* ── Right column ─────────────────────────────────────────────── */}
            <div className="space-y-4 xl:sticky xl:top-6">

              {/* School Preview */}
              <div className="bg-surface rounded-[18px] border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <Eye size={15} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">School Profile Preview</span>
                </div>

                {/* Banner + logo */}
                <div className="relative h-20 bg-gradient-to-br from-primary-600 to-primary-700">
                  <div className="absolute -bottom-7 left-5">
                    {form.logo ? (
                      <img
                        src={form.logo}
                        alt={form.name}
                        className="w-14 h-14 rounded-2xl border-2 border-surface shadow-md object-contain bg-surface"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl border-2 border-surface shadow-md bg-primary-100 flex items-center justify-center">
                        <School size={22} className="text-primary-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pt-10 pb-5 space-y-4">
                  <div>
                    <p className="text-base font-bold text-gray-900 leading-tight">
                      {form.name || school?.name || 'School Name'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {form.alias || school?.alias || school?.slug || '—'}
                    </p>
                    <div className="mt-2">
                      <span className={[
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        school?.isActive ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-500',
                      ].join(' ')}>
                        <span className={`w-1.5 h-1.5 rounded-full ${school?.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
                        {school?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    {[
                      { icon: <BadgeCheck size={13} />, label: 'Plan',             value: planName ?? '—' },
                      { icon: <Users size={13} />,     label: 'Students',          value: overview?.totalStudents?.toLocaleString() ?? '—' },
                      { icon: <BookOpen size={13} />,  label: 'Teachers',          value: overview?.totalTeachers?.toLocaleString() ?? '—' },
                      { icon: <Layers size={13} />,    label: 'Classes',           value: overview?.totalClasses?.toLocaleString() ?? '—' },
                      { icon: <CalendarDays size={13} />, label: 'Academic Session', value: overview?.activeSession?.name ?? '—' },
                      { icon: <BookMarked size={13} />, label: 'Current Term',     value: overview?.currentTerm?.name ?? '—' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <span className="text-gray-400">{icon}</span>
                          {label}
                        </span>
                        <span className="font-semibold text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-primary-50 rounded-[18px] border border-primary-100 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb size={15} className="text-primary-600" />
                  <span className="text-sm font-semibold text-primary-800">Tips</span>
                </div>
                <p className="text-xs text-primary-700 leading-relaxed">
                  Keep your school information up to date. This information will appear on
                  generated reports, transcripts, and official documents.
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'academic' && (
        <ComingSoon
          title="Academic Settings"
          description="Configure grading systems, result templates, and academic preferences. Coming soon."
        />
      )}

      {activeTab === 'system' && (
        <ComingSoon
          title="System Settings"
          description="Manage notifications, integrations, API keys, and security settings. Coming soon."
        />
      )}

      {activeTab === 'preferences' && (
        <ComingSoon
          title="Preferences"
          description="Customise your dashboard layout, language, timezone and display options. Coming soon."
        />
      )}
    </div>
  );
}
