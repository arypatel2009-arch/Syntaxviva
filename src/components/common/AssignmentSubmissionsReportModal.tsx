import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Home,
  ChevronRight,
  ChevronDown,
  Calendar,
  Download,
  Code2,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  Trophy,
  Users,
  Search,
  SlidersHorizontal,
  Eye,
  MoreVertical,
  ChevronLeft,
  RefreshCw,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { LargeSubmissionResultModal } from './LargeSubmissionResultModal.tsx';
import { toast } from './UIComponents.tsx';
import { api } from '../../lib/api.ts';

interface AssignmentSubmissionsReportModalProps {
  assignmentId: string;
  onClose: () => void;
  onSelectAssignment?: (newAssignmentId: string) => void;
}

// Circular Donut Progress Ring
const DonutRing: React.FC<{ percentage: number; strokeColor: string; bgColor?: string }> = ({
  percentage,
  strokeColor,
  bgColor = '#f1f5f9',
}) => {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <svg className="w-12 h-12 -rotate-90 shrink-0" viewBox="0 0 44 44">
      <circle
        cx="22"
        cy="22"
        r={radius}
        stroke={bgColor}
        strokeWidth="4"
        fill="transparent"
      />
      <circle
        cx="22"
        cy="22"
        r={radius}
        stroke={strokeColor}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        fill="transparent"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
};

// Smooth Sparkline Graph for Pass Rate
const SparklineGraph: React.FC<{ color?: string }> = ({ color = '#10b981' }) => (
  <svg className="w-16 h-8 shrink-0 overflow-visible" viewBox="0 0 64 28">
    <defs>
      <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.28" />
        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
      </linearGradient>
    </defs>
    <path
      d="M 2 24 Q 16 26 26 15 T 46 11 T 62 4"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M 2 24 Q 16 26 26 15 T 46 11 T 62 4 L 62 28 L 2 28 Z"
      fill="url(#sparklineGrad)"
    />
    <circle cx="62" cy="4" r="2.5" fill={color} />
  </svg>
);

