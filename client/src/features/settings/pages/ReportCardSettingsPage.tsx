import { useState, useEffect, useRef } from 'react';
import {
  LayoutTemplate, School, ToggleLeft, ToggleRight, CheckCircle2,
  ChevronRight, Upload, Eye, X, Plus, Palette, FileText,
  Lock, Sparkles,
} from 'lucide-react';
// import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { reportCardConfigService } from '../../../services/reportCardConfigService';
import { subscriptionService } from '../../../services/subscriptionService';
import { ReportCardConfig, UpdateReportCardConfigDto } from '../../../types/report-card-config';

// ─── Template definitions ────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional Nigerian school format with full assessment breakdown',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean contemporary design with visual score indicators',
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Comprehensive format including affective and psychomotor domains',
  },
  {
    id: 'primary',
    name: 'Primary',
    description: 'Simplified child-friendly format for nursery and primary schools',
  },
] as const;

// ─── Default config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ReportCardConfig = {
  id: '',
  schoolId: '',
  template: 'classic',
  accentColor: '#1a56db',
  motto: '',
  principalName: '',
  principalSignature: '',
  schoolStamp: '',
  showRanking: true,
  showCumulative: true,
  showAffective: false,
  showPsychomotor: false,
  showTeacherRemark: true,
  showPrincipalRemark: true,
  showResumptionDate: true,
  showStamp: true,
  showPoweredBy: true,
  affectiveTraits: ['Punctuality', 'Neatness', 'Honesty', 'Cooperation', 'Attentiveness', 'Perseverance'],
  psychomotorTraits: ['Drawing', 'Sports', 'Handwriting', 'Musical Skills'],
  footerText: '',
  nextTermDate: '',
};

// ─── Section toggle definitions ──────────────────────────────────────────────

const SECTION_TOGGLES: { key: keyof ReportCardConfig; label: string; sub: string }[] = [
  { key: 'showRanking', label: 'Show Class Position/Ranking', sub: "Display student's position in class" },
  { key: 'showCumulative', label: 'Show Cumulative Performance', sub: 'Show performance across all 3 terms' },
  { key: 'showAffective', label: 'Show Affective Domain Assessment', sub: 'Include behavior and character assessment' },
  { key: 'showPsychomotor', label: 'Show Psychomotor Skills', sub: 'Include practical skills assessment' },
  { key: 'showTeacherRemark', label: "Class Teacher's Remark", sub: "Include space for teacher's comments" },
  { key: 'showPrincipalRemark', label: "Principal's Remark", sub: "Include space for principal's comments" },
  { key: 'showResumptionDate', label: 'Next Term Resumption Date', sub: 'Show when next term begins' },
  { key: 'showStamp', label: 'School Stamp', sub: 'Display school stamp on report card' },
  { key: 'showPoweredBy', label: '"Powered by Gradellence" branding', sub: 'Remove Gradellence branding (Premium feature)' },
];

// ─── Section card wrapper ────────────────────────────────────────────────────

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

// ─── Toggle switch ───────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled = false, tooltip,
}: { checked: boolean; onChange: () => void; disabled?: boolean; tooltip?: string }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      title={tooltip}
      className={[
        'transition-colors',
        disabled ? 'opacity-40 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700',
      ].join(' ')}
    >
      {checked ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-300" />}
    </button>
  );
}

// ─── Trait editor ────────────────────────────────────────────────────────────

