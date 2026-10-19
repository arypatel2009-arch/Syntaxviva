import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Bug,
  Sparkles,
  Play,
  Eye,
  Inbox,
  Lock,
  Users,
} from 'lucide-react';
import { Assignment } from '../../types/index.ts';
import {
  StatCard,
  CircularProgress,
  Badge,
  Button,
  RowActionMenu,
  EmptyState,
} from '../common/UIComponents.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

function isAssignmentDeadlinePassed(dueDate?: string | null): boolean {
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
}

interface StudentDashboardViewProps {
  assignments: Assignment[];
  stats: {
    activeAssignments: number;
    myAttempts: number;
    passedAttempts: number;
  };
  onSelectAssignment: (assignmentId: string, phase?: 'phase1' | 'phase2') => void;
  onViewAllAssignments: () => void;
  onJoinClassroom?: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  assignments,
  stats,
  onSelectAssignment,
  onViewAllAssignments,
  onJoinClassroom,
}) => {
  const { user } = useAuth();

  const totalAssignments = assignments.length;
  const completed = stats.passedAttempts;
  const pending = Math.max(0, totalAssignments - completed);
  const passRate = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;
  const studentName = user?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="space-y-6">
      {/* 1. SOFT GLASS HERO WELCOME SECTION WITH TRANSLUCENT ACCENTS */}
      <div className="relative overflow-hidden glass-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_8px_32px_rgba(71,113,153,0.08)]">
        {/* Abstract decorative translucent cyan & mint shapes on the right */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-cyan-200/35 via-teal-100/25 to-emerald-300/20 blur-2xl pointer-events-none" />
        <div className="absolute right-24 -bottom-16 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-200/30 via-teal-100/30 to-blue-200/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#059669] text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Semester • Computer Science Lab</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[#172B4D]">
            Welcome back, {studentName}
          </h1>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Keep learning, keep growing. You have{' '}
            <span className="text-emerald-600 font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              {pending} pending assignments
            </span>{' '}
            waiting for Phase 1 submission and Phase 2 completion.
          </p>
        </div>

        <div className="relative z-10 shrink-0 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onJoinClassroom}
            icon={Users}
          >
            Join Classroom
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onViewAllAssignments}
            icon={ArrowRight}
            iconPosition="right"
          >
            Explore Assignments
          </Button>
        </div>
      </div>

      {/* 2. STAT CARDS (4 Columns — Unified Emerald Accent & Clean Sans-Serif Numbers) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Assignments"
          value={totalAssignments}
          icon={BookOpen}
        />
        <StatCard
          label="Completed & Verified"
          value={completed}
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending Submission"
          value={pending}
          icon={Clock}
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          icon={Award}
        />
      </div>

      {/* 3. 2-COLUMN MAIN CONTENT (Recent Assignments & Your Progress) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Recent Assignments Table */}
        <div className="lg:col-span-8 glass-card rounded-2xl overflow-visible">
          <div className="p-5 border-b border-white/70 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Recent Assignments
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct access to your enrolled coursework tasks.
              </p>
            </div>
            <button
              onClick={onViewAllAssignments}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {assignments.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Enrolled Classrooms or Assignments"
              description="You are not enrolled in any classrooms yet. Enter your professor's 6-character join code to enroll in a classroom and unlock assignments."
              actionLabel="Join Classroom"
              onAction={onJoinClassroom}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[660px]">
                <thead>
                  <tr className="bg-white/40 border-b border-white/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 pl-6 w-auto min-w-[200px]">Assignment</th>
                    <th className="py-3 w-28 whitespace-nowrap">Language</th>
                    <th className="py-3 w-36 whitespace-nowrap">Deadline Date</th>
                    <th className="py-3 w-40 whitespace-nowrap">Status</th>
                    <th className="py-3 text-right pr-6 w-44 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.slice(0, 6).map((asg) => {
                    const myState = (asg as any).myAttemptState;
                    const p2Status = (asg as any).myPhase2Status;
                    const isPassed =
                      myState === 'PASSED' ||
                      myState === 'PHASE2_PASSED' ||
                      p2Status === 'PHASE2_PASSED';
                    const isPhase1Done = Boolean(
                      (asg as any).mySubmittedAt ||
                        myState === 'PHASE1_SUBMITTED' ||
                        myState === 'MUTATION_READY' ||
                        myState === 'MUTATION_PROCESSING_FAILED' ||
                        myState === 'PHASE2_READY' ||
                        myState === 'PHASE2_ACTIVE' ||
                        myState === 'PHASE2_MUTATION_GENERATED' ||
                        p2Status === 'PHASE2_READY' ||
                        p2Status === 'PHASE2_ACTIVE'
                    );
                    const isFacultyUnlocked = Boolean(
                      asg.phase2Unlocked ||
                        asg.phase2_unlocked ||
                        myState === 'PHASE2_ACTIVE' ||
                        p2Status === 'PHASE2_ACTIVE'
                    );
                    const isPhase2 = !isPassed && isPhase1Done && isFacultyUnlocked;
                    const isWaitingFacultyUnlock = !isPassed && isPhase1Done && !isFacultyUnlocked;

                    const rawDueDate = asg.dueDate || (asg as any).due_date;
                    const isDeadlineExpired =
                      !isPhase1Done &&
                      !isPassed &&
                      (Boolean((asg as any).isDeadlinePassed) ||
                        isAssignmentDeadlinePassed(rawDueDate));

                    return (
                      <tr key={asg.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-6">
                          <div className="font-medium text-slate-900 text-sm tracking-tight">
                            {asg.title}
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="font-mono text-slate-600 uppercase bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded text-[11px] font-medium">
                            {asg.language}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-700 font-medium whitespace-nowrap tabular-nums">
                          {rawDueDate
                            ? new Date(rawDueDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'No deadline'}
                        </td>
                        <td className="py-3.5">
                          {isPassed ? (
                            <Badge variant="success" size="sm" dot>
                              Passed
                            </Badge>
                          ) : isPhase2 ? (
                            <Badge variant="warning" size="sm" dot>
                              Phase 2 Unlocked
                            </Badge>
                          ) : isWaitingFacultyUnlock ? (
                            <Badge variant="neutral" size="sm" dot>
                              Phase 2 Locked
                            </Badge>
                          ) : isDeadlineExpired ? (
                            <Badge variant="danger" size="sm" dot>
                              Deadline Expired — Not Submitted
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm" dot>
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 text-right pr-6 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isPassed ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectAssignment(asg.id)}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              >
                                Review
                              </Button>
                            ) : isPhase2 ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => onSelectAssignment(asg.id, 'phase2')}
                                icon={Bug}
                              >
                                Start Phase 2
                              </Button>
                            ) : isWaitingFacultyUnlock ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectAssignment(asg.id, 'phase1')}
                              >
                                Waiting for Faculty
                              </Button>
                            ) : isDeadlineExpired ? (
                              <Button
                                variant="danger"
                                size="sm"
                                disabled
                                icon={Lock}
                              >
                                Deadline Expired
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => onSelectAssignment(asg.id, 'phase1')}
                                icon={Play}
                              >
                                Start Phase 1
                              </Button>
                            )}
                            <RowActionMenu
                              fadeOnHover={true}
                              items={[
                                {
                                  label: isPassed
                                    ? 'Review Attempt'
                                    : isPhase2
                                    ? 'Start Phase 2'
                                    : isWaitingFacultyUnlock
                                    ? 'View Phase 1 Submission'
                                    : isDeadlineExpired
                                    ? 'Deadline Expired (Cannot Submit)'
                                    : 'Open Phase 1 Editor',
                                  icon: isPassed
                                    ? Eye
                                    : isPhase2
                                    ? Bug
                                    : isDeadlineExpired
                                    ? Lock
                                    : Play,
                                  disabled: isDeadlineExpired,
                                  onClick: () => {
                                    if (isDeadlineExpired) return;
                                    onSelectAssignment(asg.id, isPhase2 ? 'phase2' : 'phase1');
                                  },
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Your Progress Circular Card */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Your Progress</h2>
            <p className="text-xs text-slate-500">Overall comprehension verification</p>
          </div>

          {/* Circular Progress Gauge */}
          <div className="py-2">
            <CircularProgress
              value={passRate}
              size={140}
              strokeWidth={12}
              label={`${passRate}%`}
              sublabel="Overall Completion"
            />
          </div>

          {/* Breakdown Items */}
          <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Completed &amp; Verified</span>
              <span className="font-semibold text-slate-900 tabular-nums">{completed} items</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Pending Assignments</span>
              <span className="font-semibold text-slate-900 tabular-nums">{pending} items</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Evaluation Standard</span>
              <span className="font-semibold text-emerald-600">Deterministic Sandbox</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-xs text-emerald-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Phase 2 Verified</span>
            </div>
            <p className="text-[11px] text-emerald-800/80 leading-relaxed">
              Every passed assignment has successfully undergone controlled debug verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
