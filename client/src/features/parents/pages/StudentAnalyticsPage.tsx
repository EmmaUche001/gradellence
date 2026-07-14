import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parentDashboard } from '../services/parentApi';

interface TermAverage {
  term: string;
  average: number;
  subjects: number;
}

interface AnalyticsData {
  studentId: string;
  termAverages: TermAverage[];
  totalSubjects: number;
}

const StudentAnalyticsPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;

    parentDashboard
      .getStudentAnalytics(studentId)
      .then(setData)
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load analytics');
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
          <h1 className="text-2xl font-bold text-gray-900">Student Analytics</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!data ? (
          <p className="text-gray-500 text-center py-12">No analytics data available.</p>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Subjects</h3>
              <p className="text-3xl font-bold text-blue-600">{data.totalSubjects}</p>
            </div>

            {data.termAverages.map((ta, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900">{ta.term}</h3>
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Average Score</span>
                    <span className="font-medium">{ta.average.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(ta.average, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Subjects: {ta.subjects}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentAnalyticsPage;