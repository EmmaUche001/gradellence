import { useState, useEffect } from 'react';
import { Check, Zap, BookOpen, Sparkles } from 'lucide-react';
import { subscriptionService } from '../../../services/subscriptionService';
import { SubscriptionPlan, SchoolSubscription } from '../../../types/subscription';
import { useToastStore } from '../../../store/toastStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

// ── Plan metadata (name-based key lookup) ──────────────────────────────────
function planKey(name: string): 'BASIC' | 'STANDARD' | 'PREMIUM' {
  const u = name.toUpperCase();
  if (u.includes('PREMIUM'))  return 'PREMIUM';
  if (u.includes('STANDARD')) return 'STANDARD';
  return 'BASIC';
}

const PLAN_META = {
  BASIC: {
    icon:        <BookOpen size={22} />,
    iconBg:      'bg-primary-50 text-primary-600',
    borderActive:'border-primary-500 ring-2 ring-primary-100',
    border:      'border-border',
    badgeVariant:'primary' as BadgeVariant,
    btnClass:    'bg-primary-600 hover:bg-primary-700',
    features: [
      'Up to 500 students', 'Student & teacher management',
      'Class & subject management', 'Academic sessions & terms',
      'Assessment entry', 'Automatic result computation',
      'Grade calculation', 'Result publishing',
      'Printable report cards', 'Basic analytics dashboard',
      '5 GB storage',
    ],
  },
  STANDARD: {
    icon:        <Zap size={22} />,
    iconBg:      'bg-success-50 text-success-600',
    borderActive:'border-success-500 ring-2 ring-success-100',
    border:      'border-border',
    badgeVariant:'success' as BadgeVariant,
    btnClass:    'bg-success-600 hover:bg-success-700',
    features: [
      'Everything in Basic', 'Up to 2,000 students',
      'Parent portal', 'Email notifications',
      'Bulk student import', 'CSV/Excel score upload',
      'Result broadsheet', 'Multi-branch (up to 3)',
      'AI result insights', 'AI-generated remarks',
      '50 GB storage',
    ],
  },
  PREMIUM: {
    icon:        <Sparkles size={22} />,
    iconBg:      'bg-warning-50 text-warning-600',
    borderActive:'border-warning-500 ring-2 ring-warning-100',
    border:      'border-border',
    badgeVariant:'warning' as BadgeVariant,
    btnClass:    'bg-warning-600 hover:bg-warning-700',
    features: [
      'Everything in Standard', 'Unlimited students & users',
      'AI academic advisor', 'AI risk prediction',
      'AI performance forecasting', 'AI promotion recommendations',
      'Executive analytics dashboard', 'Unlimited branches',
      'Advanced RBAC (custom roles)', 'Full audit trail',
      'API access', 'Unlimited storage',
    ],
  },
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  ACTIVE:    'success',
  TRIAL:     'warning',
  EXPIRED:   'danger',
  CANCELLED: 'gray',
  PENDING:   'info',
};

