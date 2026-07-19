import React, { useState, useEffect, useCallback } from 'react';
import { School, Search, AlertCircle, X, Users, GraduationCap, BookOpen, Mail, Phone, MapPin, CreditCard, CheckCircle2 } from 'lucide-react';
import { superAdminApi } from '../services/superAdminApi';
import type { School as SchoolType, SchoolDetails } from '../types';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable, SkeletonCard } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useToastStore } from '../../../store/toastStore';

type Action = 'suspend' | 'reactivate' | 'delete' | null;
interface Pending { school: SchoolType; action: Exclude<Action, null> }

function subStatusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success', TRIAL: 'warning',
    EXPIRED: 'danger', CANCELLED: 'gray', PENDING: 'info',
  };
  return map[status] ?? 'gray';
}

const fmt = {
  date: (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  currency: (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n),
};

// ── School Detail Drawer ─────────────────────────────────────────────────────
function SchoolDetailDrawer({ school, onClose }: { school: SchoolType; onClose: () => void }) {
  const [detail, setDetail]   = useState<SchoolDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminApi.getSchoolById(school.id)
      .then(r => setDetail(r.data.data ?? r.data as any))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [school.id]);

  const activeSub = detail?.subscriptions?.[0] ?? null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/40 z-40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-surface shadow-lg z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
              {school.logo
                ? <img src={school.logo} alt="" className="w-full h-full object-contain rounded-xl" />
                : <School size={20} className="text-primary-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{school.name}</h2>
              <p className="text-xs text-gray-400">{school.slug}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
          ) : (
            <>
              {/* Status */}
              <div className="flex items-center gap-3">
                <Badge variant={school.isActive ? 'success' : 'danger'} className="text-sm px-3 py-1">
                  {school.isActive ? 'Active' : 'Suspended'}
                </Badge>
                <span className="text-xs text-gray-400">Registered {fmt.date(school.createdAt)}</span>
              </div>

              {/* Contact info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Information</p>
                {school.email && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <span>{school.email}</span>
                  </div>
                )}
                {school.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    <span>{school.phone}</span>
                  </div>
                )}
                {school.address && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-700">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <span>{school.address}</span>
                  </div>
                )}
                {!school.email && !school.phone && !school.address && (
                  <p className="text-sm text-gray-400">No contact info on file.</p>
                )}
              </div>

              {/* Usage stats */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Usage</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Users,         label: 'Users',    value: school._count?.users    ?? 0 },
                    { icon: GraduationCap, label: 'Students', value: school._count?.students ?? 0 },
                    { icon: BookOpen,      label: 'Teachers', value: school._count?.teachers ?? 0 },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <Icon size={18} className="text-gray-400 mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current subscription */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Subscription</p>
                {activeSub ? (
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-primary-600" />
                        <span className="text-sm font-bold text-gray-900">{activeSub.plan.name}</span>
                      </div>
                      <Badge variant={subStatusBadge(activeSub.status)}>{activeSub.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Price</p>
                        <p className="font-medium text-gray-800">{fmt.currency(activeSub.plan.priceNGN)} / {activeSub.plan.duration}d</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Auto-renew</p>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 size={13} className={activeSub.autoRenew ? 'text-success-500' : 'text-gray-300'} />
                          <span className="font-medium text-gray-800">{activeSub.autoRenew ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Start date</p>
                        <p className="font-medium text-gray-800">{fmt.date(activeSub.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">
                          {activeSub.status === 'TRIAL' ? 'Trial ends' : 'Renews'}
                        </p>
                        <p className="font-medium text-gray-800">
                          {activeSub.status === 'TRIAL' && activeSub.trialEndsAt
                            ? fmt.date(activeSub.trialEndsAt)
                            : fmt.date(activeSub.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <span>Max {activeSub.plan.maxStudents >= 999999 ? '∞' : activeSub.plan.maxStudents.toLocaleString()} students</span>
                      <span>Max {activeSub.plan.maxUsers >= 999999 ? '∞' : activeSub.plan.maxUsers} users</span>
                      <span>Max {activeSub.plan.maxBranches >= 999999 ? '∞' : activeSub.plan.maxBranches} branch{activeSub.plan.maxBranches !== 1 ? 'es' : ''}</span>
                      <span>{activeSub.plan.storageGB >= 9999 ? 'Unlimited' : `${activeSub.plan.storageGB} GB`} storage</span>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-xl p-4 text-center">
                    <CreditCard size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No active subscription</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="ghost" fullWidth onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const SchoolsPage: React.FC = () => {
  const { addToast } = useToastStore();
  const [schools, setSchools]       = useState<SchoolType[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [pending, setPending]       = useState<Pending | null>(null);
  const [acting, setActing]         = useState(false);
  const [detailSchool, setDetail]   = useState<SchoolType | null>(null);
  const limit = 20;

  const fetchSchools = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await superAdminApi.getAllSchools({ page, limit, search });
      setSchools(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load schools');
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const confirmAction = async () => {
    if (!pending) return;
    setActing(true);
    try {
      if (pending.action === 'suspend')    await superAdminApi.suspendSchool(pending.school.id);
      if (pending.action === 'reactivate') await superAdminApi.reactivateSchool(pending.school.id);
      if (pending.action === 'delete')     await superAdminApi.deleteSchool(pending.school.id);
      addToast('success', `School ${pending.action === 'delete' ? 'deleted' : pending.action === 'suspend' ? 'suspended' : 'reactivated'}`);
      setPending(null);
      if (detailSchool?.id === pending.school.id) setDetail(null);
      fetchSchools();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || `Failed to ${pending.action} school`);
    } finally { setActing(false); }
  };

  const confirmMessages: Record<Exclude<Action, null>, (name: string) => string> = {
    suspend:    n => `"${n}" will be suspended. Staff will lose access immediately.`,
    reactivate: n => `"${n}" will be reactivated and staff can log in again.`,
    delete:     n => `"${n}" will be permanently deleted along with all its data. This cannot be undone.`,
  };

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <PageHeader title="Schools Management" description="View and manage all registered schools on the platform" />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name, email, or slug…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400" />
          </div>
          {!loading && total > 0 && <span className="text-sm text-gray-500 ml-auto">{total} school{total !== 1 ? 's' : ''}</span>}
        </div>

        {loading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={7} /></div>
        ) : schools.length === 0 ? (
          <EmptyState icon={<School size={40} />} title="No schools found"
            description={search ? `No schools match "${search}"` : 'No schools have registered yet.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['School', 'Status', 'Users', 'Students', 'Teachers', 'Registered', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schools.map(school => (
                  <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <button className="flex items-center gap-3 text-left group" onClick={() => setDetail(school)}>
                        <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                          {school.logo
                            ? <img src={school.logo} alt="" className="w-full h-full object-contain rounded-xl" />
                            : <School size={17} className="text-primary-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{school.name}</p>
                          <p className="text-xs text-gray-400">{school.slug}{school.email ? ` · ${school.email}` : ''}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={school.isActive ? 'success' : 'danger'}>{school.isActive ? 'Active' : 'Suspended'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 tabular-nums">{school._count?.users ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 tabular-nums">{school._count?.students ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 tabular-nums">{school._count?.teachers ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{fmt.date(school.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setDetail(school)} className="text-sm font-medium text-primary-600 hover:text-primary-700">View</button>
                        {school.isActive
                          ? <button onClick={() => setPending({ school, action: 'suspend' })} className="text-sm font-medium text-warning-600 hover:text-warning-700">Suspend</button>
                          : <button onClick={() => setPending({ school, action: 'reactivate' })} className="text-sm font-medium text-success-600 hover:text-success-700">Reactivate</button>}
                        <button onClick={() => setPending({ school, action: 'delete' })} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
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

      {/* Detail drawer */}
      {detailSchool && (
        <SchoolDetailDrawer school={detailSchool} onClose={() => setDetail(null)} />
      )}

      <ConfirmDialog
        isOpen={!!pending} onClose={() => setPending(null)} onConfirm={confirmAction}
        variant={pending?.action === 'delete' ? 'danger' : 'primary'}
        title={pending ? `${pending.action.charAt(0).toUpperCase() + pending.action.slice(1)} school?` : ''}
        message={pending ? confirmMessages[pending.action](pending.school.name) : ''}
        confirmLabel={pending ? pending.action.charAt(0).toUpperCase() + pending.action.slice(1) : 'Confirm'}
        loading={acting}
      />
    </div>
  );
};

export default SchoolsPage;
