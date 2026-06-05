import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { subjectService } from '../../../services/subjectService';
import { Subject } from '../../../types/subject';

export function SubjectsListPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await subjectService.getAll(page, 20, search || undefined);
      setSubjects(response.data);
      if (response.meta) setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      await subjectService.remove(id);
      fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all subjects offered in your school</p>
        </div>
        <Link to="/subjects/new" className="btn-primary">+ Add Subject</Link>
      </div>
      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <input type="text" placeholder="Search by name or code..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input max-w-md" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Code</th>
                <th className="table-header">Name</th>
                <th className="table-header">Description</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading subjects...</td></tr>
              ) : subjects.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No subjects found.</td></tr>
              ) : subjects.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-900">{s.code}</td>
                  <td className="table-cell">{s.name}</td>
                  <td className="table-cell">{s.description || '—'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell text-right space-x-2">
                    <Link to={`/subjects/${s.id}/edit`} className="text-sm text-primary-600 hover:text-primary-800">Edit</Link>
                    <button onClick={() => handleDelete(s.id, s.name)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}