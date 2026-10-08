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

  const totalStudentsLoggedIn = Math.max(students.length, stats.totalStudents ?? 0);
  const activeAssignments = assignments.length;
  const totalSubmissions = submissions.length > 0 ? submissions.length : stats.totalAttempts ?? 0;
  const uniqueSubmittingStudents =
    submissions.length > 0
      ? new Set(submissions.map((s) => s.studentId || s.studentEmail)).size
      : students.filter((s) => (s.attemptsCount ?? 0) > 0).length;
  const studentsNotSubmittedCount = Math.max(0, totalStudentsLoggedIn - uniqueSubmittingStudents);

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
          failureReason: deadlineExpired
            ? `Deadline (${effectiveDue}) khatam ho chuki hai — Is student ne assignment submit nahi kiya`
            : `Is student ne abhi tak assignment submit nahi kiya (Due: ${effectiveDue})`,
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
            <span>Faculty Control Center • v1.2.0-beta</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Faculty'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-900 font-semibold">
              {totalStudentsLoggedIn} students logged in
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
          label="Students Logged In"
          value={totalStudentsLoggedIn}
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

      {/* 3. ENTERPRISE LAB ASSIGNMENTS DATA TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Lab Assignments ({assignments.length})
            </h2>
            <p className="text-xs text-slate-500">
              Use &ldquo;Unlock Phase 2&rdquo; to unlock Phase 2 AST Viva for all students in 1 click, or manage deadlines and submissions.
            </p>
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

      {/* 4. 2-COLUMN MAIN CONTENT: PROFESSOR'S SUBMISSION & LOGIN HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Professor's Submission History */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-visible">
          <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Professor&apos;s Submission &amp; Non-Submission Status ({combinedActivityRows.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Student assignment submissions and students who have not submitted assignments.
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
              title="No results found"
              description="No student submissions have been recorded yet. Submissions will appear here with Day, Date, and Time."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-3 pl-6">Student</th>
                    <th className="py-3">Assignment</th>
                    <th className="py-3">Result / Submission Status</th>
                    <th className="py-3">Submitted (Day, Date &amp; Time)</th>
                    <th className="py-3 pr-6 text-right">Audit</th>
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
                        className={`group transition-colors ${
                          isNotSubmitted
                            ? 'bg-rose-50/30 hover:bg-rose-50/60'
                            : 'hover:bg-slate-50/80'
                        }`}
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
                            <div className="space-y-1">
                              <Badge variant="danger" size="sm" dot>
                                {sub.isDeadlineExpired
                                  ? 'Deadline Over — Not Submitted'
                                  : 'Assignment Not Submitted'}
                              </Badge>
                              <div className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md px-2 py-1 max-w-xs leading-snug">
                                {sub.failureReason}
                              </div>
                            </div>
                          ) : isPassed ? (
                            <Badge variant="success" size="sm" dot>
                              Passed Viva
                            </Badge>
                          ) : isFailed ? (
                            <Badge variant="danger" size="sm" dot>
                              Failed Tests
                            </Badge>
                          ) : isTerminated ? (
                            <div className="space-y-1">
                              <Badge variant="danger" size="sm" dot>
                                Exam Cancelled
                              </Badge>
                              <div className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md px-2 py-1 max-w-xs leading-snug">
                                {sub.failureReason ||
                                  'Exam Cancelled: Student pressed Back, minimized window, or closed browser tab'}
                              </div>
                            </div>
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
                            <div>
                              <div className="font-bold text-rose-700">Not Submitted</div>
                              {sub.dueDate && (
                                <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                                  Due: {sub.dueDate}
                                </div>
                              )}
                            </div>
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
                            <span className="text-[11px] font-semibold text-rose-600">
                              Not Submitted
                            </span>
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

        {/* Right Column (4 cols): Assessment Summary & Student Login Activity */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Submission &amp; Login Summary
              </h2>
              <p className="text-xs text-slate-500">Live student participation overview</p>
            </div>

            <div className="py-2">
              <CircularProgress
                value={passRate}
                size={140}
                strokeWidth={12}
                label={totalSubmissions > 0 ? `${passRate}%` : '0%'}
                sublabel="Pass Rate"
              />
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Students Logged In</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {totalStudentsLoggedIn}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Students Who Submitted</span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {uniqueSubmittingStudents}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rose-600 font-semibold">Students Not Submitted</span>
                <span className="font-bold text-rose-600 tabular-nums">
                  {studentsNotSubmittedCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Total Recorded Submissions</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {totalSubmissions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Passed Attempts</span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {passedAttempts}
                </span>
              </div>
            </div>
          </div>

          {/* Logged-In Students History */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                Student Login &amp; Submission Status ({totalStudentsLoggedIn})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Shows which students submitted and which students have NOT submitted assignments
              </p>
            </div>

            {loadingSubmissions ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-2"
                  >
                    <div className="h-3.5 w-28 animate-pulse bg-slate-200 rounded" />
                    <div className="h-3 w-40 animate-pulse bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No results found"
                description="No student accounts have logged in yet."
              />
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {students.map((std) => {
                  const loginDt = formatFullDayDateTime(std.lastLoginAt || std.createdAt);
                  const missingList: any[] = Array.isArray(std.missingAssignments)
                    ? std.missingAssignments
                    : [];
                  const hasNotSubmitted =
                    (std.attemptsCount ?? 0) === 0 || missingList.length > 0;

                  return (
                    <div
                      key={std.id}
                      className={`p-3 rounded-lg border flex flex-col gap-2 text-xs ${
                        hasNotSubmitted
                          ? 'bg-rose-50/40 border-rose-200/80'
                          : 'bg-slate-50/70 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">{std.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {std.rollNumber ? `Roll: ${std.rollNumber} • ` : ''}
                            {std.email}
                          </div>
                          {loginDt && (
                            <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                              {loginDt.dayAndDate} • {loginDt.time}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {(std.attemptsCount ?? 0) > 0 && (
                            <Badge variant="success" size="sm">
                              {std.attemptsCount} Submitted
                            </Badge>
                          )}
                          {hasNotSubmitted && (
                            <Badge variant="danger" size="sm" dot>
                              {(std.attemptsCount ?? 0) === 0
                                ? 'Assignment Not Submitted'
                                : `${missingList.length} Not Submitted`}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {missingList.length > 0 && (
                        <div className="text-[11px] font-medium text-rose-700 bg-white/80 border border-rose-200/70 rounded px-2 py-1">
                          Not Submitted:{' '}
                          <span className="font-semibold">
                            {missingList.map((m) => m.title).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
