import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roleService } from '../../../services/roleService';
import { Permission } from '../../../types/role';
import { useToastStore } from '../../../store/toastStore';

export function RoleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
    if (isEdit) loadRole();
  }, [id]);

  const loadPermissions = async () => {
    try {
      const res = await roleService.getAllPermissions();
      setPermissions(res.data || []);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load permissions');
    }
  };

  const loadRole = async () => {
    if (!id) return;
    setFetching(true);
    try {
      const res = await roleService.getById(id);
      const role = res.data;
      setName(role.name);
      setDescription(role.description || '');
      setSelectedIds(role.permissions.map((p: Permission) => p.id));
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load role');
    } finally {
      setFetching(false);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedIds((prev) =>
      prev.includes(permId) ? prev.filter((x) => x !== permId) : [...prev, permId]
    );
  };

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const prefix = perm.name.split('.')[0];
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(perm);
    return acc;
  }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dto = isEdit ? { name, description, permissionIds: selectedIds } : { name, description, permissionIds: selectedIds };
      if (isEdit && id) {
        await roleService.update(id, dto);
        addToast('success', 'Role updated successfully');
      } else {
        await roleService.create(dto);
        addToast('success', 'Role created successfully');
      }
      navigate('/roles');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading role...</p></div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Role' : 'Create Role'}</h1>
        <p className="mt-1 text-sm text-gray-500">{isEdit ? 'Update role details and permissions.' : 'Create a new role and assign permissions.'}</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g. Class Teacher"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
          <div className="space-y-4">
            {Object.entries(grouped).map(([prefix, perms]) => (
              <div key={prefix} className="border border-gray-200 rounded-md p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 capitalize">{prefix}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map((perm) => (
                    <label key={perm.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button type="button" onClick={() => navigate('/roles')} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (isEdit ? 'Update Role' : 'Create Role')}
          </button>
        </div>
      </form>
    </div>
  );
}