import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check } from 'lucide-react';
import { superAdminApi } from '../services/superAdminApi';
import type { Plan } from '../types';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';
import { useToastStore } from '../../../store/toastStore';

const DEFAULT_FEATURES = '{\n  "customBranding": false,\n  "apiAccess": false,\n  "prioritySupport": false,\n  "analytics": true\n}';

interface FormState {
  name: string; description: string;
  priceNGN: number; duration: number;
  maxStudents: number; maxUsers: number; maxBranches: number; storageGB: number;
  features: string; isActive: boolean;
}

const emptyForm = (): FormState => ({
  name: '', description: '', priceNGN: 0, duration: 30,
  maxStudents: 500, maxUsers: 50, maxBranches: 1, storageGB: 5,
  features: DEFAULT_FEATURES, isActive: true,
});

const SubscriptionsPage: React.FC = () => {
  const { addToast } = useToastStore();
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [jsonError, setJsonError]   = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getAllPlans();
      setPlans(res.data.data);
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load plans'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => { setEditingPlan(null); setForm(emptyForm()); setJsonError(''); setShowForm(true); };
  const openEdit   = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({ name: plan.name, description: plan.description || '', priceNGN: plan.priceNGN, duration: plan.duration,
      maxStudents: plan.maxStudents, maxUsers: plan.maxUsers, maxBranches: plan.maxBranches, storageGB: plan.storageGB,
      features: JSON.stringify(plan.features, null, 2), isActive: plan.isActive });
    setJsonError(''); setShowForm(true);
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate JSON
    try { JSON.parse(form.features); setJsonError(''); }
    catch { setJsonError('Features must be valid JSON'); return; }
    setSaving(true);
    try {
      const payload = { ...form, features: JSON.parse(form.features) };
      if (editingPlan) {
        await superAdminApi.updatePlan(editingPlan.id, payload);
        addToast('success', 'Plan updated');
      } else {
        await superAdminApi.createPlan(payload as any);
        addToast('success', 'Plan created');
      }
      setShowForm(false); fetchPlans();
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to save plan'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superAdminApi.deletePlan(deleteTarget.id);
      addToast('success', 'Plan deleted');
      setDeleteTarget(null); fetchPlans();
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to delete'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await superAdminApi.seedDefaultPlans();
      addToast('success', res.data.message || 'Default plans created');
      fetchPlans();
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to seed plans'); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n);
  const lim = (n: number) => (n >= 999_999 ? 'Unlimited' : n.toLocaleString());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Manage platform subscription plans and pricing"
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={15} /> New Plan
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0,1,2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-surface rounded-card border border-border">
          <EmptyState
            title="No plans yet"
            description="Create plans manually or initialize the default Basic, Standard, and Premium plans."
            actionLabel="Initialize Default Plans"
            onAction={handleSeedDefaults}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-surface rounded-card shadow-sm border-2 flex flex-col ${plan.isActive ? 'border-border' : 'border-border opacity-60'}`}>
              <div className="p-6 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-card-title text-gray-900">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                  </div>
                  <Badge variant={plan.isActive ? 'success' : 'gray'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>

                {/* Price */}
                <p className="text-3xl font-bold text-gray-900 mb-4">
                  {fmt(plan.priceNGN)}<span className="text-sm font-normal text-gray-500"> / {plan.duration}d</span>
                </p>

                {/* Limits */}
                <div className="space-y-1.5 text-sm border-y border-border py-4 mb-4">
                  {[
                    ['Students', lim(plan.maxStudents)],
                    ['Users', lim(plan.maxUsers)],
                    ['Branches', lim(plan.maxBranches)],
                    ['Storage', plan.storageGB >= 9999 ? 'Unlimited' : `${plan.storageGB} GB`],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between text-gray-600">
                      <span>{l}</span><span className="font-semibold text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Feature flags */}
                <div className="space-y-1">
                  {Object.entries(plan.features).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check size={12} className={v ? 'text-success-500' : 'text-gray-300'} />
                      <span className={v ? '' : 'line-through text-gray-400'}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-3 border-t border-border flex justify-end gap-3">
                <button onClick={() => openEdit(plan)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                <button onClick={() => setDeleteTarget(plan)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingPlan ? `Edit Plan — ${editingPlan.name}` : 'Create New Plan'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={e => handleSubmit(e as any)} loading={saving}>
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="name" label="Plan Name *" value={form.name} onChange={set('name')} placeholder="e.g. Premium" required />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Optional description"
              className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="priceNGN" type="number" label="Price (NGN) *" value={String(form.priceNGN)} onChange={set('priceNGN')} required />
            <Input id="duration" type="number" label="Duration (days) *" value={String(form.duration)} onChange={set('duration')} required />
            <Input id="maxStudents" type="number" label="Max Students *" value={String(form.maxStudents)} onChange={set('maxStudents')} required />
            <Input id="maxUsers"    type="number" label="Max Users *"    value={String(form.maxUsers)}    onChange={set('maxUsers')}    required />
            <Input id="maxBranches" type="number" label="Max Branches"   value={String(form.maxBranches)} onChange={set('maxBranches')} />
            <Input id="storageGB"   type="number" label="Storage (GB)"   value={String(form.storageGB)}   onChange={set('storageGB')}   />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Features (JSON)</label>
            <textarea value={form.features} onChange={set('features')} rows={5}
              className="w-full rounded-input border border-border px-4 py-3 text-sm font-mono text-gray-900 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            {jsonError && <p className="mt-1 text-xs text-danger-600">{jsonError}</p>}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Active (visible to schools)</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Delete plan?" loading={deleting}
        message={`"${deleteTarget?.name}" will be permanently deleted. Schools currently on this plan will be affected.`}
        confirmLabel="Delete" />
    </div>
  );
};

export default SubscriptionsPage;