function TraitEditor({
  traits, onChange, max = 8,
}: { traits: string[]; onChange: (traits: string[]) => void; max?: number }) {
  const update = (i: number, value: string) => {
    const next = [...traits];
    next[i] = value;
    onChange(next);
  };
  const remove = (i: number) => onChange(traits.filter((_, idx) => idx !== i));
  const add = () => {
    if (traits.length >= max) return;
    onChange([...traits, '']);
  };

  return (
    <div className="space-y-2">
      {traits.map((trait, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            id={`trait-${i}`}
            value={trait}
            onChange={(e) => update(i, e.target.value)}
            placeholder="Trait name"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-2 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            aria-label="Remove trait"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={traits.length >= max}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={15} /> Add Trait
      </button>
      <p className="text-xs text-gray-400">Maximum {max} traits per domain</p>
    </div>
  );
}

// ─── Image upload section ────────────────────────────────────────────────────

function ImageUpload({
  label, value, onUpload, note,
}: { label: string; value: string; onUpload: (file: File) => void; note: string }) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-4">
        {value ? (
          <img
            src={value}
            alt={label}
            className="w-20 h-14 object-contain rounded-lg border border-border bg-gray-50"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-20 h-14 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 text-center px-1">No {label.toLowerCase()} uploaded</span>
          </div>
        )}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Upload size={14} /> Upload
          </button>
          <p className="text-[10px] text-gray-400">{note}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Live preview panel ──────────────────────────────────────────────────────

function ReportCardPreview({ config }: { config: ReportCardConfig }) {
  const accent = config.accentColor || '#1a56db';
  // template is defined but not used in this component
  // const template = TEMPLATES.find((t) => t.id === config.template);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden" style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%' }}>
      {/* Header */}
      <div className="px-4 py-3 text-center" style={{ backgroundColor: accent }}>
        <p className="text-white font-bold text-sm">SAMPLE SCHOOL</p>
        <p className="text-white/80 text-[8px]">Sample Address • 0800 000 0000</p>
      </div>
      <div className="px-4 py-2 text-center">
        <p className="text-[10px] font-bold text-gray-800">STUDENT REPORT CARD</p>
        <p className="text-[8px] text-gray-500">Sample Student • JSS2A • 2025/2026 1st Term</p>
      </div>

      {/* Student info */}
      <div className="px-4 py-2 grid grid-cols-2 gap-1 text-[8px] text-gray-700">
        <p><b>Student:</b> Sample Student</p>
        <p><b>Admission:</b> SAMPLE-001</p>
        <p><b>Class:</b> JSS2A</p>
        <p><b>Term:</b> 1st Term</p>
      </div>

      {/* Results table */}
      <div className="px-4">
        <table className="w-full text-[7px]">
          <thead>
            <tr style={{ backgroundColor: accent }}>
              <th className="text-white px-1 py-0.5 text-left">Subject</th>
              <th className="text-white px-1 py-0.5">Score</th>
              <th className="text-white px-1 py-0.5">Grade</th>
              <th className="text-white px-1 py-0.5">Remark</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Mathematics', '82.0', 'A', 'Excellent'],
              ['English', '74.0', 'B', 'Good'],
              ['Science', '68.0', 'C', 'Fair'],
            ].map(([subj, score, grade, remark], i) => (
              <tr key={subj} className={i % 2 ? 'bg-gray-50' : ''}>
                <td className="px-1 py-0.5">{subj}</td>
                <td className="px-1 py-0.5 text-center">{score}</td>
                <td className="px-1 py-0.5 text-center">{grade}</td>
                <td className="px-1 py-0.5 text-center">{remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-4 py-2 text-[8px] text-gray-700">
        <p><b>Average:</b> 74.7 &nbsp; <b>Grade:</b> B &nbsp; <b>Position:</b> 3 of 25</p>
      </div>

      {/* Sections based on toggles */}
      {config.showAffective && (
        <div className="px-4 py-1 border-t border-gray-100">
          <p className="text-[8px] font-bold" style={{ color: accent }}>AFFECTIVE DOMAIN</p>
          <p className="text-[7px] text-gray-500">{config.affectiveTraits?.slice(0, 3).join(' • ') || 'Punctuality • Neatness'}</p>
        </div>
      )}
      {config.showPsychomotor && (
        <div className="px-4 py-1 border-t border-gray-100">
          <p className="text-[8px] font-bold" style={{ color: accent }}>PSYCHOMOTOR</p>
          <p className="text-[7px] text-gray-500">{config.psychomotorTraits?.slice(0, 3).join(' • ') || 'Drawing • Sports'}</p>
        </div>
      )}
      {config.showTeacherRemark && (
        <div className="px-4 py-1 border-t border-gray-100">
          <p className="text-[8px] font-bold text-gray-700">Class Teacher's Remark:</p>
          <div className="border-b border-dotted border-gray-300 mt-0.5" />
        </div>
      )}
      {config.showPrincipalRemark && (
        <div className="px-4 py-1 border-t border-gray-100">
          <p className="text-[8px] font-bold text-gray-700">Principal's Remark:</p>
          <div className="border-b border-dotted border-gray-300 mt-0.5" />
        </div>
      )}
      {config.showResumptionDate && config.nextTermDate && (
        <div className="px-4 py-1 text-[8px]" style={{ color: accent }}>
          <b>Next Term Begins: {config.nextTermDate}</b>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-1 border-t border-gray-100 flex items-center justify-between text-[6px] text-gray-400">
        <span>Generated on {new Date().toLocaleDateString()}</span>
        {config.showPoweredBy && <span>Powered by Gradellence</span>}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ReportCardSettingsPage() {
  const { addToast } = useToastStore();
  const [config, setConfig] = useState<ReportCardConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [isPremium, setIsPremium] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Fetch config ──────────────────────────────────────────────────────────

  useEffect(() => {
    reportCardConfigService.getConfig()
      .then((res) => {
        if (res.data) setConfig({ ...DEFAULT_CONFIG, ...res.data });
      })
      .catch(() => {
        // Use defaults if no config exists yet
      })
      .finally(() => setLoading(false));

    // Check if school is on premium plan
    subscriptionService.getMyPlan()
      .then((r) => {
        const planName = r.data?.plan?.name?.toLowerCase() ?? '';
        setIsPremium(planName.includes('premium') || planName.includes('pro'));
      })
      .catch(() => {});
  }, []);

  // ── Update helpers ────────────────────────────────────────────────────────

  const update = <K extends keyof ReportCardConfig>(key: K, value: ReportCardConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const dto: UpdateReportCardConfigDto = {
        template: config.template,
        accentColor: config.accentColor,
        motto: config.motto || undefined,
        principalName: config.principalName || undefined,
        showRanking: config.showRanking,
        showCumulative: config.showCumulative,
        showAffective: config.showAffective,
        showPsychomotor: config.showPsychomotor,
        showTeacherRemark: config.showTeacherRemark,
        showPrincipalRemark: config.showPrincipalRemark,
        showResumptionDate: config.showResumptionDate,
        showStamp: config.showStamp,
        showPoweredBy: config.showPoweredBy,
        affectiveTraits: config.affectiveTraits,
        psychomotorTraits: config.psychomotorTraits,
        footerText: config.footerText || undefined,
        nextTermDate: config.nextTermDate || undefined,
      };
      await reportCardConfigService.updateConfig(dto);
      addToast('success', 'Report card settings saved successfully');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to save report card settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Image upload ──────────────────────────────────────────────────────────

  const handleUpload = async (field: 'principalSignature' | 'schoolStamp', file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'File must be under 2 MB');
      return;
    }
    try {
      const res = await reportCardConfigService.uploadImage(field, file);
      if (res.data?.url) {
        update(field, res.data.url);
        addToast('success', `${field === 'principalSignature' ? 'Signature' : 'Stamp'} uploaded successfully`);
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to upload image');
    }
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS = [
    { id: 'template', label: 'Template', icon: <LayoutTemplate size={15} /> },
    { id: 'identity', label: 'School Identity', icon: <School size={15} /> },
    { id: 'sections', label: 'Sections', icon: <ToggleRight size={15} /> },
    { id: 'domains', label: 'Affective Domain', icon: <Sparkles size={15} /> },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded-btn animate-pulse" />
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            <div className="h-40 bg-gray-100 rounded-[18px] animate-pulse" />
            <div className="h-40 bg-gray-100 rounded-[18px] animate-pulse" />
          </div>
          <div className="h-64 bg-gray-100 rounded-[18px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <span>Dashboard</span>
            <ChevronRight size={12} />
            <span>Settings</span>
            <ChevronRight size={12} />
            <span className="text-gray-700 font-medium">Report Card</span>
          </nav>
          <h1 className="text-page-title text-gray-900">Report Card Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Customize the look and content of your school's report cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setPreviewOpen(true)}
            className="lg:hidden"
          >
            <Eye size={15} /> Preview
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            <CheckCircle2 size={15} /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left column — tabs */}
        <div className="space-y-5">
          {/* Tab bar */}
          <div className="border-b border-border">
            <div className="flex gap-0 -mb-px overflow-x-auto">
              {TABS.map((tab) => (
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

          {/* TAB 1: Template */}
          {activeTab === 'template' && (
            <div className="space-y-5">
              <SectionCard icon={<LayoutTemplate size={18} />} title="Choose Your Report Card Style">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TEMPLATES.map((t) => {
                    const isActive = config.template === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => update('template', t.id)}
                        className={[
                          'p-4 rounded-xl border-2 text-left transition-all duration-150',
                          isActive
                            ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                          {isActive && <CheckCircle2 size={18} className="text-primary-600" />}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard icon={<Palette size={18} />} title="Brand Color">
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => update('accentColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Accent Color</p>
                    <p className="text-xs text-gray-400">Used for headers, table accents, and highlights</p>
                  </div>
                  <div
                    className="h-10 flex-1 max-w-[160px] rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    <span className="text-xs font-semibold text-white">Preview</span>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 2: School Identity */}
          {activeTab === 'identity' && (
            <div className="space-y-5">
              <SectionCard icon={<School size={18} />} title="School Branding">
                <div className="space-y-4">
                  <Input
                    id="motto"
                    label="School Motto"
                    value={config.motto || ''}
                    onChange={(e) => update('motto', e.target.value)}
                    placeholder="e.g. Knowledge is Power"
                  />
                  <Input
                    id="principalName"
                    label="Principal Name"
                    value={config.principalName || ''}
                    onChange={(e) => update('principalName', e.target.value)}
                    placeholder="e.g. Mrs. Adebayo"
                  />
                  <Input
                    id="nextTermDate"
                    label="Next Term Resumption Date"
                    value={config.nextTermDate || ''}
                    onChange={(e) => update('nextTermDate', e.target.value)}
                    placeholder="e.g. 6th January 2026"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Footer Text</label>
                    <textarea
                      value={config.footerText || ''}
                      onChange={(e) => update('footerText', e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Optional footer message"
                      className="w-full px-4 py-3 rounded-input border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="mt-1 text-xs text-gray-400">{config.footerText?.length ?? 0}/200</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={<Upload size={18} />} title="Uploads">
                <div className="space-y-5">
                  <ImageUpload
                    label="Principal Signature"
                    value={config.principalSignature || ''}
                    onUpload={(f) => handleUpload('principalSignature', f)}
                    note="Recommended: White background, clear signature, max 2MB"
                  />
                  <ImageUpload
                    label="School Stamp"
                    value={config.schoolStamp || ''}
                    onUpload={(f) => handleUpload('schoolStamp', f)}
                    note="Recommended: White background, clear stamp, max 2MB"
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 3: Sections */}
          {activeTab === 'sections' && (
            <SectionCard icon={<ToggleRight size={18} />} title="Report Card Sections">
              <p className="text-sm text-gray-500 -mt-2">Choose what appears on your report card</p>
              <div className="space-y-1">
                {SECTION_TOGGLES.map(({ key, label, sub }) => {
                  const isPoweredBy = key === 'showPoweredBy';
                  const disabled = isPoweredBy && !isPremium;
                  return (
                    <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{sub}</p>
                        {disabled && (
                          <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                            <Lock size={10} /> Upgrade to Premium to remove Gradellence branding
                          </p>
                        )}
                      </div>
                      <Toggle
                        checked={Boolean(config[key])}
                        onChange={() => update(key, !config[key])}
                        disabled={disabled}
                        tooltip={disabled ? 'Upgrade to Premium to remove Gradellence branding' : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* TAB 4: Affective Domain */}
          {activeTab === 'domains' && (
            <div className="space-y-5">
              {!config.showAffective && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  Enable Affective Domain in the Sections tab first to customize traits.
                </div>
              )}
              <div className={!config.showAffective ? 'opacity-50 pointer-events-none' : ''}>
                <SectionCard icon={<Sparkles size={18} />} title="Affective Domain Traits">
                  <p className="text-sm text-gray-500 -mt-2">Customize the character traits assessed on your report card</p>
                  <TraitEditor
                    traits={config.affectiveTraits || []}
                    onChange={(traits) => update('affectiveTraits', traits)}
                  />
                </SectionCard>
              </div>
              <div className={!config.showPsychomotor ? 'opacity-50 pointer-events-none' : ''}>
                <SectionCard icon={<FileText size={18} />} title="Psychomotor Skills Traits">
                  <p className="text-sm text-gray-500 -mt-2">Customize the practical skills assessed on your report card</p>
                  <TraitEditor
                    traits={config.psychomotorTraits || []}
                    onChange={(traits) => update('psychomotorTraits', traits)}
                  />
                </SectionCard>
              </div>
            </div>
          )}
        </div>

        {/* Right column — live preview (desktop) */}
        <div className="hidden xl:block space-y-4 xl:sticky xl:top-6">
          <div className="bg-surface rounded-[18px] border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Eye size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Live Preview</span>
            </div>
            <div className="p-4 overflow-hidden">
              <div className="w-full aspect-[210/297] overflow-hidden">
                <ReportCardPreview config={config} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile preview modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Report Card Preview"
        size="lg"
      >
        <div className="overflow-auto">
          <ReportCardPreview config={config} />
        </div>
      </Modal>
    </div>
  );
}