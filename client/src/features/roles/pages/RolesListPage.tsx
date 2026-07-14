import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { roleService } from '../../../services/roleService';
import { Role } from '../../../types/role';
import { useToastStore } from '../../../store/toastStore';

export function RolesListPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToastStore();

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await roleService.getAll();
      setRoles(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await roleService.remove(deleteId);
      addToast('success', 'Role deleted successfully');
      setDeleteId(null);
      fetchRoles();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage roles and permissions.</p>
        </div>
        <Link to="/roles/new" className="btn-primary">
          Create Role
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Description</th>
                <th className="table-header">Permissions</th>
                <th className="table-header">Users</th>
                <th className="table-header">Type</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-gray-500 py-8">Loading roles...</td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-gray-400 py-8">No roles found.</td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id}>
                    <td className="table-cell font-medium">{role.name}</td>
                    <td className="table-cell">{role.description || '—'}</td>
                    <td className="table-cell">{role.permissions.length}</td>
                    <td className="table-cell">{role._count?.users ?? 0}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.isGlobal ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {role.isGlobal ? 'Global' : 'School'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/roles/${role.id}/edit`}
                          className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-800 hover:bg-primary-200"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteId(role.id)}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Role</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this role? This action cannot be undone.
            </p>
            {deleting && <p className="text-sm text-gray-500 mb-4">Deleting...</p>}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}