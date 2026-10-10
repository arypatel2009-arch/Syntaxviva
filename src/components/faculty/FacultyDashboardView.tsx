import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  FileCheck,
  Award,
  Plus,
  Sparkles,
  Eye,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  Check,
  Trash2,
  Loader2,
  Inbox,
  Lock,
  Unlock,
  Copy,
  X,
} from 'lucide-react';
import { Assignment } from '../../types/index.ts';
import {
  StatCard,
  Badge,
  Button,
  CircularProgress,
  RowActionMenu,
  TableSkeleton,
  EmptyState,
  toast,
} from '../common/UIComponents.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { DataTable, DataTableColumn } from '../common/DataTable.tsx';

interface FacultyDashboardViewProps {
  assignments: Assignment[];
  stats: {
    totalAssignments: number;
    totalStudents?: number;
    activeAssignments: number;
    totalAttempts: number;
    passedAttempts: number;
  };
  onCreateAssignment: () => void;
  onViewAssignments: () => void;
  onReviewSubmission: (submission: any) => void;
  onRefresh?: () => void;
  onDeleteAssignment?: (assignmentId: string) => Promise<void> | void;
  viewMode?: 'dashboard' | 'submissions';
}

const isAssignmentDeadlinePassed = (dueDate?: string | null): boolean => {
  if (!dueDate || typeof dueDate !== 'string' || !dueDate.trim()) return false;
  const trimmed = dueDate.trim();
  let deadlineMs: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    deadlineMs = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  } else {
    deadlineMs = new Date(trimmed).getTime();
  }
  if (Number.isNaN(deadlineMs)) return false;
  return Date.now() > deadlineMs;
};

const formatFullDayDateTime = (ts?: string | null) => {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return {
    dayAndDate: d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
};

export const FacultyDashboardView: React.FC<FacultyDashboardViewProps> = ({
  assignments,
  stats,
  onCreateAssignment,
  onViewAssignments,
  onReviewSubmission,
  onRefresh,
  onDeleteAssignment,
  viewMode = 'dashboard',
}) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [deadlineDrafts, setDeadlineDrafts] = useState<Record<string, string>>({});
  const [savingDeadlineId, setSavingDeadlineId] = useState<string | null>(null);
  const [savedDeadlineId, setSavedDeadlineId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockingAll, setUnlockingAll] = useState(false);
  const [phase2Overrides, setPhase2Overrides] = useState<Record<string, boolean>>({});

  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isCreateClassroomOpen, setIsCreateClassroomOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomDesc, setNewClassroomDesc] = useState('');
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClassrooms = async () => {
    try {
      const res = await api.getClassrooms();
      setClassrooms(res.classrooms || []);
    } catch (err) {
      console.warn('Failed to load classrooms:', err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Join Code Copied!', `Classroom code ${code} copied to clipboard.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassroomName.trim()) return;
    setCreatingClassroom(true);
    try {
      const res = await api.createClassroom({
        name: newClassroomName.trim(),
        description: newClassroomDesc.trim(),
      });
      toast.success(
        'Classroom Created!',
        `Classroom "${res.classroom.name}" ready with Join Code ${res.joinCode}.`
      );
      setNewClassroomName('');
      setNewClassroomDesc('');
      setIsCreateClassroomOpen(false);
      fetchClassrooms();
    } catch (err: any) {
      toast.error('Failed to create classroom', err?.message || 'Error creating classroom');
    } finally {
      setCreatingClassroom(false);
    }
  };

  const fetchDashboardActivity = async () => {
    setLoadingSubmissions(true);
    try {
      const [subRes, stdRes] = await Promise.all([
        api.getAllSubmissions(),
        api.getStudents().catch(() => ({ students: [] })),
      ]);
      setSubmissions(subRes.submissions || []);
      setStudents(stdRes.students || []);
    } catch (err) {
      console.error('Failed to load recent submissions & students:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchDashboardActivity();
    fetchClassrooms();
  }, []);

  const isPhase2UnlockedFor = (asg: Assignment) => {
    if (phase2Overrides[asg.id] !== undefined) return phase2Overrides[asg.id];
    return Boolean(asg.phase2Unlocked || asg.phase2_unlocked);
  };

  const handleTogglePhase2Unlock = async (asg: Assignment, nextUnlocked?: boolean) => {
    const targetUnlocked = nextUnlocked !== undefined ? nextUnlocked : !isPhase2UnlockedFor(asg);
    setUnlockingId(asg.id);
    setPhase2Overrides((prev) => ({ ...prev, [asg.id]: targetUnlocked }));
    try {
      await api.toggleAssignmentPhase2Unlock(asg.id, targetUnlocked);
      toast.success(
        targetUnlocked
          ? 'Phase 2 Unlocked for All Students!'
          : 'Phase 2 Locked',
        targetUnlocked
          ? `All students in "${asg.title}" can now start Phase 2 AST Viva.`
          : `Phase 2 access for "${asg.title}" has been locked.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setPhase2Overrides((prev) => ({
        ...prev,
        [asg.id]: Boolean(asg.phase2Unlocked || asg.phase2_unlocked),
      }));
      toast.error('Failed to update Phase 2 status', err?.message || 'Please try again.');
    } finally {
      setUnlockingId(null);
    }
  };

  const handleUnlockAllPhase2 = async () => {
    if (assignments.length === 0) return;
    setUnlockingAll(true);
    const nextOverrides: Record<string, boolean> = {};
    assignments.forEach((a) => {
      nextOverrides[a.id] = true;
    });
    setPhase2Overrides((prev) => ({ ...prev, ...nextOverrides }));
    try {
      const res = await api.unlockAllAssignmentsPhase2(true);
      toast.success(
        'All Students Phase 2 Unlocked!',
        `Unlocked Phase 2 across ${res.updatedCount || assignments.length} assignment(s) for all students in 1 click.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error('Failed to unlock all Phase 2', err?.message || 'Please try again.');
    } finally {
      setUnlockingAll(false);
    }
  };

  const handleAutoSaveDeadline = async (assignmentId: string, selectedDate: string) => {
    setDeadlineDrafts((prev) => ({ ...prev, [assignmentId]: selectedDate }));
    if (!selectedDate) return;

    setSavingDeadlineId(assignmentId);
    try {
      await api.updateAssignmentDeadline(assignmentId, selectedDate);
      setSavedDeadlineId(assignmentId);
      toast.success('Assignment updated successfully', `Deadline set to ${selectedDate}.`);
      setTimeout(() => {
        setSavedDeadlineId((prev) => (prev === assignmentId ? null : prev));
      }, 2000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to update deadline:', err);
      toast.error('Failed to update deadline', err?.message || 'Please try again.');
    } finally {
      setSavingDeadlineId(null);
    }
  };

  const handleDeleteAssignment = async (asg: Assignment) => {
    setDeletingId(asg.id);
    try {
      if (onDeleteAssignment) {
        await onDeleteAssignment(asg.id);
      } else {
        await api.deleteAssignment(asg.id);
        if (onRefresh) onRefresh();
      }
      toast.success('Assignment deleted successfully', `"${asg.title}" was removed.`);
      await fetchDashboardActivity();
    } catch (err: any) {
      console.error('Failed to delete assignment:', err);
      toast.error('Failed to delete assignment', err?.message || 'Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const enrolledStudentsCount =
    classrooms.reduce((acc, c) => acc + (c.student_count || 0), 0) ||
    students.length ||
    (stats.totalStudents ?? 0);
  const totalStudentsLoggedIn = enrolledStudentsCount;
  const activeAssignments = assignments.length;
  const totalSubmissions = submissions.length > 0 ? submissions.length : stats.totalAttempts ?? 0;
  const uniqueSubmittingStudents =
    submissions.length > 0
      ? new Set(submissions.map((s) => s.studentId || s.studentEmail)).size
      : students.filter((s) => (s.attemptsCount ?? 0) > 0).length;
  const studentsNotSubmittedCount = Math.max(0, enrolledStudentsCount - uniqueSubmittingStudents);

  const submittedPairSet = new Set(
    submissions.map((s) => `${s.studentId || s.studentEmail}__${s.assignmentId}`)
  );

  const missingStudentSubmissions = students.flatMap((std) =>
    assignments
      .filter(
        (asg) =>
          !submittedPairSet.has(`${std.id}__${asg.id}`) &&
          !submittedPairSet.has(`${std.email}__${asg.id}`)
      )
      .map((asg) => {
        const effectiveDue =
          deadlineDrafts[asg.id] !== undefined
            ? deadlineDrafts[asg.id]
            : asg.dueDate
            ? String(asg.dueDate).slice(0, 10)
            : '2026-10-20';
        const deadlineExpired = isAssignmentDeadlinePassed(effectiveDue);
        return {
          id: `missing_${std.id}_${asg.id}`,
          isNotSubmittedRow: true,
          isDeadlineExpired: deadlineExpired,
          dueDate: effectiveDue,
          studentId: std.id,
          studentName: std.name || 'Student',
          studentEmail: std.email || '',
          studentRollNumber: std.rollNumber || null,
          studentClassId: std.classId || null,
          studentDivisionId: std.divisionId || null,
          assignmentId: asg.id,
          assignmentTitle: asg.title,
          assignmentLanguage: asg.language,
          language: asg.language,
          state: deadlineExpired ? 'DEADLINE_EXPIRED_NOT_SUBMITTED' : 'NOT_SUBMITTED',
          failureReason: null,
          submittedAt: null,
          createdAt: null,
        };
      })
  );

  const combinedActivityRows = [...submissions, ...missingStudentSubmissions];

  const passedAttempts =
    submissions.length > 0
      ? submissions.filter(
          (s) =>
            s.state === 'PHASE2_PASSED' ||
            s.phase2Status === 'PASSED' ||
            s.state === 'PASSED'
        ).length
      : stats.passedAttempts ?? 0;
  const passRate =
    totalSubmissions > 0
      ? Math.min(100, Math.round((passedAttempts / totalSubmissions) * 100))
      : 0;

  const handleExportCSV = () => {
    if (combinedActivityRows.length === 0) return;
    const headers = [
      'Submission ID',
      'Assignment',
      'Student Name',
      'Student Email',
      'Roll Number',
      'Class',
      'Division',
      'State',
      'Tests Passed',
      'Tests Total',
      'Submitted Day & Date',
      'Submitted Time',
      'Failure Reason',
    ];

    const rows = combinedActivityRows.map((s) => {
      const dt = formatFullDayDateTime(s.submittedAt || s.createdAt);
      return [
        `"${s.id || ''}"`,
        `"${(s.assignmentTitle || '').replace(/"/g, '""')}"`,
        `"${(s.studentName || '').replace(/"/g, '""')}"`,
        `"${(s.studentEmail || '').replace(/"/g, '""')}"`,
        `"${(s.studentRollNumber || '').replace(/"/g, '""')}"`,
        `"${(s.studentClassId || '').replace(/"/g, '""')}"`,
        `"${(s.studentDivisionId || '').replace(/"/g, '""')}"`,
        `"${s.state || s.phase2Status || ''}"`,
        s.evaluation?.testsPassed ?? 0,
        s.evaluation?.testsTotal ?? 0,
        `"${s.isNotSubmittedRow ? 'Not Submitted' : dt ? dt.dayAndDate : ''}"`,
        `"${s.isNotSubmittedRow ? '—' : dt ? dt.time : ''}"`,
        `"${(s.failureReason || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `syntaxviva-submissions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Submissions CSV exported');
  };

  const assignmentColumns: DataTableColumn<Assignment>[] = [
    {
      key: 'title',
      header: 'Assignment Title',
      sortable: true,
      sortType: 'string',
      getSortValue: (asg) => asg.title,
      render: (asg) => (
        <div className="font-medium text-slate-900 text-sm tracking-tight">
          {asg.title}
        </div>
      ),
    },
    {
      key: 'language',
      header: 'Language',
      sortable: true,
      sortType: 'string',
      width: '110px',
      getSortValue: (asg) => asg.language,
      render: (asg) => (
        <span className="font-mono text-slate-600 uppercase bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded text-[11px] font-medium">
          {asg.language}
        </span>
      ),
    },
    {
      key: 'submissionCount',
      header: 'Students Submitted / Not Submitted',
      sortable: true,
      sortType: 'number',
      width: '180px',
      getSortValue: (asg) => Number(asg.submissionCount ?? 0),
      render: (asg) => {
        const subCount = Number(asg.submissionCount ?? 0);
        const notSubCount = Math.max(0, totalStudentsLoggedIn - subCount);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-700 tabular-nums">
              {subCount}{' '}
              <span className="text-slate-400 font-normal">
                {subCount === 1 ? 'submitted' : 'submitted'}
              </span>
            </span>
            {notSubCount > 0 && (
              <Badge variant="danger" size="sm" dot>
                {notSubCount} Not Submitted
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Deadline Date',
      sortable: true,
      sortType: 'date',
      width: '180px',
      getSortValue: (asg) =>
        deadlineDrafts[asg.id] ||
        (asg.dueDate ? String(asg.dueDate).slice(0, 10) : '2026-10-20'),
      render: (asg) => {
        const dateValue =
          deadlineDrafts[asg.id] !== undefined
            ? deadlineDrafts[asg.id]
            : asg.dueDate
            ? String(asg.dueDate).slice(0, 10)
            : '2026-10-20';
        const expired = isAssignmentDeadlinePassed(dateValue);

        return (
          <div className="inline-flex items-center gap-2 whitespace-nowrap">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                value={dateValue}
                onChange={(e) => handleAutoSaveDeadline(asg.id, e.target.value)}
                className="pl-8 pr-2.5 py-1 rounded-lg border border-slate-200/80 hover:border-slate-300 text-xs bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors cursor-pointer"
              />
            </div>
            {expired && (
              <Badge variant="danger" size="sm">
                Expired
              </Badge>
            )}
            {savingDeadlineId === asg.id && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                Saving
              </span>
            )}
            {savedDeadlineId === asg.id && savingDeadlineId !== asg.id && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'phase2Access',
      header: 'Phase 2 Access (All Students)',
      width: '190px',
      render: (asg) => {
        const unlocked = isPhase2UnlockedFor(asg);
        const isBusy = unlockingId === asg.id;

        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            {unlocked ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleTogglePhase2Unlock(asg, false)}
                title="Click to lock Phase 2 for all students"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>Phase 2 Unlocked</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleTogglePhase2Unlock(asg, true)}
                title="1-Click Unlock Phase 2 for all students in this assignment"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-white" />
                )}
                <span>Unlock Phase 2</span>
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '140px',
      render: (asg) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button
            type="button"
            onClick={onViewAssignments}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            Submissions
          </button>
          <RowActionMenu
            fadeOnHover={false}
            items={[
              {
                label: 'View Submissions',
                icon: Eye,
                onClick: onViewAssignments,
              },
              {
                label: isPhase2UnlockedFor(asg)
                  ? 'Lock Phase 2 for Students'
                  : 'Unlock Phase 2 for All Students',
                icon: isPhase2UnlockedFor(asg) ? Lock : Unlock,
                onClick: () => handleTogglePhase2Unlock(asg),
              },
              {
                label:
                  deletingId === asg.id ? 'Deleting...' : 'Delete Assignment',
                icon: Trash2,
                variant: 'danger',
                disabled: deletingId === asg.id,
                onClick: () => handleDeleteAssignment(asg),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. ENTERPRISE OVERVIEW HEADER CARD */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Faculty Control Center</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Faculty'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-900 font-semibold">
              {enrolledStudentsCount} students enrolled
            </strong>{' '}
            across{' '}
            <strong className="text-slate-900 font-semibold">
              {activeAssignments} lab assignments
            </strong>
            , with{' '}
            <strong className="text-slate-900 font-semibold">
              {uniqueSubmittingStudents} students
            </strong>{' '}
            completing{' '}
            <strong className="text-slate-900 font-semibold">
              {totalSubmissions} submissions
            </strong>
            .
          </p>
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleUnlockAllPhase2}
            disabled={unlockingAll || assignments.length === 0}
            icon={Unlock}
          >
            {unlockingAll ? 'Unlocking Phase 2...' : 'Unlock All Phase 2'}
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={onViewAssignments}
          >
            All Assignments
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onCreateAssignment}
            icon={Plus}
          >
            Create Assignment
          </Button>
        </div>
      </div>

      {/* 2. STAT CARDS (Clean Sans-Serif Numbers & Unified Emerald Accent) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Enrolled Students"
          value={enrolledStudentsCount}
          icon={Users}
        />
        <StatCard
          label="Active Assignments"
          value={activeAssignments}
          icon={BookOpen}
        />
        <StatCard
          label="Students Submitted"
          value={uniqueSubmittingStudents}
          trend={`${totalSubmissions} total`}
          icon={FileCheck}
        />
        <StatCard
          label="Average Pass Rate"
          value={totalSubmissions > 0 ? `${passRate}%` : '0%'}
          icon={Award}
        />
      </div>

      {/* 2.5 MY CLASSROOMS & ENROLLMENT CODES (Multi-Tenancy) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                My Classrooms &amp; Join Codes
              </h2>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateClassroomOpen(true)}
            icon={Plus}
          >
            New Classroom
          </Button>
        </div>

        {classrooms.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No Classrooms Found</p>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Create a classroom to generate a join code for your students.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateClassroomOpen(true)}
              icon={Plus}
            >
              Create First Classroom
            </Button>
          </div>
        ) : classrooms.length === 1 ? (
          <div className="w-full p-5 sm:p-6 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {classrooms[0].name}
                </h3>
                <span className="text-[11px] font-mono text-emerald-800 uppercase bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                  {classrooms[0].college_name || 'SyntaxViva Academic Institute'}
                </span>
              </div>
              {classrooms[0].description && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {classrooms[0].description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{classrooms[0].student_count ?? 0} Enrolled Students</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{classrooms[0].assignment_count ?? assignments.length} Active Assignments</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs">
              <div className="px-3 py-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Classroom Join Code
                </span>
                <span className="font-mono text-2xl font-black tracking-widest text-emerald-700">
                  {classrooms[0].join_code}
                </span>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleCopyCode(classrooms[0].join_code)}
                icon={copiedCode === classrooms[0].join_code ? Check : Copy}
              >
                {copiedCode === classrooms[0].join_code ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {classrooms.map((cls) => (
              <div
                key={cls.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {cls.name}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
                      {cls.college_name || 'College'}
                    </span>
                  </div>
                  {cls.description && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                      {cls.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      Join Code
                    </span>
                    <span className="font-mono text-lg font-bold tracking-widest text-emerald-700">
                      {cls.join_code}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCode(cls.join_code)}
                    icon={copiedCode === cls.join_code ? Check : Copy}
                  >
                    {copiedCode === cls.join_code ? 'Copied!' : 'Copy Code'}
                  </Button>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between font-medium pt-1">
                  <span>{cls.student_count ?? 0} Enrolled Students</span>
                  <span>{cls.assignment_count ?? 0} Assignments</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. ENTERPRISE LAB ASSIGNMENTS DATA TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Lab Assignments ({assignments.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUnlockAllPhase2}
              disabled={unlockingAll || assignments.length === 0}
              icon={Unlock}
            >
              {unlockingAll ? 'Unlocking...' : '1-Click Unlock All Phase 2'}
            </Button>
            <Button variant="outline" size="sm" onClick={onViewAssignments}>
              View All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateAssignment}
              icon={Plus}
            >
              Add Assignment
            </Button>
          </div>
        </div>

        <DataTable
          data={assignments}
          columns={assignmentColumns}
          getRowId={(a) => a.id}
          pageSize={5}
          entityLabel="assignments"
          selectable
          onBulkSetDeadline={async (selected, newDate) => {
            await Promise.all(
              selected.map((asg) => api.updateAssignmentDeadline(asg.id, newDate))
            );
            const nextDrafts = { ...deadlineDrafts };
            selected.forEach((asg) => {
              nextDrafts[asg.id] = newDate;
            });
            setDeadlineDrafts(nextDrafts);
            if (onRefresh) onRefresh();
            toast.success(
              'Bulk deadline updated',
              `Set deadline to ${newDate} for ${selected.length} assignment(s).`
            );
          }}
          onBulkExportCSV={(selected) => {
            const headers = ['ID', 'Title', 'Language', 'Submissions', 'Deadline'];
            const rows = selected.map((a) => [
              `"${a.id}"`,
              `"${(a.title || '').replace(/"/g, '""')}"`,
              `"${a.language}"`,
              a.submissionCount ?? 0,
              `"${a.dueDate ? String(a.dueDate).slice(0, 10) : '2026-10-20'}"`,
            ]);
            const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
              '\n'
            );
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'selected-assignments.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(
              'Exported selected assignments',
              `${selected.length} assignment(s) exported to CSV.`
            );
          }}
          onBulkDelete={async (selected) => {
            for (const asg of selected) {
              if (onDeleteAssignment) {
                await onDeleteAssignment(asg.id);
              } else {
                await api.deleteAssignment(asg.id);
              }
            }
            if (onRefresh) onRefresh();
            toast.success(
              'Batch delete completed',
              `Deleted ${selected.length} assignment(s).`
            );
          }}
          emptyTitle="No results found"
          emptyDescription="No active assignments matched your filter criteria."
          emptyActionLabel="Create Assignment"
          onEmptyAction={onCreateAssignment}
        />
      </div>

      {/* 4. PROFESSOR'S SUBMISSIONS AUDIT TABLE (Shown when viewing Submissions tab) */}
      {viewMode === 'submissions' && (
        <div className="w-full bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-visible">
          <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Student Submissions Roster ({combinedActivityRows.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Recent submissions and status for students in your classrooms.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardActivity}
                icon={RefreshCw}
                disabled={loadingSubmissions}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCSV}
                icon={FileSpreadsheet}
                disabled={combinedActivityRows.length === 0}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {loadingSubmissions ? (
            <TableSkeleton rows={4} columns={5} />
          ) : combinedActivityRows.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title="No submissions found"
              description="No student submissions have been recorded yet in your classrooms."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-3 pl-6 w-auto min-w-[180px]">Student</th>
                    <th className="py-3 w-48">Assignment</th>
                    <th className="py-3 w-44">Submission Status</th>
                    <th className="py-3 w-48">Submitted Date / Time</th>
                    <th className="py-3 pr-6 w-32 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {combinedActivityRows.map((sub) => {
                    const isNotSubmitted = Boolean(sub.isNotSubmittedRow);
                    const isPassed =
                      !isNotSubmitted &&
                      (sub.state === 'PHASE2_PASSED' ||
                        sub.phase2Status === 'PASSED' ||
                        sub.state === 'PASSED');
                    const isFailed =
                      !isNotSubmitted &&
                      (sub.state === 'PHASE2_FAILED' ||
                        sub.phase2Status === 'FAILED' ||
                        sub.state === 'FAILED');
                    const isTerminated =
                      !isNotSubmitted &&
                      (sub.state === 'SECURITY_TERMINATED' ||
                        sub.phase2Status === 'SECURITY_TERMINATED');
                    const dt = formatFullDayDateTime(sub.submittedAt || sub.createdAt);

                    return (
                      <tr
                        key={sub.id}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 pl-6">
                          <div className="font-medium text-slate-900">{sub.studentName}</div>
                          <div className="text-[11px] text-slate-400">
                            {sub.studentRollNumber
                              ? `Roll: ${sub.studentRollNumber}`
                              : sub.studentEmail}
                          </div>
                        </td>
                        <td className="py-3.5">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            {sub.assignmentTitle}
                          </div>
                          <span className="font-mono text-[10px] uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {sub.assignmentLanguage || sub.language}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {isNotSubmitted ? (
                            <Badge variant={sub.isDeadlineExpired ? 'danger' : 'neutral'} size="sm" dot>
                              {sub.isDeadlineExpired ? 'Deadline Expired' : 'Not Submitted'}
                            </Badge>
                          ) : isPassed ? (
                            <Badge variant="success" size="sm" dot>
                              Passed Viva
                            </Badge>
                          ) : isFailed ? (
                            <Badge variant="danger" size="sm" dot>
                              Failed Tests
                            </Badge>
                          ) : isTerminated ? (
                            <Badge variant="danger" size="sm" dot>
                              Exam Cancelled
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm" dot>
                              {sub.state}
                            </Badge>
                          )}
                          {sub.evaluation && !isTerminated && !isNotSubmitted && (
                            <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                              {sub.evaluation.testsPassed} / {sub.evaluation.testsTotal} tests
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 text-slate-700 whitespace-nowrap">
                          {isNotSubmitted ? (
                            <span className="text-slate-500 text-xs tabular-nums">
                              {sub.dueDate ? `Due: ${sub.dueDate}` : '—'}
                            </span>
                          ) : dt ? (
                            <div>
                              <div className="font-medium text-slate-800">{dt.dayAndDate}</div>
                              <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                                {dt.time}
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 pr-6 text-right">
                          {isNotSubmitted ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onReviewSubmission(sub)}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              >
                                Review
                              </button>
                              <RowActionMenu
                                fadeOnHover={false}
                                items={[
                                  {
                                    label: 'Review Submission',
                                    icon: Eye,
                                    onClick: () => onReviewSubmission(sub),
                                  },
                                ]}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE CLASSROOM MODAL */}
      {isCreateClassroomOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Create New Classroom
                  </h2>
                  <p className="text-xs text-slate-500">
                    Scoped multi-tenant student cohort
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateClassroomOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Classroom Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  placeholder="e.g. CS201 - Algorithms & Data Structures (Div A)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Description / Batch Info (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newClassroomDesc}
                  onChange={(e) => setNewClassroomDesc(e.target.value)}
                  placeholder="e.g. Fall Semester 2026 - Morning Batch"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                A unique 6-character join code (e.g. SYN789) will be generated automatically for your students to join.
              </p>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsCreateClassroomOpen(false)}
                  disabled={creatingClassroom}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={creatingClassroom || !newClassroomName.trim()}
                  icon={creatingClassroom ? Loader2 : Plus}
                >
                  {creatingClassroom ? 'Creating...' : 'Create Classroom'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
