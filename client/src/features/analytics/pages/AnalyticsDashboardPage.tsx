import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Users, School, BookOpen,
  TrendingUp, TrendingDown, BarChart3, Trophy,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { analyticsService } from '../../../services/analyticsService';
import { sessionService } from '../../../services/sessionService';
import { classService } from '../../../services/classService';
import { useToastStore } from '../../../store/toastStore';
import type { OverviewData, ResultStatsData, ClassRankingItem } from '../../../services/analyticsService';
import type { Session, Term } from '../../../types/session';
import type { Class } from '../../../types/class';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { KpiCard } from '../../../components/ui/KpiCard';
import { Card, CardHeader } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonKpiCard, SkeletonChart, SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { Avatar } from '../../../components/ui/Avatar';
import { chartColors } from '../../../lib/tokens';

// ── Custom bar tooltip ───────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2.5 shadow-md text-xs space-y-1">
      <p className="font-semibold text-gray-800">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Pass-rate colour helper ──────────────────────────────────────────────────
function passRateBadge(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= 70) return 'success';
  if (rate >= 50) return 'warning';
  return 'danger';
}

// ── Medal for top-3 positions ───────────────────────────────────────────────
function PositionCell({ pos }: { pos: number }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <span className="text-base">
      {pos <= 3 ? medals[pos - 1] : <span className="text-sm font-bold text-gray-500">{pos}</span>}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function AnalyticsDashboardPage() {
  const { addToast } = useToastStore();

  // ── Overview ─────────────────────────────────────────────────────────────
  const [overview, setOverview]           = useState<OverviewData | null>(null);
  const [overviewLoading, setOvLoading]   = useState(true);

  // ── Sessions / terms (shared dropdowns) ─────────────────────────────────
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [allTerms, setAllTerms]           = useState<Term[]>([]);

  // ── Result stats section ─────────────────────────────────────────────────
  const [selectedTermId, setSelectedTermId] = useState('');
  const [stats, setStats]                 = useState<ResultStatsData | null>(null);
  const [statsLoading, setStatsLoading]   = useState(false);

  // ── Class rankings section ───────────────────────────────────────────────
  const [classes, setClasses]             = useState<Class[]>([]);
  const [rankingClassId, setRankingClass] = useState('');
  const [rankingTermId, setRankingTerm]   = useState('');
  const [rankings, setRankings]           = useState<ClassRankingItem[]>([]);
  const [rankingsLoading, setRankLoad]    = useState(false);

  // ── Boot: load overview + sessions + classes ─────────────────────────────
  useEffect(() => {
    (async () => {
      // Overview
      try {
        const res = await analyticsService.getOverview();
        setOverview(res.data || null);
      } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load overview'); }
      finally { setOvLoading(false); }

      // Sessions → flatten terms (parallel fetch, not serial)
      try {
        const sessRes = await sessionService.getAll(1, 100);
        const sessList = sessRes.data || [];
        setSessions(sessList);
        const termResults = await Promise.all(
          sessList.map(s => sessionService.getTerms(s.id).then(r => r.data || []).catch(() => []))
        );
        const flat: Term[] = termResults.flat();
        setAllTerms(flat);
        const current = flat.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
      } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load sessions'); }

      // Classes
      try {
        const cr = await classService.getAll(1, 100);
        setClasses(cr.data || []);
      } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load classes'); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load stats whenever term changes ────────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!selectedTermId) return;
    setStatsLoading(true);
    try {
      const res = await analyticsService.getResultStats(selectedTermId);
      setStats(res.data || null);
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load stats'); }
    finally { setStatsLoading(false); }
  }, [selectedTermId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Load rankings whenever class + term change ───────────────────────────
  const loadRankings = useCallback(async () => {
    if (!rankingClassId || !rankingTermId) return;
    setRankLoad(true);
    try {
      const res = await analyticsService.getClassRankings(rankingClassId, rankingTermId);
      setRankings(res.data || []);
    } catch (e: any) { addToast('error', e.response?.data?.message || 'Failed to load rankings'); }
    finally { setRankLoad(false); }
  }, [rankingClassId, rankingTermId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadRankings(); }, [loadRankings]);

  // ── Term label helper ────────────────────────────────────────────────────
  const termLabel = (t: Term) => {
    const sess = sessions.find(s => s.id === t.sessionId);
    return sess ? `${t.name} — ${sess.name}` : t.name;
  };

  // ── Subject performance chart data ───────────────────────────────────────
  const chartData = stats
    ? [...stats.subjectPerformance]
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 10)
        .map(s => ({ name: s.subjectName.length > 12 ? s.subjectName.slice(0, 12) + '…' : s.subjectName, avg: +s.averageScore.toFixed(1), pass: +s.passRate.toFixed(1) }))
    : [];

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Analytics"
        description="School performance overview and insights"
      />

      {/* ── Section 1: Overview KPI Cards ──────────────────────────────── */}
      <section>
        <h2 className="text-section-title text-gray-900 mb-4">School Overview</h2>

        {overviewLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
        ) : overview ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Total Students" value={(overview.totalStudents ?? 0).toLocaleString()}
                icon={<GraduationCap size={20} className="text-primary-600" />} iconColor="bg-primary-50 text-primary-600" />
              <KpiCard title="Total Teachers"  value={overview.totalTeachers ?? 0}
                icon={<Users      size={20} className="text-success-600" />} iconColor="bg-success-50 text-success-600" />
              <KpiCard title="Total Classes"   value={overview.totalClasses ?? 0}
                icon={<School     size={20} className="text-warning-600" />} iconColor="bg-warning-50 text-warning-600" />
              <KpiCard title="Total Subjects"  value={overview.totalSubjects ?? 0}
                icon={<BookOpen   size={20} className="text-info-600"    />} iconColor="bg-info-50 text-info-600"       />
            </div>

            {/* Session / Term context bar */}
            <div className="mt-4 flex flex-wrap items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-border text-sm">
              <span className="text-gray-500">Active session:</span>
              {overview.activeSession
                ? <Badge variant="primary">{overview.activeSession.name}</Badge>
                : <span className="text-gray-400">None set</span>}
              <span className="text-gray-300">·</span>
              <span className="text-gray-500">Current term:</span>
              {overview.currentTerm
                ? <Badge variant="success">{overview.currentTerm.name}</Badge>
                : <span className="text-gray-400">None set</span>}
            </div>
          </>
        ) : (
          <div className="bg-surface rounded-card border border-border p-6">
            <EmptyState icon={<BarChart3 size={36} />} title="No overview data" description="School data will appear here once sessions and classes are configured." />
          </div>
        )}
      </section>

      {/* ── Section 2: Result Statistics ───────────────────────────────── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-section-title text-gray-900">Result Statistics</h2>
          <div className="w-full sm:w-72">
            <Select
              id="statsTerm"
              options={allTerms.map(t => ({ value: t.id, label: termLabel(t) }))}
              placeholder="Select a term"
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
            />
          </div>
        </div>

        {!selectedTermId ? (
          <div className="bg-surface rounded-card border border-border">
            <EmptyState icon={<BarChart3 size={36} />} title="Select a term" description="Choose a term above to view result statistics." />
          </div>
        ) : statsLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SkeletonChart /><SkeletonChart />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Stat summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Pass Rate" value={`${stats.passRate}%`}
                trend={stats.passRate >= 70 ? 'up' : stats.passRate >= 50 ? 'neutral' : 'down'}
                icon={<TrendingUp size={20} className={stats.passRate >= 70 ? 'text-success-600' : 'text-warning-600'} />}
                iconColor={stats.passRate >= 70 ? 'bg-success-50' : 'bg-warning-50'} />
              <KpiCard title="Average Score" value={stats.averageScore.toFixed(1)}
                icon={<BarChart3 size={20} className="text-primary-600" />} iconColor="bg-primary-50 text-primary-600" />
              <KpiCard title="Total Results" value={(stats.totalResults ?? 0).toLocaleString()}
                icon={<BookOpen size={20} className="text-info-600" />} iconColor="bg-info-50 text-info-600" />
              <KpiCard title="Published" value={(stats.publishedResults ?? 0).toLocaleString()}
                icon={<TrendingDown size={20} className="text-success-600" />} iconColor="bg-success-50 text-success-600" />
            </div>

            {/* Subject performance charts */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Average score bar */}
                <Card>
                  <CardHeader title="Average Score by Subject" description="Top 10 subjects" />
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="avg" name="Avg Score" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Pass rate line */}
                <Card>
                  <CardHeader title="Pass Rate by Subject" description="% students passing each subject" />
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip content={<BarTooltip />} />
                      <Line type="monotone" dataKey="pass" name="Pass Rate %" stroke={chartColors.success}
                        strokeWidth={2.5} dot={{ r: 4, fill: chartColors.success, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {/* Subject performance table */}
            {stats.subjectPerformance.length > 0 && (
              <Card noPadding>
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-card-title text-gray-900">Subject Performance Table</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-border">
                        {['Subject', 'Average Score', 'Pass Rate', 'Performance'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...stats.subjectPerformance]
                        .sort((a, b) => b.averageScore - a.averageScore)
                        .map(sub => (
                          <tr key={sub.subjectId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{sub.subjectName}</td>
                            <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums">{sub.averageScore.toFixed(1)}</td>
                            <td className="px-5 py-3.5">
                              <Badge variant={passRateBadge(sub.passRate)}>{sub.passRate.toFixed(0)}%</Badge>
                            </td>
                            <td className="px-5 py-3.5 min-w-[140px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${sub.passRate >= 70 ? 'bg-success-500' : sub.passRate >= 50 ? 'bg-warning-500' : 'bg-danger-500'}`}
                                    style={{ width: `${sub.passRate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 w-8 tabular-nums">{sub.passRate.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-card border border-border">
            <EmptyState icon={<BarChart3 size={36} />} title="No statistics" description="No results have been computed for this term yet." />
          </div>
        )}
      </section>

      {/* ── Section 3: Class Rankings ───────────────────────────────────── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-section-title text-gray-900">Class Rankings</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              id="rankClass"
              options={classes.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select class"
              value={rankingClassId}
              onChange={e => setRankingClass(e.target.value)}
            />
            <Select
              id="rankTerm"
              options={allTerms.map(t => ({ value: t.id, label: termLabel(t) }))}
              placeholder="Select term"
              value={rankingTermId}
              onChange={e => setRankingTerm(e.target.value)}
            />
          </div>
        </div>

        {(!rankingClassId || !rankingTermId) ? (
          <div className="bg-surface rounded-card border border-border">
            <EmptyState icon={<Trophy size={36} />} title="Select class & term" description="Choose a class and term to view the student rankings." />
          </div>
        ) : rankingsLoading ? (
          <SkeletonTable rows={8} cols={5} />
        ) : rankings.length === 0 ? (
          <div className="bg-surface rounded-card border border-border">
            <EmptyState icon={<Trophy size={36} />} title="No rankings" description="No results have been computed for this class and term yet." />
          </div>
        ) : (
          <Card noPadding>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-card-title text-gray-900">
                {classes.find(c => c.id === rankingClassId)?.name} — {allTerms.find(t => t.id === rankingTermId)?.name}
              </h3>
              <span className="text-sm text-gray-400">{rankings.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    {['Position', 'Student', 'Admission No.', 'Total Score', 'Average Score'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rankings.map(r => (
                    <tr key={r.studentId} className={`transition-colors ${r.position <= 3 ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-5 py-3.5 text-center">
                        <PositionCell pos={r.position} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
                          <span className="text-sm font-semibold text-gray-900">{r.firstName} {r.lastName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{r.admissionNumber}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900 tabular-nums">{r.totalScore}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-700 tabular-nums">{r.averageScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
