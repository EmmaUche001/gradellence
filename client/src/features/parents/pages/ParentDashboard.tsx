import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { parentDashboard } from '../services/parentApi';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClass: string | null;
  currentTerm: string | null;
  latestAverage: number | null;
}

const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('parent_token');
    if (!token) {
      navigate('/parent/login');
      return;
    }

    parentDashboard
      .getStudents()
      .then(setStudents)
      .catch((err) => {
        if (err?.response?.status === 401) {
          localStorage.removeItem('parent_token');
          navigate('/parent/login');
        }
        setError('Failed to load students');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('parent_token');
    navigate('/parent/login');
  };

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
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No students linked to your account.</p>
            <p className="text-gray-400 mt-2">
              Contact your school to link your children.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <div key={student.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Admission: {student.admissionNumber}
                </p>
                {student.currentClass && (
                  <p className="text-sm text-gray-500">Class: {student.currentClass}</p>
                )}
                {student.currentTerm && (
                  <p className="text-sm text-gray-500">Term: {student.currentTerm}</p>
                )}
                {student.latestAverage !== null && (
                  <p className="text-sm font-medium text-blue-600 mt-2">
                    Latest Average: {student.latestAverage.toFixed(1)}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <Link
                    to={`/parent/students/${student.id}/results`}
                    className="block text-center py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    View Results
                  </Link>
                  <Link
                    to={`/parent/students/${student.id}/analytics`}
                    className="block text-center py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    View Analytics
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ParentDashboard;