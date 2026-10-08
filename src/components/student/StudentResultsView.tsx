import React from 'react';
import {
  CheckCircle2,
  Award,
  ArrowLeft,
  Download,
  Code2,
  FileCode,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button, CircularProgress, Badge } from '../common/UIComponents.tsx';
import { Assignment } from '../../types/index.ts';

interface StudentResultsViewProps {
  assignment?: Assignment | null;
  onBackToDashboard: () => void;
  onReviewSubmission: () => void;
}

export const StudentResultsView: React.FC<StudentResultsViewProps> = ({
  assignment,
  onBackToDashboard,
  onReviewSubmission,
}) => {
  const isPassed =
    (assignment as any)?.myAttemptState === 'PASSED' ||
    (assignment as any)?.myAttemptState === 'PHASE2_PASSED' ||
    (assignment as any)?.myPhase2Status === 'PHASE2_PASSED';

  if (!assignment || !isPassed) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 shadow-2xs text-center space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">No Assessment Results Available</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            You have not completed Phase 2 verification yet. Complete Phase 1 and Phase 2 on any active assignment to view results.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="md" onClick={onBackToDashboard}>
              Return to Assignments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <span className="text-xs font-mono text-slate-400">
          Assignment: {assignment.id}
        </span>
      </div>

      {/* Main Results Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-sm text-center space-y-8">
        {/* Verification Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Phase 2 Verification: PASSED</span>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2 max-w-lg mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {assignment.title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            You successfully repaired the targeted AST mutation in your submission and
            passed all deterministic test suites within the proctored sandbox environment.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left pt-4 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Language
            </span>
            <div className="text-lg font-extrabold text-slate-900 font-mono uppercase">{assignment.language}</div>
            <span className="text-[11px] text-slate-500 font-medium">Deterministic</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Phase 1 Status
            </span>
            <div className="text-lg font-extrabold text-emerald-600 font-mono">Submitted</div>
            <span className="text-[11px] text-emerald-600 font-medium">Tests Passed</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Phase 2 Status
            </span>
            <div className="text-lg font-extrabold text-emerald-600 font-mono">Verified</div>
            <span className="text-[11px] text-emerald-600 font-medium">Bug Repaired</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Proctoring
            </span>
            <div className="text-lg font-extrabold text-emerald-600 font-mono">Integrity OK</div>
            <span className="text-[11px] text-slate-500 font-medium">Session Logged</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onReviewSubmission}
            icon={Code2}
            iconPosition="left"
          >
            Review Code & Diff
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onBackToDashboard}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
