import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Zap, BookOpen, Sparkles, Shield, ChevronRight,
} from 'lucide-react';
import { subscriptionService } from '../../../services/subscriptionService';
import { SubscriptionPlan, SchoolSubscription } from '../../../types/subscription';
import { useToastStore } from '../../../store/toastStore';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function planKey(name: string): 'BASIC' | 'STANDARD' | 'PREMIUM' {
  const u = name.toUpperCase();
  if (u.includes('PREMIUM'))  return 'PREMIUM';
  if (u.includes('STANDARD')) return 'STANDARD';
  return 'BASIC';
}

const fmt = {
  price: (n: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
    }).format(n),
  date: (s: string) =>
    new Date(s).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
  storage: (gb: number) => (gb >= 9_999 ? 'Unlimited' : `${gb} GB`),
};

// Per-plan icon component
function PlanIcon({ name }: { name: string }) {
  const key = planKey(name);
  if (key === 'PREMIUM') return <Sparkles size={22} className="text-orange-500" />;
  if (key === 'STANDARD') return <Zap size={22} className="text-green-600" />;
  return <BookOpen size={22} className="text-blue-600" />;
}

function planIconBg(name: string): string {
  const key = planKey(name);
  if (key === 'PREMIUM') return 'bg-orange-100';
  if (key === 'STANDARD') return 'bg-green-100';
  return 'bg-blue-100';
}

// Short feature list per plan (from PLAN_META — 4–5 items max per side of the 2-col grid)
const PLAN_FEATURES: Record<'BASIC' | 'STANDARD' | 'PREMIUM', string[]> = {
  BASIC: [
    'Student management',
    'Teacher management',
    'Class management',
    'Assessments',
  ],
  STANDARD: [
    'Everything in Basic',
    'Parent portal',
    'Email notifications',
    'Bulk student import',
    'Result tools',
  ],
  PREMIUM: [
    'Everything in Standard',
    'AI academic advisor',
    'AI risk prediction',
    'Performance forecasting',
    'Executive analytics',
  ],
};