const fmt = {
  price: (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n),
  date:  (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
  limit: (n: number) => (n >= 999_999 ? 'Unlimited' : n.toLocaleString()),
};

export function SubscriptionsPage() {
  const { addToast } = useToastStore();
  const [plans, setPlans]                           = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub]                 = useState<SchoolSubscription | null>(null);
  const [loading, setLoading]                       = useState(true);
  const [subscribing, setSubscribing]               = useState<string | null>(null);
  const [showCancel, setShowCancel]                 = useState(false);
  const [cancelling, setCancelling]                 = useState(false);
  const [switchTarget, setSwitchTarget]             = useState<SubscriptionPlan | null>(null);
  const [proration, setProration]                   = useState<{ credit: number; amountDue: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pr, sr] = await Promise.all([
        subscriptionService.getAllPlans(),
        subscriptionService.getMyPlan().catch(() => null),
      ]);
      setPlans(pr.data || []);
      setCurrentSub(sr?.data || null);
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load plans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const calcProration = (plan: SubscriptionPlan): { credit: number; amountDue: number } | null => {
    if (!currentSub || currentSub.planId === plan.id) return null;
    const now  = Date.now();
    const start = new Date(currentSub.startDate).getTime();
    const end   = new Date(currentSub.endDate).getTime();
    const remaining = Math.max(0, (end - now) / (end - start));
    const credit    = Math.round(currentSub.plan.priceNGN * remaining);
    return { credit, amountDue: Math.max(0, plan.priceNGN - credit) };
  };

  const handlePlanClick = (plan: SubscriptionPlan) => {
    if (currentSub && currentSub.planId !== plan.id) {
      const p = calcProration(plan);
      setProration(p);
    }
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
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to update subscription'); }
    finally { setSubscribing(null); }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await subscriptionService.cancel();
      addToast('success', 'Subscription cancelled. Access continues until renewal date.');
      setShowCancel(false); await fetchData();
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to cancel'); }
    finally { setCancelling(false); }
  };

  const isActive = currentSub?.status === 'ACTIVE' || currentSub?.status === 'TRIAL';

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-skeleton-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0,1,2].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-8">
      <PageHeader title="Subscription & Billing" description="Manage your plan and billing information" />

      {/* ── Current subscription status ─────────────────────────────── */}
      {currentSub ? (
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Plan</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-card-title text-gray-900">{currentSub.plan.name}</span>
                <Badge variant={STATUS_BADGE[currentSub.status] ?? 'gray'}>
                  {currentSub.status === 'TRIAL' ? 'Free Trial' : currentSub.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                {currentSub.status === 'TRIAL' && currentSub.trialEndsAt
                  ? `Trial ends ${fmt.date(currentSub.trialEndsAt)}`
                  : `Renews ${fmt.date(currentSub.endDate)}`}
              </p>
            </div>
            {isActive && (
              <Button variant="danger" size="sm" onClick={() => setShowCancel(true)}>
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Free trial banner */
        <div className="bg-warning-50 border border-warning-200 rounded-card p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-warning-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-warning-900">You're on the Free Trial</p>
            <p className="text-sm text-warning-700 mt-0.5">
              Trial limits: <strong>10 students · 2 teachers · 2 classes · 5 subjects</strong>. Choose a plan below to unlock full access.
            </p>
          </div>
        </div>
      )}

      {/* ── Plan cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const key      = planKey(plan.name);
          const meta     = PLAN_META[key];
          const isCurrent = currentSub?.planId === plan.id && isActive;
          const pror     = calcProration(plan);

          return (
            <div
              key={plan.id}
              className={[
                'relative bg-surface rounded-card flex flex-col border-2 transition-shadow duration-150',
                isCurrent ? meta.borderActive : meta.border,
                'shadow-sm hover:shadow-md',
              ].join(' ')}
            >
              {isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                    {meta.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <span className="text-3xl font-bold text-gray-900">{fmt.price(plan.priceNGN)}</span>
                  <span className="text-sm text-gray-500"> / {plan.duration} days</span>
                </div>

                {/* Limits */}
                <div className="mb-5 space-y-2 text-sm border-y border-border py-4">
                  {[
                    ['Students', fmt.limit(plan.maxStudents)],
                    ['Staff Users', fmt.limit(plan.maxUsers)],
                    ['Branches', fmt.limit(plan.maxBranches)],
                    ['Storage', `${plan.storageGB >= 9999 ? 'Unlimited' : `${plan.storageGB} GB`}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-gray-600">
                      <span>{label}</span>
                      <span className="font-semibold text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2 mb-6">
                  {meta.features.slice(0, 7).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={14} className="mt-0.5 text-success-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {meta.features.length > 7 && (
                    <li className="text-xs text-gray-400 pl-5">+{meta.features.length - 7} more features</li>
                  )}
                </ul>

                {/* Proration hint */}
                {pror && pror.credit > 0 && (
                  <p className="text-xs text-success-600 mb-3 font-medium">
                    ~{fmt.price(pror.credit)} credit from current plan applied
                  </p>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  disabled={isCurrent || subscribing === plan.id}
                  loading={subscribing === plan.id}
                  onClick={() => handlePlanClick(plan)}
                  className={isCurrent ? '' : meta.btnClass}
                >
                  {isCurrent ? 'Current Plan' : 'Subscribe'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Switch plan confirm */}
      <ConfirmDialog
        isOpen={!!switchTarget}
        onClose={() => { setSwitchTarget(null); setProration(null); }}
        onConfirm={confirmSubscribe}
        variant="primary"
        title={`Switch to ${switchTarget?.name}?`}
        message={
          proration && proration.credit > 0
            ? `A prorated credit of ${fmt.price(proration.credit)} from your current plan will be applied. Amount due: ${fmt.price(proration.amountDue)}.`
            : `You'll be subscribed to the ${switchTarget?.name} plan for ${fmt.price(switchTarget?.priceNGN ?? 0)}.`
        }
        confirmLabel="Confirm"
        loading={subscribing === (switchTarget?.id ?? '')}
      />

      {/* Cancel confirm */}
      <ConfirmDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={confirmCancel}
        title="Cancel subscription?"
        message="Your subscription will be cancelled but you'll retain access until your current billing period ends."
        confirmLabel="Cancel Subscription"
        loading={cancelling}
      />
    </div>
  );
}
