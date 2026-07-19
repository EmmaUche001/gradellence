import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  School, BookOpen, Users, ClipboardCheck, FileText,
  BarChart2, ArrowUpRight, Calendar, TrendingUp,
  UserPlus, CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { teacherService } from '../../../services/teacherService';
import { auditLogService } from '../../../services/auditLogService';
import { Badge } from '../../../components/ui/Badge';
import { SkeletonKpiCard, SkeletonCard } from '../../../components/ui/SkeletonLoader';
import type { AuditLog } from '../../../types/auditLog';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function activityMeta(action: string, entityType: string) {
  if (action.includes('CREATE') && entityType === 'Assessment')
    return { icon: FileText,  bg: 'bg-warning-50', iconColor: 'text-warning-600', label: 'created an assessment' };
  if (action.includes('PUBLISH'))
    return { icon: BarChart2,  bg: 'bg-success-50', iconColor: 'text-success-600', label: 'published results' };
  if (action.includes('UPDATE'))
    return { icon: CheckCircle2, bg: 'bg-primary-50', iconColor: 'text-primary-600', label: 'updated' };
  return { icon: ClipboardCheck, bg: 'bg-gray-100', iconColor: 'text-gray-500', label: action.toLowerCase().replace(/_/g, ' ') };
}

interface KpiProps { icon: React.ReactNode; iconBg: string; title: string; value: string | number; sub?: string; to?: string }
function KpiCard({ icon, iconBg, title, value, sub, to }: KpiProps) {
  const navigate = useNavigate();
  return (
    <div onClick={() => to && navigate(to)}
      className={`bg-surface rounded-card p-5 shadow-sm border border-border transition-all duration-150 ${to ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [profile, setProfile]     = useState<any>(null);
  const [profileLoading, setLoad] = useState(true);
  const [recentLogs, setLogs]     = useState<AuditLog[]>([]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    teacherService.getMyProfile()
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoad(false));

    auditLogService.getAll(1, 5)
      .then(r => setLogs(r.data ?? []))
      .catch(() => {});
  }, []);

  const stats        = profile?.stats;
  const teacher      = profile?.teacher;
  const assignments  = teacher?.subjectAssignments ?? [];
  const classTeacher = teacher?.classTeacher ?? null;

  // Group assignments by class
  const classSummary: Record<string, { className: string; subjects: string[] }> = {};
  for (const a of assignments) {
    const cid = a.class?.id;
    if (!cid) continue;
    if (!classSummary[cid]) classSummary[cid] = { className: a.class.name, subjects: [] };
    classSummary[cid].subjects.push(a.subject.name);
  }
  const classSummaryList = Object.values(classSummary).slice(0, 5);

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.firstName ?? 'Teacher'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {classTeacher ? `Class teacher of ${classTeacher.name}` : 'Welcome back to Gradellence.'}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
            <Calendar size={13} /><span>{today}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button onClick={() => navigate('/assessments/new')}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium bg-primary-600 text-white rounded-btn hover:bg-primary-700 transition-colors">
            <ClipboardCheck size={16} /> Enter Scores
          </button>
          <button onClick={() => navigate('/results')}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium bg-surface text-primary-600 border border-primary-600 rounded-btn hover:bg-primary-50 transition-colors">
            <BarChart2 size={16} /> View Results
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {profileLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)
        ) : (
          <>
            <KpiCard icon={<School size={20} className="text-primary-600" />} iconBg="bg-primary-50"
              title="My Classes" value={stats?.classCount ?? 0}
              sub={classTeacher ? `Class teacher: ${classTeacher.name}` : undefined}
              to="/classes" />
            <KpiCard icon={<Users size={20} className="text-success-600" />} iconBg="bg-success-50"
              title="My Students" value={(stats?.studentCount ?? 0).toLocaleString()}
              sub="Across all assigned classes" />
            <KpiCard icon={<BookOpen size={20} className="text-info-600" />} iconBg="bg-info-50"
              title="Subjects" value={assignments.length}
              sub="Subject assignments" to="/subjects" />
            <KpiCard icon={<ClipboardCheck size={20} className="text-warning-600" />} iconBg="bg-warning-50"
              title="Assessments"
              value={stats?.totalAssessments ?? 0}
              sub={stats?.pendingAssessments ? `${stats.pendingAssessments} pending` : 'All submitted'}
              to="/assessments" />
          </>
        )}
      </div>

      {/* My Classes + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

        {/* My Classes */}
        <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-card-title text-gray-900">My Classes & Subjects</h3>
            <button onClick={() => navigate('/classes')} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          {profileLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>
          ) : classSummaryList.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <School size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No classes assigned yet.</p>
              <p className="text-xs text-gray-300 mt-1">Contact your school admin to get assigned.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    {['Class', 'Subjects', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {classSummaryList.map(cls => (
                    <tr key={cls.className} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{cls.className}</p>
                          {classTeacher?.name === cls.className && (
                            <Badge variant="primary">Class Teacher</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {cls.subjects.slice(0, 3).map(s => (
                            <Badge key={s} variant="gray">{s}</Badge>
                          ))}
                          {cls.subjects.length > 3 && (
                            <Badge variant="gray">+{cls.subjects.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="success">Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-card-title text-gray-900">Recent Activity</h3>
            <button onClick={() => navigate('/audit-logs')} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
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
                      {' '}{meta.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{relativeTime(log.createdAt)}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <ClipboardCheck size={28} className="text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface rounded-card p-6 shadow-sm border border-border">
        <h3 className="text-card-title text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Enter Scores',    icon: ClipboardCheck, color: 'text-primary-600', bg: 'bg-primary-50', to: '/assessments/new' },
            { label: 'View Results',    icon: BarChart2,       color: 'text-success-600', bg: 'bg-success-50', to: '/results'         },
            { label: 'My Students',     icon: UserPlus,        color: 'text-warning-600', bg: 'bg-warning-50', to: '/students'        },
            { label: 'Analytics',       icon: TrendingUp,      color: 'text-info-600',    bg: 'bg-info-50',    to: '/analytics'       },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.to)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.bg} group-hover:scale-105 transition-transform`}>
                <a.icon size={22} className={a.color} />
              </div>
              <span className="text-xs font-medium text-gray-600 text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
