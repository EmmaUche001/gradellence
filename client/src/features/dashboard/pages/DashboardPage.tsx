import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Users, School, BookOpen, ClipboardCheck,
  BarChart3, Plus, TrendingUp, TrendingDown,
  UserPlus, UserCheck, FileText, BarChart2, ArrowUpRight,
  Calendar, CreditCard,
  Megaphone, CalendarDays, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '../../../store/authStore';
import { analyticsService } from '../../../services/analyticsService';
import { auditLogService } from '../../../services/auditLogService';
import { assessmentService } from '../../../services/assessmentService';
import { resultService } from '../../../services/resultService';
import { classService } from '../../../services/classService';
import { subscriptionService } from '../../../services/subscriptionService';
import { announcementService } from '../../../services/announcementService';
import { Badge } from '../../../components/ui/Badge';
import { SkeletonKpiCard } from '../../../components/ui/SkeletonLoader';
import { chartColors } from '../../../lib/tokens';
import type { AuditLog } from '../../../types/auditLog';
import type { OverviewData, EnrollmentHistoryData, GradeDistributionData } from '../../../services/analyticsService';
import type { Class } from '../../../types/class';
import type { SchoolSubscription } from '../../../types/subscription';
import type { Announcement } from '../../../types/announcement';
import { TeacherDashboard } from '../components/TeacherDashboard';

// ── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function activityMeta(action: string, entityType: string) {
  if (action.includes('CREATE') && entityType === 'Student')
    return { icon: UserPlus,     bg: 'bg-primary-50', iconColor: 'text-primary-600', label: 'added a new student' };
  if (action.includes('CREATE') && entityType === 'Teacher')
    return { icon: UserCheck,    bg: 'bg-success-50', iconColor: 'text-success-600', label: 'added a new teacher' };
  if (action.includes('PUBLISH'))
    return { icon: BarChart2,    bg: 'bg-success-50', iconColor: 'text-success-600', label: 'published results' };
  if (action.includes('CREATE') && entityType === 'Assessment')
    return { icon: FileText,     bg: 'bg-warning-50', iconColor: 'text-warning-600', label: 'created assessment' };
  if (action.includes('PROMOTE'))
    return { icon: TrendingUp,   bg: 'bg-info-50',    iconColor: 'text-info-600',    label: 'promoted students' };
  return { icon: ClipboardCheck, bg: 'bg-gray-100',   iconColor: 'text-gray-500',    label: action.toLowerCase().replace(/_/g, ' ') };
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface KpiProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  sub?: string;
  to?: string;
}

function KpiCard({ icon, iconBg, title, value, change, trend = 'neutral', sub, to }: KpiProps) {
  const navigate = useNavigate();
  return (
    <div onClick={() => to && navigate(to)}
      className={`bg-surface rounded-card p-5 shadow-sm border border-border transition-all duration-150 ${to ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {change && (
            <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-success-600' : trend === 'down' ? 'text-danger-600' : 'text-gray-500'}`}>
              {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
              <span>{change}</span>
            </div>
          )}
          {sub && !change && <p className="mt-1.5 text-xs text-warning-600 font-medium">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, sub, color = 'bg-primary-600' }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; percent: number; count: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800">{d.name}</p>
      <p className="text-gray-500">{d.percent}% · {d.count} students</p>
    </div>
  );
}

function EnrollmentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-primary-600 font-medium">{payload[0].value} new enrollment{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();

  // Role-aware branching — teachers get their own focused dashboard
  if (user?.roles?.includes('TEACHER') && !user.roles.includes('SCHOOL_ADMIN') && !user.roles.includes('SUPER_ADMIN')) {
    return <TeacherDashboard />;
  }

  // ── State ──────────────────────────────────────────────────────────────
  const [overview, setOverview]           = useState<OverviewData | null>(null);
  const [kpiLoading, setKpiLoading]       = useState(true);

  const [enrollHistory, setEnrollHistory]     = useState<EnrollmentHistoryData | null>(null);
  const [enrollPeriod, setEnrollPeriod]       = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [enrollLoading, setEnrollLoading]     = useState(true);

  const [gradeDist, setGradeDist]             = useState<GradeDistributionData | null>(null);
  const [gradeLoading, setGradeLoading]       = useState(true);

  const [recentLogs, setRecentLogs]           = useState<AuditLog[]>([]);
  const [classes, setClasses]                 = useState<Class[]>([]);
  const [classesLoading, setClsLoad]          = useState(true);
  const [subscription, setSub]                = useState<SchoolSubscription | null>(null);
  const [announcements, setAnnouncements]     = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnLoad]    = useState(true);

  const [pendingAssessments, setPendingAss]   = useState<number | null>(null);
  const [totalAssessments, setTotalAss]       = useState<number | null>(null);
  const [publishedResults, setPublishedRes]   = useState<number | null>(null);
  const [totalResults, setTotalRes]           = useState<number | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Initial data load ──────────────────────────────────────────────────
  useEffect(() => {
    // 1. Overview KPIs
    analyticsService.getOverview()
      .then(r => setOverview(r.data ?? null))
      .catch(() => {})
      .finally(() => setKpiLoading(false));

    // 2. Audit logs (recent activity)
    auditLogService.getAll(1, 5)
      .then(r => setRecentLogs(r.data ?? []))
      .catch(() => {});

    // 3. Real classes (5 most recent)
    classService.getAll(1, 5)
      .then(r => setClasses(r.data ?? []))
      .catch(() => {})
      .finally(() => setClsLoad(false));

    // 4. Subscription plan details
    subscriptionService.getMyPlan()
      .then(r => setSub(r.data ?? null))
      .catch(() => {});

    // 5. Assessment counts — one request, split total vs pending from data
    assessmentService.getAll(1, 500)
      .then(r => {
        const all = r.data ?? [];
        const metaTotal = r.meta?.total ?? all.length;
        setTotalAss(metaTotal);
        // Count unpublished from this page. If total > 500 we show approx.
        setPendingAss(all.filter(a => !a.isPublished).length);
      })
      .catch(() => {});

    // 6. Results published/total
    Promise.all([
      resultService.getAll(1, 1),
      resultService.getAll(1, 1, { isPublished: true }),
    ]).then(([allRes, pubRes]) => {
      setTotalRes(allRes.meta?.total ?? null);
      setPublishedRes(pubRes.meta?.total ?? null);
    }).catch(() => {});

    // 7. Grade distribution (uses current term by default)
    analyticsService.getGradeDistribution()
      .then(r => setGradeDist(r.data ?? null))
      .catch(() => {})
      .finally(() => setGradeLoading(false));

    // 8. Announcements
    announcementService.getAll(1, 5)
      .then(r => setAnnouncements(r.data ?? []))
      .catch(() => {})
      .finally(() => setAnnLoad(false));
  }, []);

  // ── Enrollment history (re-fetches when period changes) ────────────────
  useEffect(() => {
    setEnrollLoading(true);
    analyticsService.getEnrollmentHistory(enrollPeriod)
      .then(r => setEnrollHistory(r.data ?? null))
      .catch(() => {})
      .finally(() => setEnrollLoading(false));
  }, [enrollPeriod]);

  // ── Derived values ─────────────────────────────────────────────────────
  const totalStudents = overview?.totalStudents ?? null;
  const totalTeachers = overview?.totalTeachers ?? null;
  const totalClasses  = overview?.totalClasses  ?? null;
  const totalSubjects = overview?.totalSubjects  ?? null;

  const planName  = subscription?.plan?.name ?? null;
  const maxUsers  = subscription?.plan?.maxUsers ?? null;
  const storageGB = subscription?.plan?.storageGB ?? null;

  // Assessment progress bars
  const assessPublishedCount = totalAssessments !== null && pendingAssessments !== null
    ? totalAssessments - pendingAssessments : null;
  const assessPct = assessPublishedCount !== null && totalAssessments
    ? Math.round((assessPublishedCount / totalAssessments) * 100) : 0;
  const resultsPct = publishedResults !== null && totalResults
    ? Math.round((publishedResults / totalResults) * 100) : 0;

  // Donut data from real grade distribution
  const donutData = gradeDist?.bands.map(b => ({
    name:    b.name.split(' (')[0],   // strip "(80-100%)" suffix for legend
    fullName: b.name,
    count:   b.count,
    percent: b.percent,
    value:   b.percent,
    color:   b.color,
  })) ?? [];

  // Enrollment bar chart data
  const enrollChartData = enrollHistory
    ? enrollHistory.labels.map((label, i) => ({ label, count: enrollHistory.data[i] }))
    : [];

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.firstName ?? 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {overview?.activeSession
              ? `${overview.activeSession.name}${overview.currentTerm ? ` · ${overview.currentTerm.name}` : ''}`
              : 'Welcome back.'}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
            <Calendar size={13} /><span>{today}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button onClick={() => navigate('/students/new')}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium bg-primary-600 text-white rounded-btn hover:bg-primary-700 transition-colors">
            <Plus size={16} /> Add Student
          </button>
          <button onClick={() => navigate('/assessments/new')}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium bg-surface text-primary-600 border border-primary-600 rounded-btn hover:bg-primary-50 transition-colors">
            <Plus size={16} /> Record Assessment
          </button>
          <button onClick={() => navigate('/results/broadsheet')}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium bg-surface text-gray-700 border border-border rounded-btn hover:bg-gray-50 transition-colors">
            <BarChart3 size={16} className="text-primary-600" /> Generate Results
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonKpiCard key={i} />)
          : <>
              <KpiCard icon={<GraduationCap size={20} className="text-primary-600" />} iconBg="bg-primary-50"
                title="Students" value={totalStudents !== null ? totalStudents.toLocaleString() : '—'} to="/students" />
              <KpiCard icon={<Users size={20} className="text-success-600" />} iconBg="bg-success-50"
                title="Teachers" value={totalTeachers !== null ? totalTeachers : '—'} to="/teachers" />
              <KpiCard icon={<School size={20} className="text-warning-600" />} iconBg="bg-warning-50"
                title="Classes" value={totalClasses !== null ? totalClasses : '—'} to="/classes" />
              <KpiCard icon={<BookOpen size={20} className="text-info-600" />} iconBg="bg-info-50"
                title="Subjects" value={totalSubjects !== null ? totalSubjects : '—'} to="/subjects" />
              <KpiCard icon={<ClipboardCheck size={20} className="text-danger-600" />} iconBg="bg-danger-50"
                title="Assessments"
                value={pendingAssessments !== null ? pendingAssessments : totalAssessments !== null ? totalAssessments : '—'}
                sub={pendingAssessments !== null ? `${pendingAssessments} pending` : undefined}
                to="/assessments" />
              <KpiCard icon={<BarChart2 size={20} className="text-primary-600" />} iconBg="bg-primary-50"
                title="Published Results"
                value={totalResults !== null ? `${publishedResults ?? 0} / ${totalResults}` : '—'}
                sub={totalResults !== null ? 'This term' : undefined}
                to="/results" />
            </>}
      </div>

      {/* ── Analytics Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

        {/* Enrollment history bar chart */}
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-card-title text-gray-900">Student Enrollment</h3>
              {enrollHistory && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {enrollHistory.totalEnrollments} new enrollment{enrollHistory.totalEnrollments !== 1 ? 's' : ''} in this period
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['7d', '30d', '90d', '1y'] as const).map(p => (
                <button key={p} onClick={() => setEnrollPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${enrollPeriod === p ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {enrollLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <div className="w-full h-full bg-gray-100 rounded-xl animate-skeleton-pulse" />
            </div>
          ) : !enrollHistory || enrollHistory.totalEnrollments === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <GraduationCap size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">No enrollments yet</p>
              <p className="text-xs text-gray-300 mt-1">
                {totalStudents !== null ? `${totalStudents.toLocaleString()} total students enrolled` : 'Enrol students to see data here'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={enrollChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  interval={enrollPeriod === '30d' ? 4 : 0} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<EnrollmentTooltip />} />
                <Bar dataKey="count" name="Enrollments" fill={chartColors.primary} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Academic Performance donut — real grade distribution */}
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-card-title text-gray-900">Academic Performance</h3>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-2.5 py-1">
              {overview?.currentTerm?.name ?? 'All terms'}
            </span>
          </div>
          {gradeLoading ? (
            <div className="flex items-center justify-center h-[220px]">
              <div className="w-40 h-40 rounded-full bg-gray-100 animate-skeleton-pulse" />
            </div>
          ) : !gradeDist || gradeDist.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-center">
              <BarChart3 size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">No published results yet</p>
              <p className="text-xs text-gray-300 mt-1">Grade distribution will appear once results are published</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                      paddingAngle={3} dataKey="value">
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900 tabular-nums">{gradeDist.total.toLocaleString()}</span>
                  <span className="text-xs text-gray-400">Results</span>
                </div>
              </div>
              <div className="w-full mt-3 space-y-1.5">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700 tabular-nums">{d.percent.toFixed(1)}%</span>
                      <span className="text-gray-400">({d.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions + Recent Activity ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <h3 className="text-card-title text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {([
              { label: 'Add Student',       icon: UserPlus,    color: 'text-primary-600', bg: 'bg-primary-50', to: '/students/new'       },
              { label: 'Add Teacher',       icon: UserCheck,   color: 'text-success-600', bg: 'bg-success-50', to: '/teachers/new'       },
              { label: 'Create Assessment', icon: FileText,    color: 'text-warning-600', bg: 'bg-warning-50', to: '/assessments/new'    },
              { label: 'Publish Results',   icon: BarChart2,   color: 'text-info-600',    bg: 'bg-info-50',    to: '/results'            },
              { label: 'Promote Students',  icon: TrendingUp,  color: 'text-primary-600', bg: 'bg-primary-50', to: '/students'           },
              { label: 'Export Broadsheet', icon: ArrowUpRight,color: 'text-gray-600',    bg: 'bg-gray-100',   to: '/results/broadsheet' },
            ] as const).map(a => (
              <button key={a.label} onClick={() => navigate(a.to)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.bg} group-hover:scale-105 transition-transform`}>
                  <a.icon size={22} className={a.color} />
                </div>
                <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity — real audit logs */}
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-card-title text-gray-900">Recent Activity</h3>
            <button onClick={() => navigate('/audit-logs')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="space-y-3">
            {recentLogs.length > 0 ? recentLogs.map(log => {
              const meta = activityMeta(log.action, log.entityType);
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <meta.icon size={15} className={meta.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">
                      <span className="font-semibold">{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}</span>
                      {' '}{meta.label} <span className="text-gray-400">{log.entityType}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{relativeTime(log.createdAt)}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <ClipboardCheck size={28} className="text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No activity yet. Start by adding students or classes.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Classes Overview + School Overview ───────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

        {/* Real classes */}
        <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-card-title text-gray-900">Classes Overview</h3>
            <button onClick={() => navigate('/classes')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          {classesLoading ? (
            <div className="px-6 py-8 text-sm text-gray-400 text-center">Loading classes…</div>
          ) : classes.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <School size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No classes yet.</p>
              <button onClick={() => navigate('/classes/new')} className="mt-3 text-xs font-medium text-primary-600 hover:underline">Create a class</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    {['Class', 'Teacher', 'Students', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {classes.map(cls => (
                    <tr key={cls.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate('/classes')}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{cls.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {cls.classTeacher ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">{cls._count?.enrollments ?? 0}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cls.isActive ? 'success' : 'gray'}>{cls.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* School Overview — real subscription */}
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <h3 className="text-card-title text-gray-900 mb-4">School Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <CalendarDays size={15} className="text-gray-400" /><span>Academic Session</span>
              </div>
              <span className="text-sm font-medium text-gray-800">
                {overview?.activeSession?.name ?? (kpiLoading ? '…' : '—')}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <BookOpen size={15} className="text-gray-400" /><span>Current Term</span>
              </div>
              <span className="text-sm font-medium text-gray-800">
                {overview?.currentTerm?.name ?? (kpiLoading ? '…' : '—')}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <CreditCard size={15} className="text-gray-400" /><span>Plan</span>
              </div>
              <span className="text-sm font-semibold text-primary-600">{planName ?? '—'}</span>
            </div>
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <div className="flex items-center gap-2.5 text-gray-600">
                  <BarChart3 size={15} className="text-gray-400" /><span>Storage</span>
                </div>
                <span className="text-gray-500 text-xs">{storageGB ? `${storageGB >= 9999 ? 'Unlimited' : `${storageGB} GB`} plan` : '—'}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full" />
            </div>
            {maxUsers !== null && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <Users size={15} className="text-gray-400" /><span>User limit</span>
                  </div>
                  <span className="text-gray-500 text-xs">{maxUsers >= 999999 ? 'Unlimited' : `Up to ${maxUsers}`}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full" />
              </div>
            )}
          </div>
          <button onClick={() => navigate('/subscriptions')}
            className="mt-4 w-full text-center text-xs font-semibold text-primary-600 hover:text-primary-700 py-2 border border-primary-200 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors">
            View Subscription
          </button>
        </div>
      </div>

      {/* ── Assessment Progress + Announcements ──────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 pb-6">

        {/* Assessment progress — real counts */}
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-card-title text-gray-900">Assessment Progress</h3>
              <p className="text-xs text-gray-400 mt-0.5">Current term completion status</p>
            </div>
            <button onClick={() => navigate('/assessments')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          {totalAssessments === null && totalResults === null ? (
            <div className="space-y-5">
              {[1, 2].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-4 w-36 bg-gray-100 rounded animate-skeleton-pulse" />
                    <div className="h-4 w-10 bg-gray-100 rounded animate-skeleton-pulse" />
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded animate-skeleton-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <ProgressBar
                label="Assessments Published"
                value={assessPct}
                color="bg-primary-600"
                sub={totalAssessments !== null
                  ? `${assessPublishedCount ?? 0} of ${totalAssessments} published`
                  : undefined}
              />
              <ProgressBar
                label="Results Published"
                value={resultsPct}
                color={resultsPct >= 80 ? 'bg-success-500' : resultsPct >= 50 ? 'bg-warning-500' : 'bg-primary-600'}
                sub={totalResults !== null
                  ? `${publishedResults ?? 0} of ${totalResults} results published`
                  : undefined}
              />
            </div>
          )}
        </div>

        {/* Announcements — real data from API */}
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-card-title text-gray-900">Announcements</h3>
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-gray-400" />
            </div>
          </div>
          {announcementsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 animate-skeleton-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 bg-gray-200 rounded animate-skeleton-pulse" />
                    <div className="h-3 w-1/3 bg-gray-100 rounded animate-skeleton-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No announcements yet.</p>
              <p className="text-xs text-gray-300 mt-1">Post announcements to keep staff informed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Megaphone size={15} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                      <Clock size={10} />
                      <span>{new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
