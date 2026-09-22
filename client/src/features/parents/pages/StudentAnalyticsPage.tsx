import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, BookOpen, AlertCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { parentDashboard } from '../services/parentApi';
import { ParentPortalLayout } from '../components/ParentPortalLayout';
import { KpiCard } from '../../../components/ui/KpiCard';
import { Card, CardHeader } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonKpiCard, SkeletonChart } from '../../../components/ui/SkeletonLoader';
import { chartColors } from '../../../lib/tokens';

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

function perfColor(avg: number): string {
  if (avg >= 70) return 'bg-success-500';
  if (avg >= 50) return 'bg-warning-500';
  return 'bg-danger-500';
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-gray-600">Average: <span className="font-bold text-gray-900">{payload[0].value}%</span></p>
    </div>
  );
}

const StudentAnalyticsPage: React.FC = () => {
  const { studentId }         = useParams<{ studentId: string }>();
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!studentId) return;
    parentDashboard.getStudentAnalytics(studentId)
      .then(setData)
      .catch(err => setError(err?.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const overallAvg = data?.termAverages.length
    ? data.termAverages.reduce((s, t) => s + t.average, 0) / data.termAverages.length
    : null;

  const chartData = data?.termAverages.map(t => ({
    name: t.term, avg: +t.average.toFixed(1),
  })) ?? [];

  return (
    <ParentPortalLayout pageTitle="Student Analytics" showBack>
      <div className="space-y-6">
        <div>
          <h1 className="text-page-title text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Academic performance trends over time</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
            <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        {loading ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <SkeletonKpiCard /><SkeletonKpiCard />
            </div>
            <SkeletonChart />
          </>
        ) : !data ? (
          <div className="bg-surface rounded-card border border-border">
            <EmptyState icon={<TrendingUp size={40} />} title="No analytics yet"
              description="Analytics will be available once results are published." />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4">
              <KpiCard title="Total Subjects" value={data.totalSubjects}
                icon={<BookOpen size={20} className="text-primary-600" />} iconColor="bg-primary-50 text-primary-600" />
              {overallAvg !== null && (
                <KpiCard title="Overall Average" value={`${overallAvg.toFixed(1)}%`}
                  trend={overallAvg >= 70 ? 'up' : overallAvg >= 50 ? 'neutral' : 'down'}
                  icon={<TrendingUp size={20} className={overallAvg >= 70 ? 'text-success-600' : 'text-warning-600'} />}
                  iconColor={overallAvg >= 70 ? 'bg-success-50' : 'bg-warning-50'} />
              )}
            </div>

            {/* Trend chart */}
            {chartData.length > 1 && (
              <Card>
                <CardHeader title="Average Score by Term" description="Performance trend across terms" />
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="avg" name="Average"
                      stroke={chartColors.primary} strokeWidth={2.5}
                      dot={{ r: 4, fill: chartColors.primary, strokeWidth: 0 }} activeDot={{ r: 6 }}
                      animationDuration={1200} animationEasing="ease-out" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Term-by-term breakdown */}
            <div className="space-y-4">
              {data.termAverages.map((ta, i) => (
                <div key={i} className="bg-surface rounded-card p-5 shadow-sm border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">{ta.term}</h3>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{ta.average.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${perfColor(ta.average)}`}
                      style={{ width: `${Math.min(ta.average, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{ta.subjects} subject{ta.subjects !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ParentPortalLayout>
  );
};

export default StudentAnalyticsPage;
