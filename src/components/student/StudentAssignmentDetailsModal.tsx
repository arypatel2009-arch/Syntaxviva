import React from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Code2,
  CheckCircle2,
  FileCode,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Lock,
} from 'lucide-react';
import { Assignment } from '../../types/index.ts';
import { Button, Badge } from '../common/UIComponents.tsx';

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

interface StudentAssignmentDetailsModalProps {
  assignment: Assignment | null;
  onClose: () => void;
  onStart: (assignmentId: string, phase?: 'phase1' | 'phase2') => void;
}

export const StudentAssignmentDetailsModal: React.FC<StudentAssignmentDetailsModalProps> = ({
  assignment,
  onClose,
  onStart,
}) => {
  if (!assignment) return null;

  let parsedTestCases: any[] = [];
  try {
    if (assignment.testCasesJson) {
      parsedTestCases = JSON.parse(assignment.testCasesJson);
    }
  } catch {
    parsedTestCases = [];
  }

  const myState = (assignment as any).myAttemptState;
  const p2Status = (assignment as any).myPhase2Status;
  const isPassed = myState === 'PASSED' || myState === 'PHASE2_PASSED' || p2Status === 'PHASE2_PASSED';
  const isPhase1Done = Boolean(
    (assignment as any).mySubmittedAt ||
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
    assignment.phase2Unlocked ||
      assignment.phase2_unlocked ||
      myState === 'PHASE2_ACTIVE' ||
      p2Status === 'PHASE2_ACTIVE'
  );
  const isPhase2 = !isPassed && isPhase1Done && isFacultyUnlocked;
  const isWaitingFacultyUnlock = !isPassed && isPhase1Done && !isFacultyUnlocked;
  const rawDueDate = assignment.dueDate || (assignment as any).due_date;
  const isDeadlineExpired =
    !isPhase1Done &&
    !isPassed &&
    (Boolean((assignment as any).isDeadlinePassed) || isAssignmentDeadlinePassed(rawDueDate));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                {assignment.language}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {assignment.id}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{assignment.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 font-semibold">Instructor</span>
              <div className="font-bold text-slate-800 mt-0.5">
                {assignment.createdByName || 'Faculty'}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Due Date</span>
              <div className="font-bold text-slate-800 mt-0.5">
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Status</span>
              <div className="mt-0.5">
                {isPassed ? (
                  <Badge variant="success" size="sm">
                    Passed
                  </Badge>
                ) : isPhase2 ? (
                  <Badge variant="warning" size="sm">
                    Phase 2 Ready
                  </Badge>
                ) : isWaitingFacultyUnlock ? (
                  <Badge variant="neutral" size="sm">
                    Phase 2 Locked by Faculty
                  </Badge>
                ) : isDeadlineExpired ? (
                  <Badge variant="danger" size="sm">
                    Deadline Expired — Not Submitted
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Problem Description
            </h3>
            <p className="text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {assignment.description}
            </p>
          </div>

          {/* Requirements */}
          {assignment.requirements && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Technical Requirements
              </h3>
              <p className="text-slate-700 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed whitespace-pre-wrap">
                {assignment.requirements}
              </p>
            </div>
          )}

          {/* Public Test Cases */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Public Test Cases ({parsedTestCases.length})
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">
                Deterministic Sandbox Run
              </span>
            </div>

            <div className="space-y-2">
              {parsedTestCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-mono flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>Test Case #{idx + 1}</span>
                    {tc.description && (
                      <span className="text-[11px] font-normal text-slate-500 font-sans">
                        {tc.description}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-slate-600">
                    <div>
                      <span className="text-slate-400">Input:</span>{' '}
                      <span className="text-slate-900">{JSON.stringify(tc.input)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Expected:</span>{' '}
                      <span className="text-emerald-700 font-bold">{JSON.stringify(tc.expected)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <Button variant="outline" size="md" onClick={onClose}>
            Close
          </Button>

          {isDeadlineExpired ? (
            <Button variant="danger" size="md" disabled icon={Lock}>
              Deadline Expired (Cannot Submit)
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onClose();
                onStart(assignment.id, isPhase2 ? 'phase2' : 'phase1');
              }}
              icon={ArrowRight}
              iconPosition="right"
            >
              {isPassed
                ? 'Review Submission'
                : isPhase2
                ? 'Start Phase 2'
                : isWaitingFacultyUnlock
                ? 'View Phase 1 (Waiting for Faculty)'
                : 'Start Phase 1'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
