import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parentDashboard } from '../services/parentApi';

interface Result {
  subject: string;
  score: number;
  grade: string | null;
  remark: string | null;
  term: string;
  session: string;
}

const StudentResultsPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;

    parentDashboard
      .getStudentResults(studentId)
      .then(setResults)
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load results');
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => navigate('/parent/dashboard')} className="text-blue-600 hover:text-blue-800 mr-4">
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Student Results</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {results.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No published results available.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.score.toFixed(1)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.grade || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.remark || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.session} - {r.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentResultsPage;