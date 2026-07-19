import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { parentDashboard } from '../services/parentApi';
import { ParentPortalLayout } from '../components/ParentPortalLayout';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClass: string | null;
  currentTerm: string | null;
  latestAverage: number | null;
}

function avgBadge(avg: number | null): 'success' | 'warning' | 'danger' | 'gray' {
  if (avg === null) return 'gray';
  if (avg >= 70) return 'success';
  if (avg >= 50) return 'warning';
  return 'danger';
}

const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const token = localStorage.getItem('parent_token');
    if (!token) { navigate('/parent/login'); return; }

    parentDashboard.getStudents()
      .then(setStudents)
      .catch(err => {
        if (err?.response?.status === 401) {
          localStorage.removeItem('parent_token');
          navigate('/parent/login');
          return;
        }
        setError('Failed to load students.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <ParentPortalLayout>
      <div className="space-y-6">
        {/* Heading */}
        <div>
          <h1 className="text-page-title text-gray-900">My Children</h1>
          <p className="mt-1 text-sm text-gray-500">Track academic results and performance for each child.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
            <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : students.length === 0 ? (
          <div className="bg-surface rounded-card border border-border">
            <EmptyState
              icon={<GraduationCap size={40} />}
              title="No students linked"
              description="Contact your school admin to link your children to your parent account."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map(student => (
              <div key={student.id}
                className="bg-surface rounded-card p-6 shadow-sm border border-border hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={`${student.firstName} ${student.lastName}`} size="md" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-gray-400">{student.admissionNumber}</p>
                  </div>
                </div>

                {/* Info pills */}
                <div className="space-y-2 mb-5">
                  {student.currentClass && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Class</span>
                      <span className="font-medium text-gray-800">{student.currentClass}</span>
                    </div>
                  )}
                  {student.currentTerm && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Term</span>
                      <span className="font-medium text-gray-800">{student.currentTerm}</span>
                    </div>
                  )}
                  {student.latestAverage !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Latest avg.</span>
                      <Badge variant={avgBadge(student.latestAverage)}>
                        {student.latestAverage.toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div className="grid grid-cols-2 gap-2">
                  <Link to={`/parent/students/${student.id}/results`}
                    className="flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                    <BarChart3 size={13} /> Results
                  </Link>
                  <Link to={`/parent/students/${student.id}/analytics`}
                    className="flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-success-600 bg-success-50 rounded-lg hover:bg-success-100 transition-colors">
                    <TrendingUp size={13} /> Analytics
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ParentPortalLayout>
  );
};

export default ParentDashboard;
