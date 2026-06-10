import { useState, useEffect, useCallback } from 'react';
import { resultService } from '../../../services/resultService';
import { Result } from '../../../types/result';

export function ResultsListPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [publishFilter, setPublishFilter] = useState<'all' | 'published' | 'draft'>('all');

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: { isPublished?: boolean } = {};
      if (publishFilter === 'published') filters.isPublished = true;
      if (publishFilter === 'draft') filters.isPublished = false;
      const response = await resultService.getAll(page, 20, filters);
      setResults(response.data);
      if (response.meta) setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  }, [page, publishFilter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Results</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage computed student results</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <div className="flex space-x-1">
            {(['all', 'published', 'draft'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setPublishFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  publishFilter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Subject</th>
                <th className="table-header">Term</th>
                <th className="table-header">Score</th>
                <th className="table-header">Grade</th>
                <th className="table-header">Remark</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading results...</td></tr>
              ) : results.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No results found.</td></tr>
              ) : results.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-900">
                    {r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}
                    {r.student && <span className="ml-1 text-xs text-gray-500">({r.student.admissionNumber})</span>}
                  </td>
                  <td className="table-cell">{r.subject?.name || '—'} {r.subject?.code && <span className="text-xs text-gray-500">({r.subject.code})</span>}</td>
                  <td className="table-cell">{r.term?.name || '—'}</td>
                  <td className="table-cell font-semibold">{r.totalScore.toFixed(2)}</td>
                  <td className="table-cell">
                    {r.grade && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        r.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                        r.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                        r.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {r.grade}
                      </span>
                    )}
                  </td>
                  <td className="table-cell italic text-gray-500">{r.remark || '—'}</td>
                  <td className="table-cell">
                    {r.isPublished ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Published</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>
                    )}
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