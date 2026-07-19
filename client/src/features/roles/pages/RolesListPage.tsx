import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, AlertCircle } from 'lucide-react';
import { roleService } from '../../../services/roleService';
import { Role } from '../../../types/role';
import { useToastStore } from '../../../store/toastStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

export function RolesListPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [roles, setRoles]           = useState<Role[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const fetchRoles = async () => {
    setLoading(true); setError(null);
    try {
      const res = await roleService.getAll();
      setRoles(res.data || []);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load roles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoles(); }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roleService.remove(deleteTarget.id);
      addToast('success', 'Role deleted');
      setDeleteTarget(null); fetchRoles();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete role');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage roles and permissions for staff"
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('/roles/new')}>
            <Plus size={15} /> Create Role
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-5"><SkeletonTable rows={4} cols={6} /></div>
        ) : roles.length === 0 ? (
          <EmptyState
            icon={<Shield size={40} />}
            title="No roles yet"
            description="Create a role to start assigning permissions to staff."
            actionLabel="Create Role"
            onAction={() => navigate('/roles/new')}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                {['Name', 'Description', 'Permissions', 'Users', 'Type', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map(role => (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{role.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 max-w-xs truncate">{role.description || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-xs font-bold">
                      {role.permissions.length}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 tabular-nums">{role._count?.users ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={role.isGlobal ? 'warning' : 'primary'}>{role.isGlobal ? 'Global' : 'School'}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => navigate(`/roles/${role.id}/edit`)} className="text-sm font-medium text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => setDeleteTarget(role)} className="text-sm font-medium text-danger-600 hover:text-danger-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Delete role?" loading={deleting}
        message={`"${deleteTarget?.name}" will be permanently deleted. Users with this role will lose its permissions.`}
        confirmLabel="Delete" />
    </div>
  );
}
