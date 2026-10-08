import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  Code2,
  FileCode,
  AlertCircle,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Assignment, StudentAttempt } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { DeveloperCodeEditor, formatCodeLikeVSCode } from './common/CodeEditorModal.tsx';

interface Phase1SubmissionViewProps {
  assignmentId: string;
  onBack: () => void;
  onOpenPhase2?: () => void;
}

export const Phase1SubmissionView: React.FC<Phase1SubmissionViewProps> = ({
  assignmentId,
  onBack,
  onOpenPhase2,
}) => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Clear any legacy localStorage keys on mount
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('syntaxviva_solution')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  // Fetch assignment & existing attempt
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);

    api
      .getStudentPhase1(assignmentId)
      .then((res) => {
        if (!isMounted) return;
        const lang = res.assignment.language || 'python';
        setAssignment(res.assignment);
        setLanguage(lang);

        if (res.attempt) {
          setAttempt(res.attempt);
          if (res.attempt.originalCode) {
            const rawOrig = res.attempt.originalCode;
            const formattedOrig = formatCodeLikeVSCode(rawOrig, res.attempt.language || lang);
            setCode(formattedOrig);
          } else {
            setCode('');
          }
        } else {
          setCode('');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Failed to load assignment details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [assignmentId]);

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

  const isTerminated =
    attempt?.state === 'SECURITY_TERMINATED' && Boolean(attempt?.mutationStatus);

  const isSubmitted =
    !isTerminated &&
    (attempt?.state === 'MUTATION_READY' ||
      attempt?.state === 'PHASE1_PASSED' ||
      attempt?.state === 'PHASE2_READY' ||
      attempt?.state === 'PHASE2_ACTIVE' ||
      attempt?.state === 'PHASE2_SUBMITTED' ||
      attempt?.state === 'PHASE2_PASSED' ||
      attempt?.state === 'PHASE2_FAILED' ||
      (Boolean(attempt?.submittedAt) && attempt?.state !== 'PHASE1_FAILED'));

  const isDeadlineExpired =
    !isSubmitted &&
    !isTerminated &&
    (Boolean((assignment as any)?.isDeadlinePassed) ||
      isAssignmentDeadlinePassed(assignment?.dueDate || (assignment as any)?.due_date));

  let aiEval: any = null;
  if (attempt?.evaluationResultJson) {
    try {
      aiEval = JSON.parse(attempt.evaluationResultJson);
    } catch {
      aiEval = null;
    }
  }

  // Direct Submission Handler (Phase 1 Gemini AI Code Evaluation)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (isDeadlineExpired) {
      setErrorMessage(
        'Assignment deadline has expired! You can no longer submit this assignment.'
      );
      return;
    }

    if (!code || code.trim().length === 0) {
      setErrorMessage('Submission code cannot be empty.');
      return;
    }

    const finalCodeToSubmit = code;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.submitStudentPhase1(assignmentId, {
        code: finalCodeToSubmit,
        language,
      });

      const submittedAttempt: any = {
        ...res.submission,
        evaluationResultJson: res.evaluation ? JSON.stringify(res.evaluation) : res.submission?.evaluationResultJson,
        mutationStatus: res.mutation?.status || (res.submission as any)?.state || 'MUTATION_READY',
      };
      setAttempt(submittedAttempt as StudentAttempt);
      setSuccessNotice(res.message || 'Phase 1 code approved by Gemini AI.');
    } catch (err: any) {
      if (err.evaluation) {
        const failedAttempt: any = {
          ...err.submission,
          state: 'PHASE1_FAILED',
          evaluationResultJson: JSON.stringify(err.evaluation),
          failureReason: err.error || err.message,
        };
        setAttempt(failedAttempt as StudentAttempt);
      }
      setErrorMessage(err.message || 'Failed to submit Phase 1 code for AI evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Automatically poll for Faculty Phase 2 unlock while Phase 1 screen is open
  useEffect(() => {
    if (Boolean(assignment?.phase2Unlocked || assignment?.phase2_unlocked)) {
      return;
    }
    const interval = setInterval(() => {
      api
        .getStudentPhase1(assignmentId)
        .then((res) => {
          if (res?.assignment) {
            setAssignment(res.assignment);
          }
          if (res?.attempt) {
            setAttempt(res.attempt);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [assignmentId, assignment?.phase2Unlocked, assignment?.phase2_unlocked]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading Phase 1 assignment environment...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assignments
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
          {errorMessage || 'Assignment not found.'}
        </div>
      </div>
    );
  }

  const isPhase2UnlockedByFaculty = Boolean(
    assignment.phase2Unlocked ||
      assignment.phase2_unlocked ||
      attempt?.state === 'PHASE2_ACTIVE' ||
      attempt?.state === 'PHASE2_SUBMITTED' ||
      attempt?.state === 'PHASE2_PASSED' ||
      attempt?.state === 'PHASE2_FAILED'
  );

  const isMutationPrepared = Boolean(!isTerminated && onOpenPhase2 && isSubmitted);
  const isPhase2Ready = Boolean(
    !isTerminated && onOpenPhase2 && isSubmitted && isPhase2UnlockedByFaculty
  );
  const linesCount = code ? code.split('\n').length : 1;
  const charsCount = code.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            id="btn-phase1-back"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Return to Assignments"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                Phase 1 Intake
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {isTerminated
                  ? 'EXAM CANCELLED'
                  : isSubmitted
                  ? 'SUBMITTED'
                  : isDeadlineExpired
                  ? 'DEADLINE EXPIRED'
                  : 'DIRECT INTAKE'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">{assignment.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Language</div>
            <div className="text-xs font-mono font-bold text-slate-800 capitalize">{assignment.language}</div>
          </div>
          <span className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Status</div>
            <div className="text-xs font-semibold">
              {isTerminated ? (
                <span className="text-rose-700 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Exam Cancelled
                </span>
              ) : isSubmitted ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                </span>
              ) : isDeadlineExpired ? (
                <span className="text-rose-700 font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Deadline Expired — Not Submitted
                </span>
              ) : (
                <span className="text-blue-600 font-medium">Ready for Submission</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deadline Expired Banner */}
      {isDeadlineExpired && (
        <div
          id="phase1-deadline-expired-banner"
          className="p-6 bg-rose-50 border-2 border-rose-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                  Deadline Expired — Submission Closed
                </span>
                {assignment.dueDate && (
                  <span className="text-xs text-rose-700 font-mono">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Deadline khatam ho chuki hai! Ab aap yeh assignment submit nahi kar sakte.
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                The submission deadline for this assignment has expired. Because no submission was received before the deadline, this assignment is marked as Not Submitted in the Faculty account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shrink-0"
          >
            Back to Assignments
          </button>
        </div>
      )}

      {/* Exam Cancelled / Security Terminated Banner */}
      {isTerminated && (
        <div className="p-6 bg-rose-50 border-2 border-rose-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                  Exam Cancelled &amp; Locked
                </span>
                <span className="text-xs text-rose-700 font-mono">Reported to Faculty</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {attempt?.failureReason ||
                  'Exam Cancelled: Student pressed Back, minimized window, or closed browser tab.'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                Navigating back, minimizing the window, switching tabs, or closing the tab during Phase 2 cancels the exam and records the violation in the Faculty dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shrink-0"
          >
            Back to Assignments
          </button>
        </div>
      )}

      {/* Error or Success Flash Notifications */}
      {errorMessage && (
        <div
          id="phase1-error-banner"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start justify-between gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-900 shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {successNotice && (
        <div
          id="phase1-success-banner"
          className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-emerald-950">{successNotice}</div>
              <div className="text-emerald-800 text-xs mt-0.5">
                Your Phase 1 code has been submitted and stored.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {isPhase2Ready && (
              <button
                id="btn-success-banner-enter-phase2"
                type="button"
                onClick={onOpenPhase2}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-sm shadow-purple-500/25 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Start Phase 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setSuccessNotice(null)}
              className="px-3 py-2 text-xs font-medium text-emerald-700 hover:text-emerald-950 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Already Submitted Status Banner */}
      {isSubmitted && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PHASE 1 — SUBMITTED
                </span>
                <span className="text-xs text-slate-500 font-mono">ID: {attempt?.id}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Phase 1 Code Submitted
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Your Phase 1 solution has been recorded.
                {isPhase2UnlockedByFaculty
                  ? ' Phase 2 is unlocked by Faculty and ready to start.'
                  : ' Phase 2 will unlock once your Faculty unlocks it from the Faculty Dashboard.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-start md:self-auto">
              {isPhase2Ready && (
                <button
                  id="btn-banner-enter-phase2"
                  type="button"
                  onClick={onOpenPhase2}
                  className="px-4 py-3 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-sm shadow-purple-500/25 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>
                    {attempt?.state === 'PHASE2_SUBMITTED'
                      ? 'View Phase 2'
                      : attempt?.state === 'PHASE2_ACTIVE'
                      ? 'Resume Phase 2'
                      : 'Start Phase 2'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 2 Locked by Faculty Callout Card */}
      {isSubmitted && isMutationPrepared && !isPhase2UnlockedByFaculty && (
        <div
          id="phase2-faculty-locked-callout"
          className="p-6 bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-wider">
                  Phase 2 Locked by Faculty
                </span>
                <span className="text-xs text-amber-700 font-mono">Waiting for Faculty Unlock</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Waiting for Faculty to Unlock Phase 2
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
                Your Phase 1 code is submitted. Phase 2 can only be unlocked from the Faculty account — as soon as your Faculty clicks &ldquo;Unlock Phase 2&rdquo;, Phase 2 will automatically unlock for you.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-amber-200 text-xs font-semibold text-amber-800 shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Locked Until Faculty Unlocks</span>
          </div>
        </div>
      )}

      {/* Main Grid: Assignment Details (Left) + VS Code Style Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Problem Statement & Requirements */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Problem Statement</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{assignment.title}</h3>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/60 p-4 rounded-xl border border-slate-100">
              {assignment.description}
            </div>

            {assignment.requirements && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Functional Requirements
                </span>
                <div className="mt-1.5 text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {assignment.requirements}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                Language: <strong className="text-slate-800 uppercase font-mono">{assignment.language}</strong>
              </span>
              {assignment.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Due {new Date(assignment.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Phase 1 Information Card */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Phase 1: Gemini AI Evaluation
            </div>
            <p className="text-blue-800 leading-relaxed text-[11px]">
              Submit your code to have Gemini AI evaluate your implementation against the problem statement.
            </p>
          </div>

          {/* Gemini AI Evaluation Feedback Card */}
          {aiEval && (
            <div
              className={`border rounded-2xl p-5 space-y-3 shadow-xs ${
                aiEval.is_correct || aiEval.result === 'PASS'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Gemini AI Evaluation</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    aiEval.is_correct || aiEval.result === 'PASS'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {aiEval.result || (aiEval.is_correct ? 'PASS' : 'FAIL')} • Score: {aiEval.score ?? 'N/A'}/100
                </span>
              </div>

              <p className="text-xs font-medium leading-relaxed">{aiEval.summary}</p>

              {Array.isArray(aiEval.issues) && aiEval.issues.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-rose-200/70">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                    Identified Issues:
                  </span>
                  <ul className="list-disc list-inside text-xs text-rose-900 space-y-0.5">
                    {aiEval.issues.map((issue: string, idx: number) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(aiEval.suggestions) && aiEval.suggestions.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Suggestions:
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-800 space-y-0.5">
                    {aiEval.suggestions.map((sugg: string, idx: number) => (
                      <li key={idx}>{sugg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: VS Code Style Editor with ONLY Submit Option */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            {/* Editor Header */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {language === 'java'
                    ? 'Main.java'
                    : `solution.${
                        language === 'python'
                          ? 'py'
                          : language === 'javascript'
                          ? 'js'
                          : language === 'typescript'
                          ? 'ts'
                          : language === 'cpp'
                          ? 'cpp'
                          : 'c'
                      }`}
                </span>
                {(isSubmitted || isTerminated || isDeadlineExpired) && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      isTerminated || isDeadlineExpired
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <Lock className="w-2.5 h-2.5" />{' '}
                    {isTerminated
                      ? 'Locked (Exam Cancelled)'
                      : isDeadlineExpired
                      ? 'Locked (Deadline Expired)'
                      : 'Submitted'}
                  </span>
                )}
              </div>
            </div>

            {/* VS Code Style Editor */}
            <div className="relative p-2 bg-slate-950">
              <DeveloperCodeEditor
                value={code}
                onChange={(nextVal) => {
                  setCode(nextVal);
                  if (errorMessage) setErrorMessage(null);
                }}
                language={language}
                onLanguageChange={
                  isSubmitted || isTerminated || isDeadlineExpired ? undefined : setLanguage
                }
                readOnly={isSubmitted || isTerminated || isDeadlineExpired}
                minHeight={430}
                minimalToolbar={false}
                filename={
                  language === 'java'
                    ? 'Main.java'
                    : `solution.${
                        language === 'python'
                          ? 'py'
                          : language === 'javascript'
                          ? 'js'
                          : language === 'typescript'
                          ? 'ts'
                          : language === 'cpp'
                          ? 'cpp'
                          : 'c'
                      }`
                }
              />
            </div>

            {/* Bottom Bar: ONLY Submit Option in Phase 1 */}
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                <span>{linesCount} lines</span>
                <span>•</span>
                <span>{charsCount} characters</span>
              </div>

              {isTerminated ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onBack}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
                  >
                    Back to Assignments
                  </button>
                </div>
              ) : isDeadlineExpired ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 px-4 py-2 rounded-xl border border-rose-200">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    Deadline Expired — Cannot Submit
                  </span>
                  <button
                    onClick={onBack}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
                  >
                    Back to Assignments
                  </button>
                </div>
              ) : isSubmitted ? (
                <div className="flex items-center gap-2">
                  {isPhase2Ready && onOpenPhase2 ? (
                    <button
                      id="btn-bottom-enter-phase2"
                      type="button"
                      onClick={onOpenPhase2}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-sm shadow-purple-500/25 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>
                        {attempt?.state === 'PHASE2_SUBMITTED'
                          ? 'View Phase 2'
                          : attempt?.state === 'PHASE2_ACTIVE'
                          ? 'Resume Phase 2'
                          : 'Start Phase 2'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Phase 1 Submitted
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    id="btn-submit-phase1-code"
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitting || !code.trim()}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm ${
                      submitting || !code.trim()
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating with Gemini AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Submit for Gemini AI Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
