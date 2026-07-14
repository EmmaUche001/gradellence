import { useState, useEffect } from 'react';
import { subscriptionService } from '../../../services/subscriptionService';
import { SubscriptionPlan, SchoolSubscription } from '../../../types/subscription';

const planIcons: Record<string, string> = {
  BASIC: '📘',
  STANDARD: '📗',
  PREMIUM: '📕',
};

const planColors: Record<string, string> = {
  BASIC: 'bg-blue-50 border-blue-200',
  STANDARD: 'bg-green-50 border-green-200',
  PREMIUM: 'bg-purple-50 border-purple-200',
};

const planBadgeColors: Record<string, string> = {
  BASIC: 'bg-blue-100 text-blue-800',
  STANDARD: 'bg-green-100 text-green-800',
  PREMIUM: 'bg-purple-100 text-purple-800',
};

const planButtonColors: Record<string, string> = {
  BASIC: 'bg-blue-600 hover:bg-blue-700',
  STANDARD: 'bg-green-600 hover:bg-green-700',
  PREMIUM: 'bg-purple-600 hover:bg-purple-700',
};

const maxLimits: Record<string, { students: number; users: number; branches: number }> = {
  BASIC: { students: 500, users: 50, branches: 1 },
  STANDARD: { students: 2000, users: 200, branches: 3 },
  PREMIUM: { students: 999999, users: 999999, branches: 999999 },
};

const featureList: Record<string, string[]> = {
  BASIC: [
    'Student Management',
    'Teacher Management',
    'Class & Subject Management',
    'Academic Sessions & Terms',
    'Assessment Entry',
    'Automatic Result Computation',
    'Grade Calculation',
    'Result Publishing',
    'Printable Report Cards',
    'Basic Analytics Dashboard',
    'School Admin & Teachers',
    'Student Results & Class Sheets',
    '5GB Storage',
  ],
  STANDARD: [
    'Everything in Basic, plus:',
    'Parent Portal',
    'Email Notifications',
    'Bulk Student Import',
    'Bulk Score Upload (CSV/Excel)',
    'Result Broadsheet',
    'Multi-Branch (up to 3)',
    'AI Result Insights',
    'AI Student Performance Summary',
    'AI Teacher Performance Analysis',
    'AI Generated Remarks',
    '50GB Storage',
  ],
  PREMIUM: [
    'Everything in Standard, plus:',
    'AI Academic Advisor',
    'AI Risk Prediction',
    'AI Performance Forecasting',
    'AI Promotion Recommendations',
    'AI School Performance Reports',
    'AI Chat Assistant',
    'Executive Analytics Dashboard',
    'Unlimited Branches',
    'Unlimited Students & Users',
    'Advanced RBAC (Custom Roles)',
    'Full Audit Trail',
    'API Access',
    'Unlimited Storage',
  ],
};

