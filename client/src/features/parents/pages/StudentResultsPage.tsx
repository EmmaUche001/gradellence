import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScrollText, AlertCircle, Download, Loader2 } from 'lucide-react';
import { parentDashboard } from '../services/parentApi';
import { ParentPortalLayout } from '../components/ParentPortalLayout';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { Button } from '../../../components/ui/Button';
import { useToastStore } from '../../../store/toastStore';

interface Result {
  subject: string;
  score: number;
  grade: string | null;
  remark: string | null;
  term: string;
  termId: string;
  session: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

function gradeBadge(grade: string | null): BadgeVariant {
  if (!grade) return 'gray';
  if (grade.startsWith('A')) return 'success';
  if (grade.startsWith('B')) return 'primary';
  if (grade.startsWith('C')) return 'info';
  if (grade.startsWith('D')) return 'warning';
  return 'danger';
}

const StudentResultsPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [results, setResults] = useState<Result[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingTermId, setDownloadingTermId] = useState<string | null>(null);
  const [downloadingTranscript, setDownloadingTranscript] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!studentId) return;
    parentDashboard.getStudentResults(studentId)
      .then(data => {
        setStudent(data.student);
        setResults(data.results);
      })
      .catch(err => {
        const msg = err?.response?.data?.message || 'Failed to load results';
        setError(msg);
        addToast('error', msg);
      })
      .finally(() => setLoading(false));
  }, [studentId, addToast]);

  const handleDownloadReportCard = async (termId: string) => {
    if (!studentId) return;
    setDownloadingTermId(termId);
    try {
      const response = await parentDashboard.downloadReportCard(studentId, termId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const term = results.find(r => r.termId === termId);
      link.setAttribute('download', `report-card-${student?.admissionNumber || studentId}-${term?.term || termId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Report card downloaded successfully');
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || 'Failed to download report card';
      setError(msg);
      addToast('error', msg);
    } finally {
      setDownloadingTermId(null);
    }
  };

  const handleDownloadTranscript = async () => {
    if (!studentId) return;
    setDownloadingTranscript(true);
    try {
      const response = await parentDashboard.downloadTranscript(studentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript-${student?.admissionNumber || studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Transcript downloaded successfully');
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || 'Failed to download transcript';
      setError(msg);
      addToast('error', msg);
    } finally {
      setDownloadingTranscript(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!studentId) return;
    setDownloadingSummary(true);
    try {
      const response = await parentDashboard.downloadAcademicSummary(studentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `academic-summary-${student?.admissionNumber || studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Academic summary downloaded successfully');
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || 'Failed to download academic summary';
      setError(msg);
      addToast('error', msg);
    } finally {
      setDownloadingSummary(false);
    }
  };

  // Group results by term for better readability
  const grouped = results.reduce<Record<string, { results: Result[]; termId: string }>>((acc, r) => {
    const key = `${r.session} — ${r.term}`;
    if (!acc[key]) {
      acc[key] = { results: [], termId: r.termId };
    }
    acc[key].results.push(r);
    return acc;
  }, {});

  return (
    <ParentPortalLayout pageTitle="Student Results" showBack>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-page-title text-gray-900">Results</h1>
            <p className="mt-1 text-sm text-gray-500">Published academic results for {student?.firstName} {student?.lastName}</p>
          </div>
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleDownloadSummary}
                loading={downloadingSummary}
                className="!border-success-200 !text-success-700 hover:!bg-success-50"
              >
                {downloadingSummary ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                Academic Summary
              </Button>
              <Button
                variant="primary"
                onClick={handleDownloadTranscript}
                loading={downloadingTranscript}
                className="!bg-success-600 hover:!bg-success-700 !rounded-xl"
              >
                {downloadingTranscript ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                Transcript
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
            <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : results.length === 0 ? (
          <div className="bg-surface rounded-card border border-border">
            <EmptyState
              icon={<ScrollText size={40} />}
              title="No results yet"
              description="Published results will appear here once the school releases them."
            />
          </div>
        ) : (
          Object.entries(grouped).map(([termKey, data]) => (
            <div key={termKey} className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
              <div className="px-5 py-3.5 bg-success-50 border-b border-success-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-success-800">{termKey}</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadReportCard(data.termId)}
                  loading={downloadingTermId === data.termId}
                >
                  {downloadingTermId === data.termId ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                  Report Card
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Subject', 'Score', 'Grade', 'Remark'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.results.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{r.subject}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums">{r.score.toFixed(1)}</td>
                        <td className="px-5 py-3.5">
                          {r.grade ? <Badge variant={gradeBadge(r.grade)}>{r.grade}</Badge> : <span className="text-gray-400 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 italic">{r.remark || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Term average */}
              <div className="px-5 py-3 border-t border-border bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">Term average</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {(data.results.reduce((s, r) => s + r.score, 0) / data.results.length).toFixed(1)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </ParentPortalLayout>
  );
};

export default StudentResultsPage;