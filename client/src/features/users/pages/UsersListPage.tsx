import { useState, useEffect, useCallback } from 'react';
import { Users, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { userService } from '../../../services/userService';
import { roleService } from '../../../services/roleService';
import { User } from '../../../types/user';
import { Role } from '../../../types/role';
import { useToastStore } from '../../../store/toastStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';

export function UsersListPage() {
  const { addToast } = useToastStore();
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting]     = useState(false);

  // Role modal
  const [manageUser, setManageUser]             = useState<User | null>(null);
  const [roles, setRoles]                       = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds]   = useState<string[]>([]);
  const [savingRoles, setSavingRoles]           = useState(false);
  const [rolesLoading, setRolesLoading]         = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await userService.getAll(page, 20);
      setUsers(res.data || []);
      if (res.meta) { setTotalPages(res.meta.totalPages); setTotal(res.meta.total ?? (res.data || []).length); }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load users'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (user: User) => {
    try {
      await userService.update(user.id, { isActive: !user.isActive });
      addToast('success', `User ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err: any) { addToast('error', err.response?.data?.message || 'Failed to update user'); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userService.remove(deleteTarget.id);
      addToast('success', 'User deleted');
      setDeleteTarget(null); fetchUsers();
    } catch (err: any) { addToast('error', err.response?.data?.message || 'Failed to delete'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const openRolesModal = async (user: User) => {
    setManageUser(user); setRolesLoading(true);
    setSelectedRoleIds(user.roles?.map(r => r.roleId) || []);
    try {
      const [rolesRes, userRolesRes] = await Promise.all([roleService.getAll(), roleService.getUserRoles(user.id)]);
      setRoles(rolesRes.data || []);
      setSelectedRoleIds(userRolesRes.data?.roleIds || []);
    } catch (err: any) { addToast('error', err.response?.data?.message || 'Failed to load roles'); }
    finally { setRolesLoading(false); }
  };

  const saveRoles = async () => {
    if (!manageUser) return;
    setSavingRoles(true);
    try {
      await roleService.updateUserRoles(manageUser.id, selectedRoleIds);
      addToast('success', 'Roles updated');
      setManageUser(null); fetchUsers();
    } catch (err: any) { addToast('error', err.response?.data?.message || 'Failed to update roles'); }
    finally { setSavingRoles(false); }
  };

  const start = (page - 1) * 20 + 1;
  const end   = Math.min(page * 20, total);

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Users" description="Manage staff accounts within your school" />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={7} /></div>
        ) : users.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="No users yet" description="Staff users will appear here once they register." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['User', 'Email', 'Roles', 'Status', 'Verified', 'Last Login', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
                        <span className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{user.email}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0
                          ? user.roles.map(r => <Badge key={r.roleId} variant="primary">{r.role?.name ?? r.roleId}</Badge>)
                          : <span className="text-xs text-gray-400">No roles</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.emailVerified
                        ? <CheckCircle2 size={16} className="text-success-500" />
                        : <XCircle size={16} className="text-gray-300" />}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openRolesModal(user)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Roles</button>
                        <button onClick={() => handleToggleActive(user)} className="text-sm font-medium text-warning-600 hover:text-warning-700">
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => setDeleteTarget(user)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-sm text-gray-500">Showing {start}–{end} of {total}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
              <span className="text-sm text-gray-600 px-1">{page} / {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Manage Roles Modal */}
      <Modal
        isOpen={!!manageUser} onClose={() => setManageUser(null)}
        title={`Manage Roles — ${manageUser?.firstName} ${manageUser?.lastName}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setManageUser(null)} disabled={savingRoles}>Cancel</Button>
            <Button variant="primary" onClick={saveRoles} loading={savingRoles}>Save Roles</Button>
          </>
        }
      >
        {rolesLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading roles…</div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-gray-500">No roles available. Create roles first.</p>
        ) : (
          <div className="space-y-2">
            {roles.map(role => (
              <label key={role.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => setSelectedRoleIds(prev => prev.includes(role.id) ? prev.filter(x => x !== role.id) : [...prev, role.id])}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                  <p className="text-xs text-gray-500">
                    {role.isGlobal ? 'Global' : 'School'} · {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Delete user?" loading={deleting}
        message={`"${deleteTarget?.firstName} ${deleteTarget?.lastName}" will be permanently removed from the system.`}
        confirmLabel="Delete" />
    </div>
  );
}
