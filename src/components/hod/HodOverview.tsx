import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileCheck,
  Clock,
  TrendingUp,
  Search,
  Bell,
  Calendar,
  Building,
  ChevronRight,
  Zap,
  Menu,
  Briefcase,
  Upload,
} from 'lucide-react';
import { toast } from '../common/Toast.tsx';

interface HodOverviewProps {
  data: any;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: any) => void;
  userName?: string;
  departmentName?: string;
  departmentOptions?: string[];
  onDepartmentChange?: (dept: string) => void;
}

export const HodOverview: React.FC<HodOverviewProps> = ({
  data,
  loading,
  onRefresh,
  onNavigateTab,
  userName = 'Prof. Bhavik',
  departmentName = 'Computer Science & Engineering',
}) => {
  // Stats
  const stats = data?.stats || {
    totalStudents: 0,
    studentsDelta: '0 Active',
    studentsSubtext: 'Active in Department',
    totalFaculty: 0,
    facultyDelta: '0 Active',
    facultySubtext: 'Working in Department',
    totalAssignments: 0,
    assignmentsDelta: '0 Total',
    assignmentsSubtext: 'Created this Semester',
    totalSubmissions: 0,
    submissionsDelta: '0 Received',
    submissionsSubtext: 'From all Students',
    pendingEvaluations: 0,
    pendingDelta: '0 Queue',
    pendingSubtext: 'Needs Review',
    avgDepartmentScore: 0,
    scoreDelta: 'Benchmark',
    scoreSubtext: 'Overall Performance',
  };

  const facultyWorkload = Array.isArray(data?.facultyWorkload) ? data.facultyWorkload : [];
  const pendingEvaluationsList = Array.isArray(data?.pendingEvaluationsList) ? data.pendingEvaluationsList : [];
  const upcomingDeadlines = Array.isArray(data?.upcomingDeadlines) ? data.upcomingDeadlines : [];

  // Dynamic Live Submission Trend (6 months)
  const submissionTrend = Array.isArray(data?.submissionTrend) && data.submissionTrend.length > 0 ? data.submissionTrend : [
    { month: 'Aug', submissions: 0, evaluations: 0 },
    { month: 'Sep', submissions: 0, evaluations: 0 },
    { month: 'Oct', submissions: stats.totalSubmissions || 0, evaluations: 0 },
    { month: 'Nov', submissions: 0, evaluations: 0 },
    { month: 'Dec', submissions: 0, evaluations: 0 },
    { month: 'Jan', submissions: 0, evaluations: 0 },
  ];

  // Dynamic Live Submission Status Breakdown
  const submissionStatus = data?.submissionStatus || {
    total: stats.totalAssignments || 0,
    received: stats.totalSubmissions || 0,
    receivedPercent: stats.totalAssignments > 0 ? Math.round(((stats.totalSubmissions || 0) / stats.totalAssignments) * 100) : 0,
    pending: stats.pendingEvaluations || 0,
    pendingPercent: stats.totalAssignments > 0 ? Math.round(((stats.pendingEvaluations || 0) / stats.totalAssignments) * 100) : 0,
    activeLabs: stats.totalAssignments || 0,
    activeLabsPercent: stats.totalAssignments > 0 ? 100 : 0,
  };

  // Dynamic Live Department Performance
  const departmentPerformance = Array.isArray(data?.departmentPerformance) ? data.departmentPerformance : [];

  // Calculate live dynamic coordinates for Submission Trend SVG Curve
  const trendMax = Math.max(
    ...submissionTrend.map((t: any) => Math.max(Number(t.submissions) || 0, Number(t.evaluations) || 0)),
    6
  );
  const yTick1 = trendMax;
  const yTick2 = Math.round(trendMax * 0.66);
  const yTick3 = Math.round(trendMax * 0.33);

  const getGraphX = (idx: number) => 50 + idx * 60; // 50, 110, 170, 230, 290, 350
  const getGraphY = (val: number) => 130 - (Math.min(trendMax, Math.max(0, val)) / trendMax) * 105;

  const subPoints = submissionTrend.map((t: any, i: number) => ({
    x: getGraphX(i),
    y: getGraphY(Number(t.submissions) || 0),
    val: Number(t.submissions) || 0,
    month: t.month,
  }));

  const evalPoints = submissionTrend.map((t: any, i: number) => ({
    x: getGraphX(i),
    y: getGraphY(Number(t.evaluations) || 0),
    val: Number(t.evaluations) || 0,
    month: t.month,
  }));

  // Build smooth cubic bezier curve
  const buildBezierPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const subLinePath = buildBezierPath(subPoints);
  const subAreaPath = `${subLinePath} L ${subPoints[subPoints.length - 1].x} 130 L ${subPoints[0].x} 130 Z`;
  const evalLinePath = buildBezierPath(evalPoints);

  // Dynamic Donut Angles
  const donutCircumference = 238.76;
  const receivedStroke = (Number(submissionStatus.receivedPercent || 86) / 100) * donutCircumference;
  const pendingStroke = (Number(submissionStatus.pendingPercent || 14) / 100) * donutCircumference;

  const handleExport = () => {
    toast.success('Department Report', `Generating live accreditation and performance summary for ${departmentName}...`);
  };

  return (
    <div className="space-y-5">
      {/* 1. STATS ROW (6 Cards exactly matching Image 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: TOTAL STUDENTS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
              {stats.studentsDelta || `${stats.totalStudents ?? 0} Active`}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            TOTAL STUDENTS
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {stats.totalStudents ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.studentsSubtext || 'Active in Department'}
          </div>
        </div>

        {/* Card 2: TOTAL FACULTY */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">
              {stats.facultyDelta || `${stats.totalFaculty ?? 0} Active`}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            TOTAL FACULTY
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {stats.totalFaculty ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.facultySubtext || 'Working in Department'}
          </div>
        </div>

        {/* Card 3: TOTAL ASSIGNMENTS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
              {stats.assignmentsDelta || `${stats.totalAssignments ?? 0} Total`}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            TOTAL ASSIGNMENTS
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {stats.totalAssignments ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.assignmentsSubtext || 'Created this Semester'}
          </div>
        </div>

        {/* Card 4: TOTAL SUBMISSIONS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-100">
              {stats.submissionsDelta || `${stats.totalSubmissions ?? 0} Received`}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            TOTAL SUBMISSIONS
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {stats.totalSubmissions ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.submissionsSubtext || 'From all Students'}
          </div>
        </div>

        {/* Card 5: PENDING EVALUATIONS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
              {stats.pendingDelta || `${stats.pendingEvaluations ?? 0} Queue`}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            PENDING EVALUATIONS
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {stats.pendingEvaluations ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.pendingSubtext || 'Needs Review'}
          </div>
        </div>

        {/* Card 6: AVG. DEPARTMENT SCORE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
              {stats.scoreDelta || 'Benchmark'}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            AVG. DEPARTMENT SCORE
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {stats.avgDepartmentScore != null ? stats.avgDepartmentScore : 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats.scoreSubtext || 'Overall Performance'}
          </div>
        </div>
      </div>

      {/* 3. MIDDLE ROW: Submission Trend (5 cols) + Assignment Status (4 cols) + Quick Actions (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Submission Trend (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Submission Trend</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Monthly submission and evaluation count
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Submissions
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-teal-400" /> Evaluations
              </span>
            </div>
          </div>

          {/* Dynamic Live Curve with Area Gradient Fill */}
          <div className="h-44 w-full pt-1">
            <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="emeraldCurveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="tealCurveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="30" y1="25" x2="380" y2="25" stroke="#f8fafc" strokeWidth="1" />
              <line x1="30" y1="60" x2="380" y2="60" stroke="#f8fafc" strokeWidth="1" />
              <line x1="30" y1="95" x2="380" y2="95" stroke="#f8fafc" strokeWidth="1" />
              <line x1="30" y1="130" x2="380" y2="130" stroke="#e2e8f0" strokeWidth="1" />

              {/* Dynamic Y-axis numbers */}
              <text x="14" y="28" fontSize="9" fill="#94a3b8">{yTick1}</text>
              <text x="14" y="63" fontSize="9" fill="#94a3b8">{yTick2}</text>
              <text x="14" y="98" fontSize="9" fill="#94a3b8">{yTick3}</text>
              <text x="14" y="133" fontSize="9" fill="#94a3b8">0</text>

              {/* Smooth dynamic submissions area fill */}
              {subAreaPath && (
                <path
                  d={subAreaPath}
                  fill="url(#emeraldCurveGradient)"
                  className="transition-all duration-700 ease-out"
                />
              )}

              {/* Smooth dynamic submissions line */}
              {subLinePath && (
                <path
                  d={subLinePath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              )}

              {/* Smooth dynamic evaluations line */}
              {evalLinePath && (
                <path
                  d={evalLinePath}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              )}

              {/* Dynamic Submissions data points */}
              {subPoints.map((p, i) => (
                <g key={`sub-pt-${i}`}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.val > 0 ? 3.5 : 2}
                    fill="#059669"
                    className="transition-all duration-700"
                  >
                    <title>{`${p.month}: ${p.val} Submissions`}</title>
                  </circle>
                  {p.val > 0 && (
                    <text
                      x={p.x}
                      y={p.y - 6}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="#047857"
                    >
                      {p.val}
                    </text>
                  )}
                </g>
              ))}

              {/* Dynamic X-axis months */}
              {subPoints.map((p, i) => (
                <text key={`m-${i}`} x={p.x} y="145" fontSize="9" textAnchor="middle" fill="#94a3b8">
                  {p.month}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Assignment Status (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Assignment Status</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time status of departmental coursework
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            {/* Dynamic Donut Chart */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                {/* Green segment (Received) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${receivedStroke} ${donutCircumference}`}
                  strokeDashoffset="0"
                  fill="none"
                  className="transition-all duration-700 ease-out"
                />
                {/* Orange segment (Pending) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${pendingStroke} ${donutCircumference}`}
                  strokeDashoffset={String(-receivedStroke)}
                  fill="none"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  {submissionStatus.total}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Total
                </span>
              </div>
            </div>

            {/* Legend with dynamic live numbers */}
            <div className="space-y-2.5 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Submissions Received
                </span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {submissionStatus.received} ({submissionStatus.receivedPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pending Submissions
                </span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {submissionStatus.pending} ({submissionStatus.pendingPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Active Labs
                </span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {submissionStatus.activeLabs} ({submissionStatus.activeLabsPercent}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Quick Actions</span>
          </h2>

          <div className="space-y-2">
            <button
              onClick={() => onNavigateTab('faculty')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span>View All Faculty</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateTab('students')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-teal-50/70 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>View All Students</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateTab('evaluations')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>View Pending Evaluations</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleExport}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Generate Department Report</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. ROW 3: Faculty Performance (7 cols) + Pending Evaluations (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Faculty Performance */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Faculty Performance</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Workload and evaluation status of faculty members
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('faculty')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[290px] pr-1">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-2 font-medium">FACULTY</th>
                  <th className="pb-2 font-medium">SUBJECTS</th>
                  <th className="pb-2 font-medium text-center">ASSIGNMENTS</th>
                  <th className="pb-2 font-medium text-center">SUBMISSIONS</th>
                  <th className="pb-2 font-medium text-center">EVALUATED</th>
                  <th className="pb-2 font-medium text-center">PENDING</th>
                  <th className="pb-2 font-medium text-right">PERFORMANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facultyWorkload.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No faculty members found for this department.
                    </td>
                  </tr>
                ) : (
                  facultyWorkload.map((faculty: any) => (
                    <tr key={faculty.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full ${
                              faculty.avatarBg || 'bg-blue-600'
                            } text-white font-bold text-[10px] flex items-center justify-center shrink-0`}
                          >
                            {faculty.initials || 'PP'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate text-[11px]">
                              {faculty.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate font-mono">
                              {faculty.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600 font-medium text-[11px]">
                        {faculty.subjects}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-800 text-[11px]">
                        {faculty.assignmentsCount}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-800 text-[11px]">
                        {faculty.submissionsCount}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-800 text-[11px]">
                        {faculty.evaluatedCount ?? 0}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-800 text-[11px]">
                        {faculty.pendingEvaluationsCount}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                          {faculty.performanceScore || 100}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Evaluations */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Pending Evaluations</span>
            </h2>
            <button
              onClick={() => onNavigateTab('evaluations')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[290px] pr-1 flex-1">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-2 font-medium">ASSIGNMENT</th>
                  <th className="pb-2 font-medium">FACULTY</th>
                  <th className="pb-2 font-medium text-center">SUBMITTED</th>
                  <th className="pb-2 font-medium text-center">PENDING</th>
                  <th className="pb-2 font-medium text-left">PENDING STUDENTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingEvaluationsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No pending evaluations in queue. All submissions have been reviewed.
                    </td>
                  </tr>
                ) : (
                  pendingEvaluationsList.map((item: any) => {
                    const subCount = item.submittedCount ?? item.submitted_count ?? item.submissions ?? 0;
                    const pendCount = item.pendingCount ?? item.pending_count ?? item.pending ?? 0;
                    const pendingSummary = item.pendingNamesSummary || (pendCount > 0 ? `${pendCount} Students Pending` : 'All Completed');
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 pr-2 font-semibold text-slate-800 text-[11px] truncate max-w-[120px]">
                          <div className="truncate" title={item.title}>{item.title}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">{item.subject}</div>
                        </td>
                        <td className="py-2.5 text-slate-600 text-[11px] truncate max-w-[80px]">
                          {item.faculty}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{subCount} Submitted</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pendCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pendCount > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} />
                            <span>{pendCount} Pending</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-left text-[11px] max-w-[130px]">
                          <span
                            className={`truncate block font-semibold ${
                              pendCount > 0 ? 'text-amber-800' : 'text-emerald-700'
                            }`}
                            title={pendingSummary}
                          >
                            {pendingSummary}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. ROW 4: Upcoming Deadlines (7 cols) + Department Performance (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Upcoming Deadlines */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Upcoming Deadlines</span>
            </h2>
            <button
              onClick={() => onNavigateTab('assignments')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
            >
              View Calendar
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[210px] pr-1">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-2 font-medium">ASSIGNMENT</th>
                  <th className="pb-2 font-medium">SUBJECT</th>
                  <th className="pb-2 font-medium">FACULTY</th>
                  <th className="pb-2 font-medium">CLASS</th>
                  <th className="pb-2 font-medium">DEADLINE</th>
                  <th className="pb-2 font-medium text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingDeadlines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No upcoming coursework deadlines scheduled.
                    </td>
                  </tr>
                ) : (
                  upcomingDeadlines.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 pr-2 font-semibold text-slate-800 text-[11px] truncate">
                        {item.title}
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px] truncate">
                        {item.subject}
                      </td>
                      <td className="py-2.5 text-slate-600 text-[11px] truncate">
                        {item.faculty}
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px]">
                        {item.class}
                      </td>
                      <td className="py-2.5 text-slate-400 text-[11px]">
                        {item.deadline}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Performance (CS, CSE or dynamic subjects) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Department Performance</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time department completion &amp; benchmark rate
            </p>
          </div>

          {/* Dynamic Vertical Bars */}
          <div className="h-44 w-full flex items-end justify-center gap-12 px-6 pt-4 pb-2">
            {departmentPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department benchmark data available yet.
              </div>
            ) : (
              departmentPerformance.map((item: any) => (
                <div key={item.subject} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-bold text-slate-700">
                    {item.score}%
                  </span>
                  <div className="w-14 bg-slate-100 rounded-t-xl h-28 flex items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-500 transition-all duration-500 shadow-2xs"
                      style={{ height: `${Math.min(100, Math.max(10, item.score))}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {item.subject}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Bottom Footer subtext */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{departmentName || 'Computer Science'}</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {stats.avgDepartmentScore ?? 0}% Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
