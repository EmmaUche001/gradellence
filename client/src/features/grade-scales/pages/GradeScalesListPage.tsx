import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { gradeScaleService } from '../../../services/gradeScaleService';
import { GradeScale } from '../../../types/gradeScale';

const getGradeColor = (grade: string): string => {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'bg-green-100 text-green-800';
  if (g.startsWith('B')) return 'bg-blue-100 text-blue-800';
  if (g.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export function GradeScalesListPage() {
  const [scales, setScales] = useState<GradeScale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchScales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await gradeScaleService.getAll(page, 50);
      // Sort by minScore descending (highest grade first)
      const sorted = [...response.data].sort((a, b) => b.minScore - a.minScore);
      setScales(sorted);
      if (response.meta) setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load grade scales');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchScales(); }, [fetchScales]);

  const handleDelete = async (id: string, grade: string) => {
    if (!window.confirm(`Delete grade scale "${grade}"?`)) return;
    try {
      await gradeScaleService.remove(id);
      fetchScales();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete grade scale');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grade Scales</h1>
          <p className="mt-1 text-sm text-gray-500">Configure the grading system for result computation</p>
        </div>
        <Link to="/grade-scales/new" className="btn-primary">+ Add Grade Scale</Link>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Score Range</th>
                <th className="table-header">Grade</th>
                <th className="table-header">Visual</th>
                <th className="table-header">Remark</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading grade scales...</td></tr>
              ) : scales.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No grade scales found. Click "+ Add Grade Scale" to create one.
                </td></tr>
              ) : scales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-900">
                    {s.minScore} – {s.maxScore}
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex w-10 h-10 items-center justify-center text-base font-bold rounded-full ${getGradeColor(s.grade)}`}>
                      {s.grade}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600"
                          style={{ width: `${((s.maxScore - s.minScore + 1) / 100) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{s.maxScore - s.minScore + 1} pts</span>
                    </div>
                  </td>
                  <td className="table-cell italic text-gray-600">{s.remark}</td>
                  <td className="table-cell">
                    {s.isActive ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>
                    )}
                  </td>
                  <td className="table-cell text-right space-x-2">
                    <Link to={`/grade-scales/${s.id}/edit`} className="text-sm text-primary-600 hover:text-primary-800">Edit</Link>
                    <button onClick={() => handleDelete(s.id, s.grade)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
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