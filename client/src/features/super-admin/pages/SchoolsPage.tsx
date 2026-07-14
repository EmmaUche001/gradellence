import React, { useState, useEffect, useCallback } from 'react';
import { superAdminApi } from '../services/superAdminApi';
import type { School } from '../types';

const SchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getAllSchools({ page, limit, search });
      setSchools(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleSuspend = async (id: string) => {
    if (!window.confirm('Are you sure you want to suspend this school?')) return;
    try {
      await superAdminApi.suspendSchool(id);
      fetchSchools();
    } catch (err) {
      console.error('Failed to suspend school:', err);
    }
  };

  const handleReactivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to reactivate this school?')) return;
    try {
      await superAdminApi.reactivateSchool(id);
      fetchSchools();
    } catch (err) {
      console.error('Failed to reactivate school:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this school? This action cannot be undone.')) return;
    try {
      await superAdminApi.deleteSchool(id);
      fetchSchools();
    } catch (err) {
      console.error('Failed to delete school:', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all registered schools on the platform.</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: <span className="font-semibold">{total}</span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search schools by name, email, or slug..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Teachers</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading schools...
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No schools found.
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-lg">🏫</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{school.name}</p>
                          <p className="text-sm text-gray-500">{school.slug} • {school.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        school.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {school.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{school._count?.users ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{school._count?.students ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{school._count?.teachers ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {school.isActive ? (
                          <button
                            onClick={() => handleSuspend(school.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(school.id)}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(school.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
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

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} schools
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolsPage;