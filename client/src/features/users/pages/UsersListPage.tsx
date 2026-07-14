import { useState, useEffect } from 'react';
import { userService } from '../../../services/userService';
import { roleService } from '../../../services/roleService';
import { User } from '../../../types/user';
import { Role } from '../../../types/role';
import { useToastStore } from '../../../store/toastStore';

export function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [manageUser, setManageUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const limit = 20;
  const { addToast } = useToastStore();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getAll(page, limit);
      setUsers(res.data || []);
      if (res.meta) setTotalPages(res.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const handleToggleActive = async (user: User) => {
    try {
      await userService.update(user.id, { isActive: !user.isActive });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.remove(id);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openManageRoles = async (user: User) => {
    setManageUser(user);
    setSelectedRoleIds(user.roles?.map((r) => r.roleId) || []);
    setError(null);
    try {
      const [rolesRes, userRolesRes] = await Promise.all([
        roleService.getAll(),
        roleService.getUserRoles(user.id),
      ]);
      setRoles(rolesRes.data || []);
      setSelectedRoleIds(userRolesRes.data?.roleIds || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load roles');
    }
  };

  const saveUserRoles = async () => {
    if (!manageUser) return;
    setSavingRoles(true);
    setError(null);
    try {
      await roleService.updateUserRoles(manageUser.id, selectedRoleIds);
      addToast('success', 'Roles updated successfully');
      setManageUser(null);
      fetchUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to update roles');
    } finally {
      setSavingRoles(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading users...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage staff accounts within your school.</p>
        </div>
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
                <th className="table-header">Email</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Status</th>
                <th className="table-header">Verified</th>
                <th className="table-header">Last Login</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center text-gray-400 py-8">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="table-cell font-medium">{user.firstName} {user.lastName}</td>
                    <td className="table-cell">{user.email}</td>
                    <td className="table-cell">{user.phone || '—'}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {user.emailVerified ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openManageRoles(user)}
                          className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-800 hover:bg-primary-200"
                        >
                          Manage Roles
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`text-xs px-2 py-1 rounded ${
                            user.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
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

      {/* Manage Roles Modal */}
      {manageUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Manage Roles</h3>
              <button onClick={() => setManageUser(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{manageUser.firstName} {manageUser.lastName}</p>
            {error && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200 mb-3">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            <div className="overflow-y-auto flex-1 space-y-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => setSelectedRoleIds((prev) => prev.includes(role.id) ? prev.filter((x) => x !== role.id) : [...prev, role.id])}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-500">{role.isGlobal ? 'Global' : 'School'} • {role.permissions.length} permissions</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setManageUser(null)} disabled={savingRoles} className="btn-secondary">Cancel</button>
              <button onClick={saveUserRoles} disabled={savingRoles} className="btn-primary">{savingRoles ? 'Saving...' : 'Save Roles'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}