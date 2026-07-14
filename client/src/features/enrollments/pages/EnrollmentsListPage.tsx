import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { enrollmentService } from '../../../services/enrollmentService';
import { Enrollment } from '../../../types/enrollment';

export function EnrollmentsListPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEnrollments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await enrollmentService.getAll(page, 20);
      setEnrollments(response.data);
      if (response.meta) setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load enrollments');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Remove enrollment for "${label}"?`)) return;
    try {
      await enrollmentService.remove(id);
      fetchEnrollments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove enrollment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="mt-1 text-sm text-gray-500">Manage student class enrollments</p>
        </div>
        <div className="flex space-x-2">
          <Link to="/enrollments/bulk" className="btn-secondary">Bulk Enroll</Link>
          <Link to="/enrollments/new" className="btn-primary">+ New Enrollment</Link>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Admission No.</th>
                <th className="table-header">Class</th>
                <th className="table-header">Term</th>
                <th className="table-header">Enrolled On</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading enrollments...</td></tr>
              ) : enrollments.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No enrollments found.</td></tr>
              ) : enrollments.map((e) => {
                const label = e.student ? `${e.student.firstName} ${e.student.lastName}` : 'Student';
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">{label}</td>
                    <td className="table-cell">{e.student?.admissionNumber || '—'}</td>
                    <td className="table-cell">{e.class ? `${e.class.name} (Level ${e.class.level})` : '—'}</td>
                    <td className="table-cell">{e.term?.name || '—'}</td>
                    <td className="table-cell">{new Date(e.enrollmentDate).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${e.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {e.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <button onClick={() => handleDelete(e.id, label)} className="text-sm text-red-600 hover:text-red-800">Remove</button>
                    </td>
                  </tr>
                );
              })}
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