export function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SchoolSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prorationDetails, setProrationDetails] = useState<{ credit: number; amountDue: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setProrationDetails(null);

    try {
      const [plansRes, subRes] = await Promise.all([
        subscriptionService.getAllPlans(),
        subscriptionService.getMyPlan().catch(() => null),
      ]);

      setPlans(plansRes.data || []);
      setCurrentSubscription(subRes?.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateProration = async (planId: string): Promise<{ credit: number; amountDue: number } | null> => {
    if (!currentSubscription || currentSubscription.planId === planId) return null;

    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;

    const now = new Date();
    const startDate = new Date(currentSubscription.startDate);
    const endDate = new Date(currentSubscription.endDate);
    const totalMs = endDate.getTime() - startDate.getTime();
    const remainingMs = endDate.getTime() - now.getTime();
    const remainingFraction = Math.max(0, remainingMs / totalMs);
    const credit = Math.round(currentSubscription.plan.priceNGN * remainingFraction);
    const amountDue = Math.max(0, plan.priceNGN - credit);

    return { credit, amountDue };
  };

  const handlePlanClick = async (planId: string) => {
    if (!currentSubscription || currentSubscription.planId === planId) {
      // No current subscription or same plan - just subscribe
      await handleSubscribe(planId);
      return;
    }

    const proration = await calculateProration(planId);
    if (!proration) return;

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const confirmMessage = `Switch to ${plan.name} plan?\n\n` +
      `Proration credit from current plan: ₦${proration.credit.toLocaleString()}\n` +
      `Amount due now: ₦${proration.amountDue.toLocaleString()}\n\n` +
      `Do you want to proceed?`;

    if (!window.confirm(confirmMessage)) return;

    setProrationDetails(proration);
    await handleSubscribe(planId);
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    setError(null);
    setSuccess(null);

    try {
      await subscriptionService.subscribe(planId);
      const plan = plans.find(p => p.id === planId);
      const message = prorationDetails && prorationDetails.credit > 0
        ? `Switched to ${plan?.name} plan! Prorated credit: ₦${prorationDetails.credit.toLocaleString()}`
        : 'Subscription updated successfully!';
      setSuccess(message);
      setProrationDetails(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subscription');
      setProrationDetails(null);
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    setSubscribing('cancel');
    setError(null);
    setSuccess(null);

    try {
      await subscriptionService.cancel();
      setSuccess('Subscription cancelled. You will have access until your renewal date.');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setSubscribing(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });

  const getPlanKey = (name: string): string => {
    const upper = name.toUpperCase();
    if (upper.includes('BASIC')) return 'BASIC';
    if (upper.includes('STANDARD')) return 'STANDARD';
    if (upper.includes('PREMIUM')) return 'PREMIUM';
    return 'BASIC';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading subscription plans...</p>
      </div>
    );
  }

  const isSubscribed = currentSubscription?.status === 'ACTIVE' || currentSubscription?.status === 'TRIAL';
  const currentPlanKey = currentSubscription ? getPlanKey(currentSubscription.plan.name) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription plan and billing information.
        </p>
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

      {/* Current Subscription Status */}
      {currentSubscription && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
              <div className="mt-2 flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${planBadgeColors[currentPlanKey || 'BASIC'] || 'bg-gray-100 text-gray-800'}`}>
                  {planIcons[currentPlanKey || 'BASIC'] || '📄'} {currentSubscription.plan.name}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  currentSubscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  currentSubscription.status === 'TRIAL' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentSubscription.status === 'TRIAL' ? 'Free Trial' : currentSubscription.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {currentSubscription.status === 'TRIAL' && currentSubscription.trialEndsAt
                  ? `Trial ends on ${formatDate(currentSubscription.trialEndsAt)}`
                  : `Renewal date: ${formatDate(currentSubscription.endDate)}`
                }
              </p>
              {prorationDetails && prorationDetails.credit > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  Prorated credit: ₦{prorationDetails.credit.toLocaleString()} applied
                </p>
              )}
            </div>
            {isSubscribed && (
              <button
                onClick={handleCancel}
                disabled={subscribing === 'cancel'}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                {subscribing === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Free Trial Info (shown when no subscription) */}
      {!isSubscribed && !currentSubscription && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🔓</span>
            <div>
              <h2 className="text-lg font-semibold text-yellow-900">You're on the Free Trial</h2>
              <p className="mt-1 text-sm text-yellow-700">
                Enjoy limited access while you explore Gradellence. Limits: <strong>10 students</strong>, <strong>2 teachers</strong>, <strong>2 classes</strong>, <strong>5 subjects</strong>. Choose a plan below to unlock full features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const key = getPlanKey(plan.name);
          const limits = maxLimits[key] || { students: plan.maxStudents, users: plan.maxUsers, branches: plan.maxBranches };
          const features = featureList[key] || [];
          const isCurrentPlan = currentSubscription?.planId === plan.id && isSubscribed;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-6 flex flex-col ${
                isCurrentPlan ? 'border-primary-500 ring-2 ring-primary-200' : planColors[key] || 'bg-white border-gray-200'
              }`}
            >
              {isCurrentPlan && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Current Plan
                </span>
              )}

              <div className="text-center mb-6">
                <span className="text-4xl">{planIcons[key] || '📄'}</span>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">{formatPrice(plan.priceNGN)}</span>
                  <span className="text-gray-500">/{plan.duration} days</span>
                </div>
              </div>

              {/* Limits */}
              <div className="mb-6 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Students</span>
                  <span className="font-semibold">{limits.students >= 999999 ? 'Unlimited' : limits.students.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Staff Users</span>
                  <span className="font-semibold">{limits.users >= 999999 ? 'Unlimited' : limits.users.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Branches</span>
                  <span className="font-semibold">{limits.branches >= 999999 ? 'Unlimited' : limits.branches}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2 mb-6">
                {features.slice(0, 6).map((feature, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm text-gray-600">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
                {features.length > 6 && (
                  <li className="text-sm text-gray-400 pl-5">+{features.length - 6} more features</li>
                )}
              </ul>

              <button
                onClick={() => handlePlanClick(plan.id)}
                disabled={subscribing === plan.id || isCurrentPlan}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCurrentPlan ? 'bg-gray-400 cursor-default' : planButtonColors[key] || 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {subscribing === plan.id ? 'Processing...' : isCurrentPlan ? 'Current Plan' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Proration Notice */}
      {prorationDetails && prorationDetails.credit > 0 && (
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Proration applied:</strong> ₦{prorationDetails.credit.toLocaleString()} credit from your remaining subscription period has been applied. Amount charged: ₦{prorationDetails.amountDue.toLocaleString()}.
          </p>
        </div>
      )}
    </div>
  );
}