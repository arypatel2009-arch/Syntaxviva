import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';
import { StatCard, CircularProgress } from '../common/UIComponents.tsx';
import { api } from '../../lib/api.ts';

export const FacultyAnalyticsView: React.FC = () => {
  const [stats, setStats] = useState<{
    totalAssignments: number;
    totalStudents: number;
    totalSubmissions: number;
    completedAttempts: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then((res) => {
        if (res?.stats) {
          setStats(res.stats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const completedAttempts = stats?.completedAttempts ?? 0;
  const completionRate = totalSubmissions > 0 ? Math.min(100, Math.round((completedAttempts / totalSubmissions) * 100)) : 0;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Analytics & Learning Insights
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Objective comprehension metrics, completion rates, and cohort performance.
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Total Submissions"
          value={totalSubmissions}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Completed Attempts"
          value={completedAttempts}
          icon={Award}
          color="emerald"
        />
        <StatCard
          label="Enrolled Students"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          color="amber"
        />
        <StatCard
          label="Total Assignments"
          value={stats?.totalAssignments ?? 0}
          icon={BarChart3}
          color="purple"
        />
      </div>

      {/* Main Content */}
      {totalSubmissions === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-2xs">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No Analytics Data Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cohort performance metrics, completion trends, and verification insights will automatically populate here as students submit their assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Cohort Execution Summary</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Total Submissions Recorded</span>
                <span className="font-mono font-bold text-slate-900">{totalSubmissions}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Completed & Evaluated</span>
                <span className="font-mono font-bold text-emerald-700">{completedAttempts}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Evaluation Method</span>
                <span className="font-mono font-bold text-slate-900">Deterministic Sandbox</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Completion Index</h2>
              <p className="text-xs text-slate-500">Cohort evaluation rate</p>
            </div>

            <div className="py-2">
              <CircularProgress
                value={completionRate}
                size={150}
                strokeWidth={14}
                label={`${completionRate}%`}
                sublabel="Completion Rate"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
