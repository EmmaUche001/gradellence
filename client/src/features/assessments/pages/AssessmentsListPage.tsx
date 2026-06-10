import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { assessmentService } from '../../../services/assessmentService';
import { Assessment } from '../../../types/assessment';

export function AssessmentsListPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAssessments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await assessmentService.getAll(page, 20);
      setAssessments(response.data);
      if (response.meta) setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const handlePublish = async (id: string, name: string) => {
    if (!window.confirm(`Publish assessment "${name}"? This will lock the scores.`)) return;
    try {
      await assessmentService.publish(id);
      fetchAssessments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish assessment');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete assessment "${name}"?`)) return;
    try {
      await assessmentService.remove(id);
      fetchAssessments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete assessment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="mt-1 text-sm text-gray-500">Manage student scores and assessments</p>
        </div>
        <Link to="/assessments/new" className="btn-primary">+ New Assessment</Link>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Subject</th>
                <th className="table-header">Type</th>
                <th className="table-header">Score</th>
                <th className="table-header">Term</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading assessments...</td></tr>
              ) : assessments.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No assessments found.</td></tr>
              ) : assessments.map((a) => {
                const label = a.student ? `${a.student.firstName} ${a.student.lastName}` : 'Student';
                const name = `${label} - ${a.subject?.name || ''} (${a.type})`;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">{label}</td>
                    <td className="table-cell">{a.subject?.name || '—'}</td>
                    <td className="table-cell">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">{a.type}</span>
                    </td>
                    <td className="table-cell">{a.score} / {a.maxScore}</td>
                    <td className="table-cell">{a.term?.name || '—'}</td>
                    <td className="table-cell">
                      {a.isPublished ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Published</span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>
                      )}
                    </td>
                    <td className="table-cell text-right space-x-2">
                      <Link to={`/assessments/${a.id}/edit`} className="text-sm text-primary-600 hover:text-primary-800">Edit</Link>
                      {!a.isPublished && (
                        <button onClick={() => handlePublish(a.id, name)} className="text-sm text-green-600 hover:text-green-800">Publish</button>
                      )}
                      <button onClick={() => handleDelete(a.id, name)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
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