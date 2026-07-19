import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { roleService } from '../../../services/roleService';
import { Permission } from '../../../types/role';
import { useToastStore } from '../../../store/toastStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { FormSection, FormActions } from '../../../components/ui/FormSection';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

export function RoleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const [name, setName]             = useState('');
  const [description, setDesc]      = useState('');
  const [permissions, setPerms]     = useState<Permission[]>([]);
  const [selectedIds, setSelected]  = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(isEdit);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
    if (isEdit) loadRole();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPermissions = async () => {
    try { setPerms((await roleService.getAllPermissions()).data || []); }
    catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load permissions'); }
  };

  const loadRole = async () => {
    if (!id) return;
    setFetching(true);
    try {
      const role = (await roleService.getById(id)).data;
      setName(role.name);
      setDesc(role.description || '');
      setSelected(role.permissions.map((p: Permission) => p.id));
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load role'); }
    finally { setFetching(false); }
  };

  const togglePerm = (permId: string) =>
    setSelected(prev => prev.includes(permId) ? prev.filter(x => x !== permId) : [...prev, permId]);

  // Group permissions by prefix (e.g. "student.read" → "student")
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const prefix = perm.name.split('.')[0];
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(perm);
    return acc;
  }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Role name is required'); return; }
    setLoading(true); setError(null);
    try {
      const dto = { name, description, permissionIds: selectedIds };
      if (isEdit && id) {
        await roleService.update(id, dto);
        addToast('success', 'Role updated');
      } else {
        await roleService.create(dto);
        addToast('success', 'Role created');
      }
      navigate('/roles');
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to save role'); }
    finally { setLoading(false); }
  };

  if (fetching) return <div className="max-w-3xl mx-auto space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Role' : 'Create Role'}
        description={isEdit ? 'Update role details and permissions' : 'Create a new role and assign permissions'}
        breadcrumbs={[{ label: 'Roles', onClick: () => navigate('/roles') }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection title="Role Details">
          <div className="space-y-4">
            <Input
              id="name" label="Role Name *" value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. Class Teacher"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                rows={2} value={description} onChange={e => setDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900
                  placeholder-gray-400 bg-surface focus:outline-none focus:ring-2
                  focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Permissions" description="Select the permissions to grant users with this role">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-gray-400">No permissions available.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([prefix, perms]) => {
                const allSelected = perms.every(p => selectedIds.includes(p.id));
                return (
                  <div key={prefix} className="border border-border rounded-xl overflow-hidden">
                    {/* Group header with select-all */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-border">
                      <span className="text-sm font-semibold text-gray-800 capitalize">{prefix}</span>
                      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => {
                            if (allSelected) {
                              setSelected(prev => prev.filter(x => !perms.map(p => p.id).includes(x)));
                            } else {
                              setSelected(prev => Array.from(new Set([...prev, ...perms.map(p => p.id)])));
                            }
                          }}
                          className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        />
                        Select all
                      </label>
                    </div>
                    {/* Permissions grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y divide-border sm:divide-y-0">
                      {perms.map(perm => (
                        <label key={perm.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(perm.id)}
                            onChange={() => togglePerm(perm.id)}
                            className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                          />
                          <div>
                            <p className="text-sm text-gray-700 font-medium">{perm.name}</p>
                            {perm.description && <p className="text-xs text-gray-400">{perm.description}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-gray-400">
            {selectedIds.length} permission{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
        </FormSection>

        <FormActions onCancel={() => navigate('/roles')} submitLabel={isEdit ? 'Update Role' : 'Create Role'} loading={loading} />
      </form>
    </div>
  );
}