// Format submission timestamp as "Nov 30, 2026 • 10:24 AM"
function formatSubmissionDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} • ${timePart}`;
}

// Generate two-letter uppercase initials for avatar
function getInitials(name: string): string {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const AssignmentSubmissionsReportModal: React.FC<AssignmentSubmissionsReportModalProps> = ({
  assignmentId,
  onClose,
  onSelectAssignment,
}) => {
  const { user } = useAuth();
  const [currentAsgId, setCurrentAsgId] = useState<string>(assignmentId);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [inspectingSubmission, setInspectingSubmission] = useState<any | null>(null);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [isAsgDropdownOpen, setIsAsgDropdownOpen] = useState(false);
  const asgDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (asgDropdownRef.current && !asgDropdownRef.current.contains(e.target as Node)) {
        setIsAsgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadReport = async (idToLoad: string) => {
    setLoading(true);
    try {
      const res = await api.getAssignmentStudentsReport(idToLoad);
      setData(res);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load assignment report:', err);
      toast.error('Failed to load assignment report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(currentAsgId);
  }, [currentAsgId]);

  const assignment = data?.assignment || {};
  const stats = data?.stats || {
    totalStudents: 0,
    completedCount: 0,
    pendingCount: 0,
    passedCount: 0,
    failedCount: 0,
    passRate: 0,
  };
  const allAssignments: any[] = data?.allAssignments || [];
  const rawStudents: any[] = data?.students || [];

  // Percentage calculations
  const totalStudents = stats.totalStudents || rawStudents.length || 0;
  const completedCount = stats.completedCount || 0;
  const pendingCount = stats.pendingCount || Math.max(0, totalStudents - completedCount);
  const failedCount = stats.failedCount || 0;
  const passedCount = stats.passedCount || Math.max(0, completedCount - failedCount);

  const submittedPct = totalStudents > 0 ? ((completedCount / totalStudents) * 100).toFixed(1) : '0';
  const pendingPct = totalStudents > 0 ? ((pendingCount / totalStudents) * 100).toFixed(1) : '0';
  const failedPct =
    completedCount > 0
      ? ((failedCount / completedCount) * 100).toFixed(1)
      : totalStudents > 0
      ? ((failedCount / totalStudents) * 100).toFixed(1)
      : '0';
  const passRate =
    stats.passRate !== undefined && stats.passRate !== null
      ? stats.passRate
      : completedCount > 0
      ? Math.round((passedCount / completedCount) * 100)
      : 0;

  // Filtered Students (Real-time live filtering)
  const filteredStudents = useMemo(() => {
    return rawStudents.filter((s) => {
      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const matches =
          (s.name || '').toLowerCase().includes(q) ||
          (s.rollNumber || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.divisionId || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter === 'submitted' && !s.isCompleted) return false;
      if (statusFilter === 'pending' && s.isCompleted) return false;
      if (statusFilter === 'failed' && (!s.isCompleted || !s.isFailed)) return false;

      return true;
    });
  }, [rawStudents, search, statusFilter]);

  // Pagination calculation
  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize;
  const endIdx = Math.min(totalFiltered, startIdx + pageSize);
  const paginatedStudents = filteredStudents.slice(startIdx, endIdx);

  // Faculty Display Information
  const facultyName = user?.name
    ? user.name.toLowerCase().startsWith('prof')
      ? user.name
      : `Prof. ${user.name}`
    : 'Prof. Bhavik';

  // Excel Export Handler (.csv with UTF-8 BOM)
  const handleExportExcel = () => {
    if (!data || !data.students || data.students.length === 0) {
      toast.info('No students found to export.');
      return;
    }

    setDownloadingExcel(true);
    try {
      const BOM = '\uFEFF';
      const headers = [
        '#',
        'Student Name',
        'Roll Number',
        'Student Email',
        'Division',
        'Institution / College',
        'Assignment Title',
        'Language',
        'Submission Status',
        'Marks (%)',
        'Phase 1 Viva Score',
        'Phase 2 Debug Score',
        'Tests Passed',
        'Tests Total',
        'Submitted Date & Time',
        'Viva & Debug Summary',
        'Failure / Defect Notes',
      ];

      const rows = data.students.map((s: any, idx: number) => {
        const isCompleted = Boolean(s.isCompleted);
        const sub = s.submission || {};
        const marksStr = isCompleted
          ? s.score !== null && s.score !== undefined
            ? `${s.score} / 100`
            : s.isPassed
            ? '100 / 100'
            : '34 / 100'
          : '—';

        return [
          idx + 1,
          `"${(s.name || 'Student').replace(/"/g, '""')}"`,
          `"${(s.rollNumber || '—').replace(/"/g, '""')}"`,
          `"${(s.email || '').replace(/"/g, '""')}"`,
          `"${(s.divisionId || 'DIV A').replace(/"/g, '""')}"`,
          `"${(s.institution || 'Academic Institute').replace(/"/g, '""')}"`,
          `"${(assignment.title || '').replace(/"/g, '""')}"`,
          `"${(assignment.language || 'python').replace(/"/g, '""')}"`,
          `"${isCompleted ? (s.isPassed ? 'Submitted' : s.isFailed ? 'Failed' : 'Submitted') : 'Pending'}"`,
          `"${marksStr}"`,
          `"${s.phase1Score !== null && s.phase1Score !== undefined ? `${s.phase1Score}%` : '—'}"`,
          `"${s.phase2Score !== null && s.phase2Score !== undefined ? `${s.phase2Score}%` : '—'}"`,
          s.testsPassed ?? (s.isPassed ? 1 : 0),
          s.testsTotal ?? (s.isPassed ? 1 : 1),
          `"${isCompleted ? formatSubmissionDate(s.submittedAt) : '—'}"`,
          `"${(sub.summary || (isCompleted ? 'Viva evaluation completed' : 'Awaiting student attempt')).replace(/"/g, '""')}"`,
          `"${(sub.failureReason || 'None').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent =
        BOM + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (assignment.title || 'Assignment')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      link.setAttribute(
        'download',
        `${safeTitle}_Submissions_Report_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(
        'Report Downloaded',
        `Exported ${rows.length} student records for "${assignment.title}".`
      );
    } catch (err) {
      console.error('Failed to export assignment excel:', err);
      toast.error('Failed to export report.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Open Full-Screen Code Dossier & Result (Badi Screen)
  const handleOpenStudentDossier = (s: any) => {
    if (s.submission) {
      setInspectingSubmission(s.submission);
    } else {
      // Pending student fallback dossier
      setInspectingSubmission({
        id: `pending-${s.id}`,
        studentName: s.name,
        studentRollNumber: s.rollNumber,
        studentEmail: s.email,
        assignmentTitle: assignment.title,
        language: assignment.language,
        state: 'PENDING',
        phase2Status: 'PENDING',
        score: 0,
        submittedAt: null,
        submittedCode: '// Student has not submitted this assignment yet.\n// Status: Pending in division roster.',
        originalCode: assignment.description || '// Awaiting student Phase 1 solution.',
        summary: 'Student is enrolled in this coursework and submission is currently pending.',
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden">
          {/* 1. TOP BREADCRUMB & FACULTY HEADER BAR */}
          <div className="px-6 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 shrink-0">
            {/* Breadcrumb Left */}
            <div className="flex items-center gap-2 text-xs">
              <span className="p-1 rounded-md text-slate-700 hover:bg-slate-100 transition flex items-center">
                <Home className="w-4 h-4 text-slate-800" />
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 font-medium hover:text-slate-900 transition">
                Assignments
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-bold">Assignment Submissions</span>
            </div>

            {/* Right Controls: Deadline, Download Report, Faculty Badge, Close */}
            <div className="flex items-center gap-3.5 shrink-0">
              {/* Deadline */}
              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>
                  Deadline: <span className="text-slate-900 font-bold">{assignment.dueDate || '2026-12-31'}</span>
                </span>
              </div>

              {/* Download Report Button (Exact style from screenshot: green border, white bg) */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={downloadingExcel || loading}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                title="Download full assignment submission roster to Excel / CSV"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>{downloadingExcel ? 'Exporting...' : 'Download Report'}</span>
              </button>

              {/* Faculty Avatar & Name */}
              <div className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-200 shadow-2xs">
                    {getInitials(facultyName.replace(/^Prof\.\s*/i, ''))}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                    <span>{facultyName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 block leading-none mt-0.5">
                    Faculty
                  </span>
                </div>
              </div>

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. SCROLLABLE INNER BODY */}
          <div className="grow overflow-y-auto p-5 sm:p-6 space-y-5 bg-white">
            {/* HERO HEADER CARD (Mint Gradient with Document Badge & Dropdowns) */}
            <div className="w-full bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white rounded-2xl p-5 border border-emerald-100/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Badge & Title */}
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <Code2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Assignment Submissions
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 font-normal mt-0.5">
                    View and manage all student submissions for this assignment
                  </p>
                </div>
              </div>

              {/* Right Selectors: Pill 1 'Assignment' & Pill 2 'Asg 1: {Title} ▾' */}
              <div className="flex items-center gap-2.5 shrink-0" ref={asgDropdownRef}>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs select-none">
                  Assignment <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAsgDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs hover:border-emerald-400 transition cursor-pointer max-w-[280px]"
                  >
                    <span className="truncate">
                      Asg {allAssignments.findIndex((a) => a.id === currentAsgId) + 1 || 1}:{' '}
                      {assignment.title || 'Prime Number Checker'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {/* Dropdown Menu */}
                  {isAsgDropdownOpen && allAssignments.length > 0 && (
                    <div className="absolute right-0 mt-1.5 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Switch Assignment
                      </div>
                      {allAssignments.map((asg, idx) => {
                        const isSelected = asg.id === currentAsgId;
                        return (
                          <button
                            key={asg.id}
                            type="button"
                            onClick={() => {
                              setCurrentAsgId(asg.id);
                              if (onSelectAssignment) onSelectAssignment(asg.id);
                              setIsAsgDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">
                              Asg {idx + 1}: {asg.title}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. 5 METRIC STAT CARDS (Side-by-Side with Donut Rings & Sparkline) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Card 1: Total Enrolled Students */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold">Total Enrolled Students</span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {totalStudents}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                    ↑ +2%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Assigned Division</div>
                <Users className="w-12 h-12 text-slate-100 absolute -right-2 -bottom-2 pointer-events-none" />
              </div>

              {/* Card 2: Submitted */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold">Submitted</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                    {completedCount}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    {submittedPct}% of total
                  </div>
                </div>
                <DonutRing percentage={Number(submittedPct)} strokeColor="#10b981" />
              </div>

              {/* Card 3: Pending */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold">Pending</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                    {pendingCount}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    {pendingPct}% of total
                  </div>
                </div>
                <DonutRing percentage={Number(pendingPct)} strokeColor="#f59e0b" />
              </div>

              {/* Card 4: Failed */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-semibold">Failed</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                    {failedCount}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    {failedPct}% of submitted
                  </div>
                </div>
                <DonutRing percentage={Number(failedPct)} strokeColor="#f43f5e" />
              </div>

              {/* Card 5: Pass Rate */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold">Pass Rate</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                    {passRate}%
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Viva &amp; Debugging</div>
                </div>
                <SparklineGraph color="#10b981" />
              </div>
            </div>

            {/* 4. FILTER PILLS & SEARCH TOOLBAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* All Students */}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[#0d3b2e] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Students ({totalStudents})</span>
                </button>

                {/* Submitted */}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('submitted');
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'submitted'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Submitted ({completedCount})</span>
                </button>

                {/* Pending */}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('pending');
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending ({pendingCount})</span>
                </button>

                {/* Failed */}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('failed');
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'failed'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Failed ({failedCount})</span>
                </button>
              </div>

              {/* Search Box with Sliders Icon */}
              <div className="flex items-center gap-2">
                <div className="relative min-w-[280px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by student name or roll number..."
                    className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Filters"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 5. STUDENTS ROSTER DATA TABLE */}
            <div className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
              {loading ? (
                <div className="p-16 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2.5 text-emerald-600" />
                  <p className="font-semibold text-slate-700">Loading student submission data...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">No students matched this filter</p>
                  <p className="text-slate-400 mt-1">Try switching to "All Students" or clear your search term.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold tracking-tight">
                        <th className="py-3.5 px-4 w-12 text-slate-600">#</th>
                        <th className="py-3.5 px-4">Student Name</th>
                        <th className="py-3.5 px-4">Roll Number</th>
                        <th className="py-3.5 px-4">Submission Status</th>
                        <th className="py-3.5 px-4">Submitted On</th>
                        <th className="py-3.5 px-4">Marks</th>
                        <th className="py-3.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedStudents.map((s, idx) => {
                        const globalIndex = startIdx + idx + 1;
                        const isCompleted = Boolean(s.isCompleted);
                        const isPassed = Boolean(s.isPassed);
                        const isFailed = Boolean(s.isFailed);

                        return (
                          <tr
                            key={s.id || idx}
                            className="hover:bg-slate-50/70 transition-colors group"
                          >
                            {/* # Index */}
                            <td className="py-3.5 px-4 font-semibold text-slate-500 tabular-nums">
                              {globalIndex}
                            </td>

                            {/* Student Name with Circle Avatar */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#007a55] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {getInitials(s.name)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                                  <div className="text-[11px] text-slate-400 font-normal">
                                    {s.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Roll Number */}
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 text-xs">
                              {s.rollNumber || `2026CS${String(globalIndex).padStart(3, '0')}`}
                            </td>

                            {/* Submission Status Pill */}
                            <td className="py-3.5 px-4">
                              {isPassed ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                                  <span>Submitted</span>
                                </span>
                              ) : isFailed ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs">
                                  <X className="w-3.5 h-3.5 stroke-[3] text-rose-600" />
                                  <span>Failed</span>
                                </span>
                              ) : isCompleted ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                                  <span>Submitted</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            {/* Submitted On */}
                            <td className="py-3.5 px-4">
                              {isCompleted ? (
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatSubmissionDate(s.submittedAt)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-sm">—</span>
                              )}
                            </td>

                            {/* Marks */}
                            <td className="py-3.5 px-4">
                              {isCompleted ? (
                                isFailed ? (
                                  <span className="font-black text-sm text-rose-600">
                                    {s.score !== null && s.score !== undefined ? s.score : 34} / 100
                                  </span>
                                ) : (
                                  <span className="font-black text-sm text-emerald-600">
                                    {s.score !== null && s.score !== undefined ? s.score : 92} / 100
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 font-medium text-sm">—</span>
                              )}
                            </td>

                            {/* Action (View Green Pill Button + Three Dots) */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudentDossier(s)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs cursor-pointer transition shadow-2xs"
                                  title="Inspect submission, source code, and viva test dossier"
                                >
                                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>View</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenStudentDossier(s)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                  title="More actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 6. PAGINATION FOOTER */}
              <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Showing{' '}
                  <span className="font-bold text-slate-900">
                    {totalFiltered === 0 ? 0 : startIdx + 1}–{endIdx}
                  </span>{' '}
                  of <span className="font-bold text-slate-900">{totalFiltered}</span> students
                </div>

                <div className="flex items-center gap-2">
                  {/* Prev Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, pIdx) => {
                      const pNum = pIdx + 1;
                      const isActive = pNum === safePage;
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-[#0d3b2e] text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Page Size Selector */}
                  <div className="relative ml-2">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="pl-2.5 pr-6 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500 appearance-none"
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* 7. BOTTOM ALERT / INFO BAR */}
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  i
                </div>
                <span className="font-semibold text-emerald-950">
                  Submission data is updated in real-time. Ensure all students have submitted before the deadline.
                </span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* BADI SCREEN CODE & DEFECT INSPECTOR MODAL */}
      {inspectingSubmission && (
        <LargeSubmissionResultModal
          submission={inspectingSubmission}
          onClose={() => setInspectingSubmission(null)}
        />
      )}
    </>
  );
};