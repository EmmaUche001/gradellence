import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sessionService } from '../../../services/sessionService';
import { Session } from '../../../types/session';

export function SessionsListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sessionTerms, setSessionTerms] = useState<Record<string, any[]>>({});
  const [termsLoading, setTermsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await sessionService.getAll(page, 20);
      setSessions(response.data);
      if (response.meta) setTotalPages(response.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete session "${name}"?`)) return;
    try {
      await sessionService.remove(id);
      fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete session');
    }
  };

  const handleSetCurrentSession = async (id: string) => {
    try {
      await sessionService.setCurrentSession(id);
      fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set current session');
    }
  };

  const handleSetCurrentTerm = async (id: string) => {
    try {
      await sessionService.setCurrentTerm(id);
      // Clear the stale term cache so the expanded panel re-fetches fresh data
      // when the user next expands it. Without this, sessionTerms still holds
      // the old isCurrent values and the "CURRENT" badge never appears.
      setSessionTerms({});
      fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set current term');
    }
  };

  const handleToggleTerms = async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    if (!sessionTerms[sessionId]) {
      setTermsLoading(true);
      try {
        const response = await sessionService.getById(sessionId);
        setSessionTerms(prev => ({ ...prev, [sessionId]: response.data.terms || [] }));
      } catch (err: any) {
        setError('Failed to load terms');
      } finally {
        setTermsLoading(false);
      }
    }
    setExpandedId(sessionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage academic sessions and terms</p>
        </div>
        <Link to="/sessions/new" className="btn-primary">+ Add Session</Link>
      </div>
      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Start Date</th>
                <th className="table-header">End Date</th>
                <th className="table-header">Current</th>
                <th className="table-header">Status</th>
                <th className="table-header">Terms</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading sessions...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No sessions found.</td></tr>
              ) : sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-900">{s.name}</td>
                  <td className="table-cell">{new Date(s.startDate).toLocaleDateString()}</td>
                  <td className="table-cell">{new Date(s.endDate).toLocaleDateString()}</td>
                  <td className="table-cell">
                    {s.isCurrent ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">CURRENT</span>
                    ) : (
                      <button
                        onClick={() => handleSetCurrentSession(s.id)}
                        className="text-xs text-primary-600 hover:text-primary-800 underline"
                      >
                        Set as Current
                      </button>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${s.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {s.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleToggleTerms(s.id)}
                      className="text-xs text-primary-600 hover:text-primary-800 underline"
                    >
                      {expandedId === s.id ? 'Hide Terms' : 'View Terms'}
                    </button>
                  </td>
                  <td className="table-cell text-right space-x-2">
                    <Link to={`/sessions/${s.id}/edit`} className="text-sm text-primary-600 hover:text-primary-800">Edit</Link>
                    <button onClick={() => handleDelete(s.id, s.name)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expanded terms section */}
        {expandedId && (() => {
          const session = sessions.find(s => s.id === expandedId);
          if (!session) return null;
          const terms = sessionTerms[expandedId] || [];
          if (termsLoading) return <div className="border-t border-gray-200 p-4 bg-gray-50"><p className="text-sm text-gray-500">Loading terms...</p></div>;
          return (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Terms for {session.name}</h4>
              {terms.length === 0 ? (
                <p className="text-sm text-gray-500">No terms found.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Start</th>
                      <th className="pb-2 pr-4">End</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Current</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((t) => (
                      <tr key={t.id} className="border-t border-gray-200">
                        <td className="py-2 pr-4 font-medium">{t.name}</td>
                        <td className="py-2 pr-4">{new Date(t.startDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{new Date(t.endDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${t.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {t.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {t.isCurrent ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">CURRENT</span>
                          ) : (
                            <button
                              onClick={() => handleSetCurrentTerm(t.id)}
                              className="text-xs text-primary-600 hover:text-primary-800 underline"
                            >
                              Set as Current
                            </button>
                          )}
                        </td>
                        <td className="py-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}

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
