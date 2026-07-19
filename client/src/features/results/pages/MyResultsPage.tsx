import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Download, Loader2, BookOpen } from 'lucide-react';
import {
  PageHeader,
  Select,
  Badge,
  BadgeVariant,
  KpiCard,
  EmptyState,
  SkeletonTable,
  Button,
} from '../../../components/ui';
import apiClient, { ApiResponse } from '../../../services/apiClient';
import { useToastStore } from '../../../store/toastStore';
import { downloadPdf } from '../../../utils/downloadPdf';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface Term {
  id: string;
  name: string;
}

interface Session {
  id: string;
  name: string;
  terms: Term[];
}

interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface ResultRow {
  id: string;
  subject: { id: string; name: string; code?: string } | null;
  totalScore: number;
  grade: string | null;
  remark: string | null;
  isPassed: boolean;
  isPublished: boolean;
}

interface ResultSummary {
  totalSubjects: number;
  averageScore: number;
  gpa: number;
  passed: number;
  failed: number;
}

interface StudentResultsResponse {
  results: ResultRow[];
  summary: ResultSummary;
  isPublished: boolean;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function gradeToBadgeVariant(grade: string | null): BadgeVariant {
  if (!grade) return 'gray';
  const letter = grade.charAt(0).toUpperCase();
  if (letter === 'A') return 'success';
  if (letter === 'B') return 'info';
  if (letter === 'C') return 'warning';
  return 'danger'; // D, E, F
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function MyResultsPage() {
  const { addToast } = useToastStore();

  // Term options (flattened from sessions)
  const [termOptions, setTermOptions]     = useState<{ value: string; label: string }[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Student record lookup
  const [student, setStudent]             = useState<StudentRecord | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);
  const [noStudentRecord, setNoStudentRecord] = useState(false);

  // Results
  const [results, setResults]             = useState<ResultRow[]>([]);
  const [summary, setSummary]             = useState<ResultSummary | null>(null);
  const [isPublished, setIsPublished]     = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Download
  const [downloading, setDownloading]     = useState(false);

  // ------------------------------------------------------------------
  // 1. On mount: fetch sessions (for term dropdown) + student record
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchInitialData() {
      // Fetch sessions and student record in parallel
      const [sessionsRes, studentsRes] = await Promise.allSettled([
        apiClient.get<ApiResponse<Session[]>>('/v1/sessions?page=1&limit=100'),
        apiClient.get<ApiResponse<StudentRecord[]>>('/v1/students?page=1&limit=1'),
      ]);

      if (cancelled) return;

      // Process sessions → flat term list
      if (sessionsRes.status === 'fulfilled') {
        const sessions: Session[] = sessionsRes.value.data?.data ?? [];
        const options = sessions.flatMap((s) =>
          (s.terms ?? []).map((t) => ({
            value: t.id,
            label: `${t.name} — ${s.name}`,
          })),
        );
        setTermOptions(options);
      } else {
        addToast('error', 'Failed to load terms');
      }

      // Process student record
      setStudentLoading(false);
      if (studentsRes.status === 'fulfilled') {
        const students: StudentRecord[] = studentsRes.value.data?.data ?? [];
        if (students.length === 0) {
          setNoStudentRecord(true);
        } else {
          setStudent(students[0]);
        }
      } else {
        addToast('error', 'Failed to load student record');
        setNoStudentRecord(true);
      }
    }

    fetchInitialData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // 2. When a term is selected, fetch results
  // ------------------------------------------------------------------
  const fetchResults = useCallback(async (studentId: string, termId: string) => {
    setResultsLoading(true);
    setResults([]);
    setSummary(null);
    setIsPublished(false);
    try {
      const res = await apiClient.get<ApiResponse<StudentResultsResponse>>(
        `/v1/results/student/${studentId}/${termId}`,
      );
      const payload = res.data?.data;
      setResults(payload?.results ?? []);
      setSummary(payload?.summary ?? null);
      setIsPublished(payload?.isPublished ?? false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Failed to load results';
      addToast('error', msg);
    } finally {
      setResultsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (student && selectedTermId) {
      fetchResults(student.id, selectedTermId);
    }
  }, [student, selectedTermId, fetchResults]);

  // ------------------------------------------------------------------
  // 3. Download report card
  // ------------------------------------------------------------------
  function handleDownload() {
    if (!student || !selectedTermId) return;
    downloadPdf(
      `/v1/results/report-card/${student.id}/${selectedTermId}`,
      `report-card-${student.admissionNumber}-${selectedTermId}.pdf`,
      () => setDownloading(true),
      () => setDownloading(false),
      (msg) => addToast('error', msg),
    );
  }

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  const showStudentSkeleton = studentLoading;
  const showResultsSkeleton = !studentLoading && !noStudentRecord && selectedTermId && resultsLoading;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Results"
        description="View your academic results by term"
        actions={
          isPublished && selectedTermId && student ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              Download Report Card
            </Button>
          ) : null
        }
      />

      {/* No student record linked */}
      {!studentLoading && noStudentRecord && (
        <EmptyState
          icon={<BookOpen size={40} />}
          title="No student record linked"
          description="No student record is linked to your account. Please contact your school administrator."
        />
      )}

      {/* Term selector — shown once student is loaded and exists */}
      {!studentLoading && !noStudentRecord && (
        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-72">
            <Select
              id="term-select"
              label="Select Term"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              placeholder="Choose a term…"
              options={termOptions}
            />
          </div>
        </div>
      )}

      {/* Loading skeleton while fetching student */}
      {showStudentSkeleton && (
        <div className="bg-surface rounded-card shadow-sm border border-border p-5">
          <SkeletonTable rows={5} cols={5} />
        </div>
      )}

      {/* No term selected yet */}
      {!studentLoading && !noStudentRecord && !selectedTermId && (
        <EmptyState
          icon={<ScrollText size={40} />}
          title="Select a term"
          description="Choose a term from the dropdown above to view your results."
        />
      )}

      {/* Results loading skeleton */}
      {showResultsSkeleton && (
        <div className="bg-surface rounded-card shadow-sm border border-border p-5">
          <SkeletonTable rows={6} cols={5} />
        </div>
      )}

      {/* Results loaded */}
      {!resultsLoading && selectedTermId && student && (
        <>
          {results.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={40} />}
              title="No results found"
              description="No results have been recorded for the selected term."
            />
          ) : (
            <>
              {/* KPI summary strip */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <KpiCard
                    title="Total Subjects"
                    value={summary.totalSubjects}
                    iconColor="bg-primary-50 text-primary-600"
                  />
                  <KpiCard
                    title="Average Score"
                    value={`${summary.averageScore.toFixed(1)}%`}
                    iconColor="bg-info-50 text-info-600"
                  />
                  <KpiCard
                    title="GPA"
                    value={summary.gpa.toFixed(2)}
                    iconColor="bg-warning-50 text-warning-600"
                  />
                  <KpiCard
                    title="Passed"
                    value={summary.passed}
                    iconColor="bg-success-50 text-success-600"
                  />
                  <KpiCard
                    title="Failed"
                    value={summary.failed}
                    iconColor="bg-danger-50 text-danger-600"
                  />
                </div>
              )}

              {/* Results table */}
              <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-border">
                        {['Subject', 'Score', 'Grade', 'Remark', 'Pass / Fail'].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {results.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          {/* Subject */}
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-gray-900">
                              {r.subject?.name ?? '—'}
                            </p>
                            {r.subject?.code && (
                              <p className="text-xs text-gray-400">{r.subject.code}</p>
                            )}
                          </td>

                          {/* Score */}
                          <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums">
                            {r.totalScore.toFixed(2)}
                          </td>

                          {/* Grade badge */}
                          <td className="px-5 py-3.5">
                            {r.grade ? (
                              <Badge variant={gradeToBadgeVariant(r.grade)}>{r.grade}</Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>

                          {/* Remark */}
                          <td className="px-5 py-3.5 text-sm text-gray-500 italic">
                            {r.remark ?? '—'}
                          </td>

                          {/* Pass / Fail badge */}
                          <td className="px-5 py-3.5">
                            <Badge variant={r.isPassed ? 'success' : 'danger'}>
                              {r.isPassed ? 'Pass' : 'Fail'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