function getFeatureList(plan: SubscriptionPlan): string[] {
  const key = planKey(plan.name);
  // Merge static list with any true keys from plan.features
  const base = PLAN_FEATURES[key] || [];
  return base;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SubscriptionsPage() {
  const navigate     = useNavigate();
  const { addToast } = useToastStore();

  const [plans, setPlans]               = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub]     = useState<SchoolSubscription | null>(null);
  const [loading, setLoading]           = useState(true);
  const [subscribing, setSubscribing]   = useState<string | null>(null);
  const [showCancel, setShowCancel]     = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [switchTarget, setSwitchTarget] = useState<SubscriptionPlan | null>(null);
  const [proration, setProration]       = useState<{ credit: number; amountDue: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pr, sr] = await Promise.all([
        subscriptionService.getAllPlans(),
        subscriptionService.getMyPlan().catch(() => null),
      ]);
      setPlans(pr.data || []);
      setCurrentSub(sr?.data || null);
    } catch (e: any) {
      addToast('error', e.response?.data?.message || 'Failed to load subscription');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const calcProration = (plan: SubscriptionPlan) => {
    if (!currentSub || currentSub.planId === plan.id) return null;
    const now       = Date.now();
    const start     = new Date(currentSub.startDate).getTime();
    const end       = new Date(currentSub.endDate).getTime();
    const remaining = Math.max(0, (end - now) / (end - start));
    const credit    = Math.round(currentSub.plan.priceNGN * remaining);
    return { credit, amountDue: Math.max(0, plan.priceNGN - credit) };
  };

  const handlePlanClick = (plan: SubscriptionPlan) => {
    if (currentSub && currentSub.planId !== plan.id) setProration(calcProration(plan));
    setSwitchTarget(plan);
  };

  const confirmSubscribe = async () => {
    if (!switchTarget) return;
    setSubscribing(switchTarget.id);
    try {
      await subscriptionService.subscribe(switchTarget.id);
      addToast('success', `Switched to ${switchTarget.name} plan`);
      setSwitchTarget(null); setProration(null);
      await fetchData();
    } catch (e: any) {
      addToast('error', e.response?.data?.message || 'Failed to update subscription');
    } finally { setSubscribing(null); }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await subscriptionService.cancel();
      addToast('success', 'Subscription cancelled. Access continues until billing period ends.');
      setShowCancel(false);
      await fetchData();
    } catch (e: any) {
      addToast('error', e.response?.data?.message || 'Failed to cancel');
    } finally { setCancelling(false); }
  };

  const isActive     = currentSub?.status === 'ACTIVE' || currentSub?.status === 'TRIAL';
  const renewalDate  = currentSub
    ? (currentSub.status === 'TRIAL' && currentSub.trialEndsAt
        ? fmt.date(currentSub.trialEndsAt)
        : fmt.date(currentSub.endDate))
    : '—';
  const statusLabel  = currentSub
    ? (currentSub.status === 'TRIAL' ? 'TRIAL' : currentSub.status)
    : '—';

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-skeleton-pulse" />
          <div className="h-4 w-72 bg-gray-200 rounded-lg animate-skeleton-pulse" />
        </div>
        <SkeletonCard />
        <div className="h-6 w-36 bg-gray-200 rounded-lg animate-skeleton-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your Gradellence plan and school limits.
          </p>
        </div>
        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors mt-1"
        >
          Billing <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Free trial banner (no active sub) ────────────────────────────────── */}
      {!currentSub && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles size={18} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-900">You're on the Free Trial</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Trial limits: <strong>10 students · 2 teachers · 2 classes · 5 subjects</strong>.
              Select a plan below to unlock full access.
            </p>
          </div>
        </div>
      )}

      {/* ── Current plan + usage card — ONE ROW, 3 COLUMNS ───────────────────── */}
      {currentSub && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-3 gap-6 divide-x divide-gray-100">

            {/* Column 1 — Current plan */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                Your Current Plan
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${planIconBg(currentSub.plan.name)}`}>
                  <PlanIcon name={currentSub.plan.name} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">{currentSub.plan.name}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-700">
                    {fmt.price(currentSub.plan.priceNGN)}{' '}
                    <span className="text-sm font-normal text-gray-400">/ {currentSub.plan.duration} days</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Renews on {renewalDate}</p>
                </div>
              </div>
              <button
                className="mt-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() =>
                  document.getElementById('choose-plan')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Manage Plan
              </button>
            </div>

            {/* Column 2 — Usage bars — VERTICAL LIST OF 4 ITEMS */}
            <div className="pl-6 space-y-4">
              {[
                { label: 'Students',   used: 0, max: currentSub.plan.maxStudents },
                { label: 'Staff Users', used: 0, max: currentSub.plan.maxUsers },
                { label: 'Branches',   used: 0, max: currentSub.plan.maxBranches },
                { label: 'Storage',    used: 0, max: currentSub.plan.storageGB, unit: 'GB' },
              ].map(item => {
                const pct = item.max > 0 ? Math.min((item.used / item.max) * 100, 100) : 0;
                const maxLabel = item.max >= 99_999
                  ? 'Unlimited'
                  : `${item.max.toLocaleString()}${item.unit ? ` ${item.unit}` : ''}`;
                return (
                  <div key={item.label} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-24 shrink-0">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700 w-28 text-right shrink-0">
                      {maxLabel}&nbsp;
                      <span className="text-gray-400">{Math.round(pct)}%</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Column 3 — Subscription details */}
            <div className="pl-6 space-y-2">
              <p className="text-sm font-semibold text-gray-900 mb-3">Subscription details</p>
              {[
                {
                  label: 'Status',
                  value: (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      {statusLabel.charAt(0) + statusLabel.slice(1).toLowerCase()}
                    </span>
                  ),
                },
                { label: 'Billing cycle', value: `Every ${currentSub.plan.duration} days` },
                { label: 'Next renewal',  value: renewalDate },
                { label: 'Payment method', value: '—' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-gray-800 font-medium">{item.value}</span>
                </div>
              ))}
              <div className="pt-3 space-y-1 border-t border-gray-100 mt-3">
                <button
                  onClick={() => navigate('/billing')}
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  Manage billing <ChevronRight size={14} />
                </button>
                {isActive && (
                  <button
                    onClick={() => setShowCancel(true)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Cancel subscription
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Choose a plan — 3 cards in ONE ROW ───────────────────────────────── */}
      <div id="choose-plan">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Choose a plan</h2>
            <p className="text-sm text-gray-500">
              Upgrade, downgrade, or switch to a plan that fits your school's needs.
            </p>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
            <Shield size={12} /> Secure, encrypted, and compliant payments.
          </p>
        </div>

        {/* EXACTLY 3 EQUAL COLUMNS */}
        <div className="grid grid-cols-3 gap-4">
          {plans.map(p => {
            const isCurrent = currentSub?.planId === p.id && isActive;
            const key       = planKey(p.name);
            const features  = getFeatureList(p);
            const pror      = isCurrent ? null : calcProration(p);
            const isUpgrade = currentSub ? p.priceNGN > currentSub.plan.priceNGN : true;

            return (
              <div
                key={p.id}
                className={`relative rounded-xl border-2 p-5 flex flex-col gap-4 ${
                  isCurrent
                    ? 'border-primary-500 bg-white shadow-md'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Current plan chip */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-600 text-white">
                      CURRENT PLAN
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${planIconBg(p.name)}`}>
                    <PlanIcon name={p.name} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.description || ''}</p>
                  </div>
                </div>

                {/* Price */}
                <p className="text-2xl font-bold text-gray-900">
                  {fmt.price(p.priceNGN)}{' '}
                  <span className="text-sm font-normal text-gray-400">/ {p.duration} days</span>
                </p>

                {/* Limits — 2 columns inside each card */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-gray-600">
                  <span>{p.maxStudents >= 99_999 ? 'Unlimited' : p.maxStudents.toLocaleString()} students</span>
                  <span>{p.maxUsers >= 99_999 ? 'Unlimited' : p.maxUsers.toLocaleString()} staff users</span>
                  <span>{p.maxBranches >= 999 ? 'Unlimited' : p.maxBranches} {p.maxBranches === 1 ? 'branch' : 'branches'}</span>
                  <span>{p.storageGB >= 9_999 ? 'Unlimited' : `${p.storageGB} GB`} storage</span>
                </div>

                {/* Features checklist — 2 columns */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {features.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Check size={12} className="text-green-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                {/* Proration hint */}
                {pror && pror.credit > 0 && (
                  <p className="text-xs text-green-600 font-medium">
                    ~{fmt.price(pror.credit)} credit from current plan applied
                  </p>
                )}

                {/* CTA button */}
                <button
                  disabled={isCurrent || subscribing === p.id}
                  onClick={() => !isCurrent && handlePlanClick(p)}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold mt-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCurrent
                      ? 'bg-primary-600 text-white cursor-default'
                      : key === 'PREMIUM'
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {subscribing === p.id
                    ? 'Processing…'
                    : isCurrent
                    ? 'Current Plan'
                    : key === 'PREMIUM'
                    ? 'Upgrade to Premium'
                    : !currentSub
                    ? `Select ${p.name}`
                    : isUpgrade
                    ? `Upgrade to ${p.name}`
                    : `Select ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Compare all plans ────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Compare all plans</h2>
          <p className="text-sm text-gray-500 mb-4">Find the perfect plan for your school.</p>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-gray-700 w-1/4">
                    Feature
                  </th>
                  {plans.map(p => {
                    const isCurrent = currentSub?.planId === p.id && isActive;
                    return (
                      <th key={p.id} className="px-5 py-3.5 text-center text-sm font-semibold text-gray-700">
                        <span className="inline-flex items-center justify-center gap-1.5">
                          {p.name}
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-primary-600 text-white px-1.5 py-0.5 rounded-full normal-case leading-none">
                              Current
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Numeric limits */}
                {[
                  { label: 'Students',   get: (p: SubscriptionPlan) => p.maxStudents >= 99_999 ? 'Unlimited' : p.maxStudents.toLocaleString() },
                  { label: 'Staff Users', get: (p: SubscriptionPlan) => p.maxUsers >= 99_999 ? 'Unlimited' : p.maxUsers.toLocaleString() },
                  { label: 'Branches',   get: (p: SubscriptionPlan) => p.maxBranches >= 999 ? 'Unlimited' : String(p.maxBranches) },
                  { label: 'Storage',    get: (p: SubscriptionPlan) => p.storageGB >= 9_999 ? 'Unlimited' : `${p.storageGB} GB` },
                ].map(row => (
                  <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-700">{row.label}</td>
                    {plans.map(p => (
                      <td key={p.id} className="px-5 py-3 text-sm text-center font-semibold text-gray-800">
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Feature flags from plan.features JSON */}
                {[
                  { label: 'Parent Portal',       key: 'parentPortal' },
                  { label: 'Bulk Student Import',  key: 'bulkImport' },
                  { label: 'AI Features',          key: 'aiRemarks' },
                  { label: 'Email Notifications',  key: 'emailNotifications' },
                  { label: 'Result Broadsheet',    key: 'resultBroadsheet' },
                  { label: 'AI Academic Advisor',  key: 'aiAdvisor' },
                  { label: 'Executive Analytics',  key: 'executiveAnalytics' },
                ].map(feat => (
                  <tr key={feat.label} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-700">{feat.label}</td>
                    {plans.map(p => {
                      const has = p.features?.[feat.key] === true;
                      return (
                        <td key={p.id} className="px-5 py-3 text-center">
                          {has ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full mx-auto">
                              <Check size={12} className="text-green-600" />
                            </span>
                          ) : (
                            <span className="text-gray-300 text-base">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!switchTarget}
        onClose={() => { setSwitchTarget(null); setProration(null); }}
        onConfirm={confirmSubscribe}
        variant="primary"
        title={`Switch to ${switchTarget?.name}?`}
        message={
          proration && proration.credit > 0
            ? `A prorated credit of ${fmt.price(proration.credit)} will be applied. Amount due: ${fmt.price(proration.amountDue)}.`
            : `You'll be subscribed to the ${switchTarget?.name} plan for ${fmt.price(switchTarget?.priceNGN ?? 0)} every ${switchTarget?.duration} days.`
        }
        confirmLabel="Confirm"
        loading={!!subscribing}
      />

      <ConfirmDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={confirmCancel}
        title="Cancel subscription?"
        message="Your subscription will be cancelled but you'll retain full access until your current billing period ends."
        confirmLabel="Cancel Subscription"
        loading={cancelling}
      />

    </div>
  );
}
