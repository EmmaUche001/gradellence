import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Search } from 'lucide-react';
import { superAdminApi } from '../services/superAdminApi';
import type { Plan } from '../types';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { useToastStore } from '../../../store/toastStore';

function subBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success', TRIAL: 'warning',
    EXPIRED: 'danger', CANCELLED: 'gray', PENDING: 'info',
  };
  return map[status] ?? 'gray';
}

const fmt = {
  date:     (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  currency: (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n),
};

interface SubRecord {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  trialEndsAt?: string;
  cancelledAt?: string;
  school: { id: string; name: string; slug: string; email?: string; logo?: string; isActive: boolean; _count?: { students: number; users: number } };
  plan: { id: string; name: string; priceNGN: number; duration: number; maxStudents: number; maxUsers: number; storageGB: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'PENDING', label: 'Pending' },
];

const ActiveSubscriptionsPage: React.FC = () => {
  const { addToast } = useToastStore();

  const [subs, setSubs]             = useState<SubRecord[]>([]);
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [statusFilter, setStatus]   = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [search, setSearch]         = useState('');

  // Assign plan modal
  const [assignTarget, setAssignTarget] = useState<SubRecord | null>(null);
  const [newPlanId, setNewPlanId]       = useState('');
  const [assigning, setAssigning]       = useState(false);

  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState<SubRecord | null>(null);
  const [cancelling, setCancelling]     = useState(false);

  const limit = 20;

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getAllSchoolSubscriptions({ page, limit, status: statusFilter || undefined, planId: planFilter || undefined });
      let data: SubRecord[] = res.data.data ?? [];
      // client-side name search (no server-side search param on this endpoint)
      if (search.trim()) {
        const q = search.toLowerCase();
        data = data.filter(s =>
          s.school.name.toLowerCase().includes(q) ||
          s.school.slug.toLowerCase().includes(q) ||
          (s.school.email?.toLowerCase().includes(q) ?? false)
        );
      }
      setSubs(data);
      setTotal(res.data.meta?.total ?? data.length);
    } catch {
      addToast('error', 'Failed to load subscriptions');
    } finally { setLoading(false); }
  }, [page, statusFilter, planFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  useEffect(() => {
    superAdminApi.getSubscriptionPlans()
      .then(r => setPlans((r.data as any)?.data ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const handleAssign = async () => {
    if (!assignTarget || !newPlanId) return;
    setAssigning(true);
    try {
      await superAdminApi.assignPlanToSchool(assignTarget.school.id, newPlanId);
      addToast('success', `Plan assigned to ${assignTarget.school.name}`);
      setAssignTarget(null); setNewPlanId(''); fetchSubs();
    } catch (e: any) {
      addToast('error', e.response?.data?.message || 'Failed to assign plan');
    } finally { setAssigning(false); }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await superAdminApi.cancelSchoolSubscription(cancelTarget.school.id);
      addToast('success', `Subscription cancelled for ${cancelTarget.school.name}`);
      setCancelTarget(null); fetchSubs();
    } catch (e: any) {
      addToast('error', e.response?.data?.message || 'Failed to cancel');
      setCancelTarget(null);
    } finally { setCancelling(false); }
  };

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Subscriptions"
        description="Monitor and manage all school subscription plans"
      />

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {/* Filters toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search school name or slug…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400" />
          </div>
          <div className="w-40">
            <Select
              id="status-filter" options={STATUS_OPTIONS} value={statusFilter}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
            />
          </div>
          <div className="w-44">
            <Select
              id="plan-filter"
              options={[{ value: '', label: 'All plans' }, ...plans.map(p => ({ value: p.id, label: p.name }))]}
              value={planFilter}
              onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
            />
          </div>
          {!loading && (
            <span className="text-sm text-gray-500 ml-auto">{total} subscription{total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div className="p-5"><SkeletonTable rows={7} cols={7} /></div>
        ) : subs.length === 0 ? (
          <EmptyState icon={<CreditCard size={40} />} title="No subscriptions found"
            description="No school subscriptions match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['School', 'Plan', 'Status', 'Start', 'Renews / Ends', 'Students', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">{s.school.name}</p>
                      <p className="text-xs text-gray-400">{s.school.slug}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-700">{s.plan.name}</p>
                      <p className="text-xs text-gray-400">{fmt.currency(s.plan.priceNGN)} / {s.plan.duration}d</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={subBadge(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{fmt.date(s.startDate)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                      {s.status === 'TRIAL' && s.trialEndsAt
                        ? fmt.date(s.trialEndsAt)
                        : s.cancelledAt
                          ? `Cancelled ${fmt.date(s.cancelledAt)}`
                          : fmt.date(s.endDate)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 tabular-nums">
                      {s.school._count?.students?.toLocaleString() ?? '—'}
                      <span className="text-gray-400"> / {s.plan.maxStudents >= 999999 ? '∞' : s.plan.maxStudents.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => { setAssignTarget(s); setNewPlanId(s.plan.id); }}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700">Change Plan</button>
                        {['ACTIVE', 'TRIAL'].includes(s.status) && (
                          <button onClick={() => setCancelTarget(s)}
                            className="text-sm font-medium text-danger-600 hover:text-danger-700">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-sm text-gray-500">Showing {start}–{end} of {total}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Assign / Change Plan Modal */}
      <Modal
        isOpen={!!assignTarget} onClose={() => setAssignTarget(null)}
        title={`Change Plan — ${assignTarget?.school.name}`}
        description="Selecting a new plan will cancel the existing subscription and create a new one immediately."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssignTarget(null)} disabled={assigning}>Cancel</Button>
            <Button variant="primary" onClick={handleAssign} loading={assigning} disabled={!newPlanId || newPlanId === assignTarget?.plan.id}>
              Assign Plan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="text-gray-500 mb-1">Current plan</p>
            <p className="font-semibold text-gray-900">{assignTarget?.plan.name} — {assignTarget ? fmt.currency(assignTarget.plan.priceNGN) : ''} / {assignTarget?.plan.duration}d</p>
          </div>
          <Select
            id="new-plan"
            label="New Plan *"
            options={plans.map(p => ({ value: p.id, label: `${p.name} — ${fmt.currency(p.priceNGN)} / ${p.duration}d` }))}
            value={newPlanId}
            onChange={e => setNewPlanId(e.target.value)}
            placeholder="Select a plan"
          />
        </div>
      </Modal>

      {/* Cancel subscription confirm */}
      <ConfirmDialog
        isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel}
        title="Cancel subscription?"
        message={`The subscription for "${cancelTarget?.school.name}" will be cancelled immediately. The school will lose access at the end of the current period.`}
        confirmLabel="Cancel Subscription"
        loading={cancelling}
      />
    </div>
  );
};

export default ActiveSubscriptionsPage;
