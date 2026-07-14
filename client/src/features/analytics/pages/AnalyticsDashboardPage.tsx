import { useState, useEffect } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import { sessionService } from '../../../services/sessionService';
import { classService } from '../../../services/classService';
import { useToastStore } from '../../../store/toastStore';
import type { OverviewData, ResultStatsData, ClassRankingItem } from '../../../services/analyticsService';
import type { Session, Term } from '../../../types/session';
import type { Class } from '../../../types/class';

export function AnalyticsDashboardPage() {
  const { addToast } = useToastStore();

  // Overview
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Result stats
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allTerms, setAllTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [stats, setStats] = useState<ResultStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Class rankings
  const [classes, setClasses] = useState<Class[]>([]);
  const [rankingClassId, setRankingClassId] = useState<string>('');
  const [rankingTermId, setRankingTermId] = useState<string>('');
  const [rankings, setRankings] = useState<ClassRankingItem[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);

  useEffect(() => {
    loadOverview();
    loadSessions();
    loadClasses();
  }, []);

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await analyticsService.getOverview();
      setOverview(res.data || null);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load overview');
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await sessionService.getAll(1, 100);
      const sessionsData = res.data || [];
      setSessions(sessionsData);
      const terms: Term[] = [];
      for (const s of sessionsData) {
        const termsRes = await sessionService.getTerms(s.id);
        terms.push(...(termsRes.data || []));
      }
      setAllTerms(terms);
      const currentTerm = terms.find((t) => t.isCurrent);
      if (currentTerm) setSelectedTermId(currentTerm.id);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load sessions');
    }
  };

  const loadClasses = async () => {
    try {
      const res = await classService.getAll(1, 100);
      setClasses(res.data || []);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load classes');
    }
  };

  useEffect(() => {
    if (selectedTermId) loadStats();
  }, [selectedTermId]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await analyticsService.getResultStats(selectedTermId || undefined);
      setStats(res.data || null);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadRankings = async () => {
    if (!rankingClassId || !rankingTermId) return;
    setRankingsLoading(true);
    try {
      const res = await analyticsService.getClassRankings(rankingClassId, rankingTermId);
      setRankings(res.data || []);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to load rankings');
    } finally {
      setRankingsLoading(false);
    }
  };

  useEffect(() => {
    if (rankingClassId && rankingTermId) loadRankings();
  }, [rankingClassId, rankingTermId]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">School performance overview and insights.</p>
      </div>

      {/* Overview Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        {overviewLoading ? (
          <p className="text-sm text-gray-400">Loading overview...</p>
        ) : overview ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="p-4 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalStudents}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-500">Total Teachers</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalTeachers}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-500">Total Classes</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalClasses}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-500">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalSubjects}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-500">Current Session:</span>
              {overview.activeSession ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-700">
                  {overview.activeSession.name}
                </span>
              ) : (
                <span className="text-sm text-gray-400">None</span>
              )}
              <span className="text-sm text-gray-500">Current Term:</span>
              {overview.currentTerm ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                  {overview.currentTerm.name}
                </span>
              ) : (
                <span className="text-sm text-gray-400">None</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">No overview data.</p>
        )}
      </div>

      {/* Result Statistics Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Result Statistics</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select a term</option>
            {allTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} ({sessions.find((s) => s.id === term.sessionId)?.name})
              </option>
            ))}
          </select>
        </div>

        {statsLoading ? (
          <p className="text-sm text-gray-400">Loading statistics...</p>
        ) : stats ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-gray-500">Pass Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.passRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageScore}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Results</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalResults}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Published Results</p>
                <p className="text-xl font-semibold text-gray-900">{stats.publishedResults}</p>
              </div>
            </div>

            {stats.subjectPerformance.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="table-header">Subject</th>
                      <th className="table-header">Average Score</th>
                      <th className="table-header">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...stats.subjectPerformance]
                      .sort((a, b) => b.averageScore - a.averageScore)
                      .map((sub) => (
                        <tr key={sub.subjectId}>
                          <td className="table-cell">{sub.subjectName}</td>
                          <td className="table-cell">{sub.averageScore}</td>
                          <td className="table-cell">{sub.passRate}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : selectedTermId ? (
          <p className="text-sm text-gray-400">No statistics available for this term.</p>
        ) : (
          <p className="text-sm text-gray-400">Select a term to view statistics.</p>
        )}
      </div>

      {/* Class Rankings Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Rankings</h2>
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={rankingClassId}
              onChange={(e) => setRankingClassId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={rankingTermId}
              onChange={(e) => setRankingTermId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a term</option>
              {allTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} ({sessions.find((s) => s.id === term.sessionId)?.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {rankingsLoading ? (
          <p className="text-sm text-gray-400">Loading rankings...</p>
        ) : rankings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Position</th>
                  <th className="table-header">Student</th>
                  <th className="table-header">Admission No.</th>
                  <th className="table-header">Total Score</th>
                  <th className="table-header">Average Score</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr key={r.studentId}>
                    <td className="table-cell">{r.position}</td>
                    <td className="table-cell">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="table-cell">{r.admissionNumber}</td>
                    <td className="table-cell">{r.totalScore}</td>
                    <td className="table-cell">{r.averageScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rankingClassId && rankingTermId ? (
          <p className="text-sm text-gray-400">No rankings available for this selection.</p>
        ) : (
          <p className="text-sm text-gray-400">Select a class and term to view rankings.</p>
        )}
      </div>
    </div>
  );
}