import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Award,
  ArrowLeft,
  Download,
  Code2,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Maximize2,
} from 'lucide-react';
import { Button, CircularProgress, Badge } from '../common/UIComponents.tsx';
import { Assignment } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { DeveloperCodeEditor, BugAnnotation } from '../common/CodeEditorModal.tsx';

interface StudentResultsViewProps {
  assignment?: Assignment | null;
  onBackToDashboard: () => void;
  onReviewSubmission: () => void;
  onRetryPhase2?: () => void;
  onViewFullResult?: (assignment: Assignment) => void;
}

export const StudentResultsView: React.FC<StudentResultsViewProps> = ({
  assignment,
  onBackToDashboard,
  onReviewSubmission,
  onRetryPhase2,
  onViewFullResult,
}) => {
  const [phase2Data, setPhase2Data] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const myState = (assignment as any)?.myAttemptState;
  const p2Status = (assignment as any)?.myPhase2Status;

  const isPassed =
    myState === 'PASSED' ||
    myState === 'PHASE2_PASSED' ||
    p2Status === 'PHASE2_PASSED' ||
    phase2Data?.state === 'PHASE2_PASSED' ||
    phase2Data?.challengeStatus === 'PASSED';

  const isFailed =
    myState === 'PHASE2_FAILED' ||
    myState === 'FAILED' ||
    p2Status === 'PHASE2_FAILED' ||
    p2Status === 'SECURITY_TERMINATED' ||
    phase2Data?.state === 'PHASE2_FAILED' ||
    phase2Data?.challengeStatus === 'FAILED';

  useEffect(() => {
    if (!assignment?.id) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    api
      .getStudentPhase2(assignment.id)
      .then((res) => {
        if (isMounted) {
          setPhase2Data(res);
        }
      })
      .catch((err) => {
        console.warn('Failed to load phase2 details for results report:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [assignment?.id]);

  const bugReports: any[] = useMemo(() => {
    const fromEval = phase2Data?.evaluation?.bugReports;
    if (Array.isArray(fromEval) && fromEval.length > 0) return fromEval;
    const fromTop = phase2Data?.bugReports;
    if (Array.isArray(fromTop) && fromTop.length > 0) return fromTop;
    const bugs = phase2Data?.bugs || [];
    return bugs.map((b: any, idx: number) => ({
      bugIndex: b.bugIndex || idx + 1,
      name: b.name,
      category: b.category,
      description: b.description,
      location: b.location || { line: 1, column: 0 },
      mutatedFragment: b.mutatedFragment,
      originalFragment: b.originalFragment,
      isFixed: isPassed,
      status: isPassed ? 'FIXED' : 'NOT_FIXED',
      explanation: isPassed
        ? `Defect #${b.bugIndex || idx + 1} resolved.`
        : `Defect #${b.bugIndex || idx + 1} (${b.name}) at Line ${b.location?.line || '?'}: ${b.description}`,
    }));
  }, [phase2Data, isPassed]);

  const bugAnnotations: BugAnnotation[] = useMemo(() => {
    return bugReports.map((b) => ({
      line: b.location?.line || 1,
      name: b.name,
      category: b.category,
      message: b.explanation || b.description,
      mutatedFragment: b.mutatedFragment,
      originalFragment: b.originalFragment,
      isFixed: b.isFixed,
    }));
  }, [bugReports]);

  const codeToView = phase2Data?.finalCode || phase2Data?.mutatedCode || '';
  const score = phase2Data?.score ?? phase2Data?.evaluation?.score ?? (isPassed ? 100 : 0);

  if (!assignment || (!isPassed && !isFailed && !loading)) {
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
    <div className="max-w-5xl mx-auto space-y-6 py-4">
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
          Assignment ID: {assignment.id}
        </span>
      </div>

      {/* Main Results Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Verification Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              {isPassed ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Phase 2 Verification: PASSED</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Phase 2 Verification: FAILED</span>
                </div>
              )}
              <span className={`px-3 py-1 font-mono font-bold rounded-full text-xs text-white ${isPassed ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                Score: {score}/100
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
              {assignment.title}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              {isPassed
                ? 'Aapne sabhi injected defects ko successfully find karke repair kiya aur evaluation pass kiya.'
                : 'Agar 1 bhi bug find nahi kiya to Phase 2 fail hota hai. Niche di gayi report me dekhein aapne kahan bhool ki hai aur code me red wavy underline se bugs mark kiye gaye hain.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onViewFullResult && assignment && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onViewFullResult(assignment)}
                icon={Maximize2}
              >
                Full Screen Dossier (Badi Screen)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDashboard}
            >
              Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReviewSubmission}
            >
              Review Code
            </Button>
          </div>
        </div>

        {/* Defect Inspection & Mistake Diagnosis ("Kahan Bhool Hui Hai") */}
        {bugReports.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span>Defect Inspection &amp; Mistake Diagnosis (Aapki Bhool):</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {bugReports.filter((b) => b.isFixed).length} / {bugReports.length} Bugs Resolved
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {bugReports.map((b: any, idx: number) => {
                const isBugFixed = Boolean(b.isFixed);
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isBugFixed
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/70 border-rose-300 text-rose-950 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        {isBugFixed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-700" />
                            NOT FIXED (Missed)
                          </span>
                        )}
                        <span className="font-bold text-xs">
                          Bug #{b.bugIndex}: {b.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ({b.category || 'Algorithm Logic'})
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        Line {b.location?.line || '?'}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-2 text-xs">
                      {!isBugFixed && (
                        <div className="p-2.5 bg-white rounded-xl border border-rose-200">
                          <span className="font-bold text-rose-900 block mb-1">
                            ❌ Code me yahan bhool thi (Injected Bug):
                          </span>
                          <div className="font-mono text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1.5 rounded border border-rose-200 underline decoration-wavy decoration-rose-600 decoration-2 underline-offset-4 overflow-x-auto">
                            {b.mutatedFragment || '(Injected defect fragment)'}
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                        <span className="font-bold text-emerald-900 block mb-1">
                          ✅ Sahi code kya hona chahiye tha (Expected Fix):
                        </span>
                        <div className="font-mono text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200 overflow-x-auto">
                          {b.originalFragment || '(Baseline original code)'}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 leading-relaxed pt-1">
                        <strong>Defect Details:</strong> {b.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Code View with Red Wavy Underlines on Missed Bugs */}
        {codeToView && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-700" />
                <span>Submitted Code Review (Red Wavy Underline marks defects):</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono uppercase">
                {assignment.language || 'python'}
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
              <DeveloperCodeEditor
                value={codeToView}
                onChange={() => {}}
                language={assignment.language || 'python'}
                readOnly={true}
                minHeight={320}
                filename={`submission.${assignment.language === 'cpp' ? 'cpp' : 'py'}`}
                minimalToolbar={true}
                bugAnnotations={bugAnnotations}
                showBugAnnotations={true}
              />
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <Button
            variant="ghost"
            size="md"
            onClick={onBackToDashboard}
            icon={ArrowLeft}
          >
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={onReviewSubmission}
              icon={Code2}
            >
              Open Full Workspace
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
