import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  FileCode,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Info,
  Code2,
  Send,
  ShieldAlert,
  XCircle,
  Maximize2,
  Shield,
  AlertOctagon,
  Play,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { toast } from './common/Toast.tsx';
import { Assignment, Phase2StatusResponse, TestRunResponse, TestRunResult } from '../types/index.ts';
import { ProctoringManager } from '../lib/proctoring/proctoringManager.ts';
import { ProctoringState } from '../lib/proctoring/types.ts';
import { DeveloperCodeEditor, formatCodeLikeVSCode, BugAnnotation } from './common/CodeEditorModal.tsx';
import { LargeSubmissionResultModal } from './common/LargeSubmissionResultModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface Phase2ChallengeViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const Phase2ChallengeView: React.FC<Phase2ChallengeViewProps> = ({
  assignmentId,
  onBack,
}) => {
  const { user, profile } = useAuth();

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [phase2State, setPhase2State] = useState<Phase2StatusResponse | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  // Active Challenge State
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
  const [initialMutatedCode, setInitialMutatedCode] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [phase1BaselineCode, setPhase1BaselineCode] = useState<string>('');

  // Timer State (Server-Authoritative)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(180);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Interaction State
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasClickedSubmitOnce, setHasClickedSubmitOnce] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [testRunOutcome, setTestRunOutcome] = useState<TestRunResponse | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [selectedTestIndex, setSelectedTestIndex] = useState(0);
  const [editorMode, setEditorMode] = useState<'diagnostic' | 'standard'>('diagnostic');
  // Authoritative error message state with automatic Gemini/API key suppression
  const [errorMessage, setRawErrorMessage] = useState<string | null>(null);
  const setErrorMessage = (msg: string | null) => {
    if (!msg) {
      setRawErrorMessage(null);
      return;
    }
    const lower = msg.toLowerCase();
    if (lower.includes('gemini') || lower.includes('api key') || lower.includes('gemini_api_key')) {
      setRawErrorMessage(null);
      return;
    }
    setRawErrorMessage(msg);
  };
  const setSafeErrorMessage = setErrorMessage;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Proctoring & Security State (Non-Camera Integrity)
  const [proctoringState, setProctoringState] = useState<ProctoringState>({
    isFullscreen: false,
    isMonitoring: false,
    warningsCount: 0,
    maxWarnings: 3,
    isTerminated: false,
  });
  const [warningNotice, setWarningNotice] = useState<{ message: string; count: number; max: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerIntervalRef = useRef<any>(null);
  const proctoringManagerRef = useRef<ProctoringManager | null>(null);

  const isSubmitted =
    hasClickedSubmitOnce ||
    phase2State?.state === 'PHASE2_SUBMITTED' ||
    phase2State?.state === 'PHASE2_PASSED' ||
    phase2State?.state === 'PHASE2_FAILED';
  const isChallengeActive =
    phase2State?.state === 'PHASE2_ACTIVE' &&
    !isSubmitted &&
    !isExpired &&
    remainingSeconds > 0 &&
    !proctoringState.isTerminated;
  const isPassed =
    phase2State?.state === 'PHASE2_PASSED' || phase2State?.evaluationStatus === 'PASSED';
  const isFailed =
    phase2State?.state === 'PHASE2_FAILED' || phase2State?.evaluationStatus === 'FAILED';

  const bugReports: any[] = useMemo(() => {
    const fromEval = (phase2State as any)?.evaluation?.bugReports;
    const rawList = (Array.isArray(fromEval) && fromEval.length > 0)
      ? fromEval
      : (Array.isArray((phase2State as any)?.bugReports) && (phase2State as any).bugReports.length > 0)
      ? (phase2State as any).bugReports
      : (Array.isArray(phase2State?.bugs) ? phase2State.bugs : []);

    return rawList.map((b: any, idx: number) => {
      const isFixed = isFailed ? false : (b.isFixed !== undefined ? Boolean(b.isFixed) : isPassed);
      const lineNum = b.location?.line || b.line || idx + 1;
      return {
        bugIndex: b.bugIndex || idx + 1,
        name: b.name || `Defect #${idx + 1}`,
        category: b.category || 'Logic',
        description: b.description || 'Injected defect',
        location: { line: lineNum, column: 0 },
        mutatedFragment: b.mutatedFragment || '',
        originalFragment: b.originalFragment || '',
        isFixed,
        status: isFixed ? 'FIXED' : 'NOT_FIXED',
        explanation: b.explanation || (isFixed ? `Defect #${idx + 1} resolved.` : `Mistake on Line ${lineNum}: Defect '${b.name}' was not modified.`),
      };
    });
  }, [phase2State, isPassed, isFailed]);

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

  const totalBugs = bugReports.length || 3;
  const fixedCount = isFailed ? 0 : bugReports.filter((b) => b.isFixed).length;
  const missedCount = isFailed ? totalBugs : totalBugs - fixedCount;
  const score = isFailed ? 0 : (isPassed ? 100 : ((phase2State as any)?.evaluation?.score ?? (phase2State as any)?.score ?? 0));

  // Full-Screen Badi Screen Dossier Data
  const submissionForModal = useMemo(() => {
    if (!isSubmitted && !isFailed && !isPassed) return null;

    const evalObj = (phase2State as any)?.evaluation || {};
    const finalScore = isFailed ? 0 : (isPassed ? 100 : ((phase2State as any)?.evaluation?.score ?? (phase2State as any)?.score ?? 0));

    return {
      id: (phase2State as any)?.challengeId || assignmentId,
      assignmentId,
      assignmentTitle: assignment?.title || (phase2State as any)?.assignment?.title || 'Assignment Defense',
      assignmentLanguage: assignment?.language || (phase2State as any)?.language || language || 'c',
      language: assignment?.language || (phase2State as any)?.language || language || 'c',
      studentName: profile?.full_name || user?.name || user?.email?.split('@')[0] || 'Student',
      studentRollNumber: profile?.roll_number || (user as any)?.roll_number || user?.rollNumber || '—',
      studentDivisionId: profile?.division_id || (user as any)?.division || user?.divisionId || 'DIV A',
      studentEmail: user?.email || profile?.email || '',
      state: isPassed ? 'PASSED' : isFailed ? 'PHASE2_FAILED' : 'PHASE2_SUBMITTED',
      phase2Status: isPassed ? 'PASSED' : isFailed ? 'FAILED' : 'SUBMITTED',
      score: finalScore,
      submittedAt: (phase2State as any)?.submittedAt || new Date().toISOString(),
      summary: (phase2State as any)?.summary || evalObj?.summary || (isPassed ? 'All injected defects repaired.' : 'Phase 2 debugging failed: Injected defects were not resolved.'),
      failureReason: isFailed ? ((phase2State as any)?.summary || evalObj?.summary || 'Injected defects were not resolved.') : null,
      mutatedCode: (phase2State as any)?.mutatedCode || initialMutatedCode || '',
      repairedCode: (phase2State as any)?.finalCode || (phase2State as any)?.repairedCode || code || '',
      originalCode: (phase2State as any)?.originalCode || (phase2State as any)?.baselineCode || phase1BaselineCode || (isPassed ? ((phase2State as any)?.finalCode || code) : '') || '',
      phase1Code: (phase2State as any)?.originalCode || (phase2State as any)?.baselineCode || phase1BaselineCode || (isPassed ? ((phase2State as any)?.finalCode || code) : '') || '',
      baselineCode: (phase2State as any)?.originalCode || (phase2State as any)?.baselineCode || phase1BaselineCode || (isPassed ? ((phase2State as any)?.finalCode || code) : '') || '',
      solutionCode: (phase2State as any)?.solutionCode || (phase2State as any)?.referenceSolution || (assignment as any)?.starter_code || (assignment as any)?.starterCode || (phase2State as any)?.originalCode || phase1BaselineCode || ((phase2State as any)?.finalCode || code) || '',
      referenceSolution: (phase2State as any)?.solutionCode || (phase2State as any)?.referenceSolution || (assignment as any)?.starter_code || (assignment as any)?.starterCode || (phase2State as any)?.originalCode || phase1BaselineCode || ((phase2State as any)?.finalCode || code) || '',
      bugMutations: bugReports,
      bugReports: bugReports,
      evaluation: {
        score: finalScore,
        testsTotal: evalObj?.testsTotal || evalObj?.tests_total || 2,
        testsPassed: isPassed ? (evalObj?.testsTotal || evalObj?.tests_total || 2) : 0,
        testsFailed: isPassed ? 0 : 1,
        results: evalObj?.results || [],
        bugReports: bugReports,
        summary: (phase2State as any)?.summary || evalObj?.summary,
      },
      securityEvents: (proctoringState.violations || []).map((v) => ({
        id: v.id,
        eventType: v.type,
        severity: v.severity,
        details: v.details,
        timestamp: v.timestamp,
      })),
      vivaQuestions: (assignment as any)?.viva_questions_json ? (() => {
        try { return JSON.parse((assignment as any).viva_questions_json); } catch { return []; }
      })() : [],
    };
  }, [isSubmitted, isFailed, isPassed, phase2State, assignment, language, user, profile, code, initialMutatedCode, bugReports, proctoringState.violations, assignmentId]);

  // Immediate Security Fail / Direct Disqualification handler
  const handleSecurityFail = useCallback(
    (reason: string, eventType: string = 'CRITICAL_SECURITY_VIOLATION') => {
      setPhase2State((prev) =>
        prev
          ? {
              ...prev,
              state: 'SECURITY_TERMINATED',
              terminated: true,
              reason,
              failureReason: reason,
              evaluationStatus: 'FAILED',
            }
          : null
      );

      if (proctoringManagerRef.current) {
        proctoringManagerRef.current.reportViolation(eventType as any, 'CRITICAL', { reason });
      }

      api
        .terminatePhase2Challenge(assignmentId, {
          challengeId: challengeId || undefined,
          reason,
          eventType,
          code,
          language,
          phase: 'PHASE2',
          keepalive: true,
        })
        .catch((err) => {
          console.warn('Could not record Phase 2 cancellation:', err);
        });
    },
    [assignmentId, challengeId, code, language]
  );

  // Initialize ProctoringManager
  useEffect(() => {
    const manager = new ProctoringManager(assignmentId, challengeId || undefined, {
      onStateChange: (updated) => {
        setProctoringState(updated);
      },
      onWarning: (msg, count, max) => {
        setWarningNotice({ message: msg, count, max });
        setTimeout(() => setWarningNotice(null), 6000);
      },
      onTerminated: (reason) => {
        handleSecurityFail(reason, 'SECURITY_TERMINATION');
      },
    });

    proctoringManagerRef.current = manager;

    return () => {
      manager.stop();
    };
  }, [assignmentId, handleSecurityFail]);

  // Keep challengeId in sync with manager
  useEffect(() => {
    if (challengeId && proctoringManagerRef.current) {
      proctoringManagerRef.current.setChallengeId(challengeId);
    }
  }, [challengeId]);

  // Start proctoring monitoring when challenge becomes active
  useEffect(() => {
    if (isChallengeActive && proctoringManagerRef.current) {
      proctoringManagerRef.current.startMonitoring();
    }
  }, [isChallengeActive]);

  // 1. Fetch initial Phase 2 state
  const loadPhase2State = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const status = await api.getStudentPhase2(assignmentId);
      if (!status) {
        throw new Error('No status response returned from server.');
      }
      setPhase2State(status);

      if ((status as any)?.originalCode || (status as any)?.baselineCode) {
        setPhase1BaselineCode((status as any).originalCode || (status as any).baselineCode);
      } else {
        api.getStudentPhase1(assignmentId).then((p1) => {
          const p1Code = p1?.submission?.originalCode || (p1 as any)?.attempt?.original_code;
          if (p1Code) setPhase1BaselineCode(p1Code);
        }).catch(() => {});
      }

      const activeLang = status?.language || status?.assignment?.language || 'python';
      if (status?.assignment) {
        setAssignment(status.assignment);
      }
      setLanguage(activeLang);

      // If assessment terminated by security policy
      if (status.state === 'SECURITY_TERMINATED' || status.terminated) {
        setPhase2State(status);
        if (status.finalCode) setCode(formatCodeLikeVSCode(status.finalCode, activeLang));
        else if (status.mutatedCode) setCode(formatCodeLikeVSCode(status.mutatedCode, activeLang));
        return;
      }

      // If challenge already active
      if (status.state === 'PHASE2_ACTIVE' && status.challengeId && status.deadlineAt) {
        setChallengeId(status.challengeId);
        setDeadlineAt(status.deadlineAt);

        const initialCode = formatCodeLikeVSCode(status.mutatedCode || '', activeLang);
        setInitialMutatedCode(initialCode);
        setCode(initialCode);

        // Compute authoritative remaining seconds from server deadline
        const deadlineMs = new Date(status.deadlineAt).getTime();
        const nowMs = Date.now();
        const diffSec = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
        setRemainingSeconds(diffSec);

        if (diffSec <= 0) {
          setIsExpired(true);
        }

        if (typeof status.warningCount === 'number') {
          setProctoringState((prev) => ({
            ...prev,
            warningsCount: status.warningCount,
            maxWarnings: status.maxWarnings ?? 3,
          }));
          proctoringManagerRef.current?.setInitialWarningsCount(status.warningCount);
        }
      } else if (
        status.state === 'PHASE2_SUBMITTED' ||
        status.state === 'PHASE2_PASSED' ||
        status.state === 'PHASE2_FAILED'
      ) {
        setHasClickedSubmitOnce(true);
        if (status.challengeId) setChallengeId(status.challengeId);
        if (status.finalCode) setCode(formatCodeLikeVSCode(status.finalCode, activeLang));
        else if (status.mutatedCode) setCode(formatCodeLikeVSCode(status.mutatedCode, activeLang));
        if (status.mutatedCode) setInitialMutatedCode(formatCodeLikeVSCode(status.mutatedCode, activeLang));

        const loadedResults = status.results || status.evaluation?.results || [];
        if (Array.isArray(loadedResults) && loadedResults.length > 0) {
          const passedCnt = loadedResults.filter((r) => r.passed).length;
          setTestRunOutcome({
            success: true,
            testsTotal: loadedResults.length,
            testsPassed: passedCnt,
            testsFailed: loadedResults.length - passedCnt,
            results: loadedResults,
            durationMs: status.durationMs ?? status.evaluation?.durationMs ?? 0,
          });
          setShowTestPanel(true);
          setSelectedTestIndex(0);
        }

        if (status.evaluation) {
          setPhase2State((prev) => ({
            ...prev,
            ...status,
            evaluationStatus: (status.evaluation?.status as any) || status.evaluationStatus,
            testsTotal: status.evaluation?.testsTotal ?? status.testsTotal,
            testsPassed: status.evaluation?.testsPassed ?? status.testsPassed,
            testsFailed: status.evaluation?.testsFailed ?? status.testsFailed,
            failureReason: status.evaluation?.failureReason || status.failureReason,
          }));
        } else {
          setPhase2State((prev) => ({
            ...prev,
            ...status,
          }));
        }
      } else if (status.state === 'PHASE2_EXPIRED') {
        setIsExpired(true);
        if (status.mutatedCode) {
          setCode(status.mutatedCode);
          setInitialMutatedCode(status.mutatedCode);
        }
      }
    } catch (err: any) {
      console.error('Failed to load Phase 2 state:', err);
      setSafeErrorMessage(err.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadPhase2State();
  }, [loadPhase2State]);

  useEffect(() => {
    if (phase2State?.state !== 'PHASE2_LOCKED_BY_FACULTY') return;
    const interval = setInterval(() => {
      api
        .getStudentPhase2(assignmentId)
        .then((status) => {
          if (status && status.state !== 'PHASE2_LOCKED_BY_FACULTY') {
            setPhase2State(status);
            if (status.assignment) setAssignment(status.assignment);
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [assignmentId, phase2State?.state]);

  const handlePhase2BackClick = () => {
    if (isChallengeActive) {
      const reason = 'Exam Cancelled: Student pressed Back button during Phase 2 Viva';
      api
        .terminatePhase2Challenge(assignmentId, {
          challengeId: challengeId || undefined,
          reason,
          eventType: 'BACK_NAVIGATION',
          code,
          language,
          phase: 'PHASE2',
          keepalive: true,
        })
        .catch(() => {});
    }
    onBack();
  };

  // Client-side proctoring listener for tab switches / blur / minimize / tab close / browser back during active challenge
  useEffect(() => {
    if (!challengeId || !isChallengeActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityFail(
          'Exam Disqualified / Failed: Student switched browser tab or minimized window during Phase 2 Viva.',
          'TAB_SWITCH'
        );
      }
    };

    const handleWindowBlur = () => {
      handleSecurityFail(
        'Exam Disqualified / Failed: Assessment window lost focus or tab switched during Phase 2 Viva.',
        'WINDOW_BLUR'
      );
    };

    const handlePageHide = () => {
      handleSecurityFail(
        'Exam Disqualified / Failed: Student closed browser tab during Phase 2 Viva.',
        'TAB_CLOSED'
      );
    };

    const handleBeforeUnload = () => {
      handleSecurityFail(
        'Exam Disqualified / Failed: Student closed or reloaded browser tab during Phase 2 Viva.',
        'TAB_CLOSED'
      );
    };

    const handlePopState = () => {
      handleSecurityFail(
        'Exam Disqualified / Failed: Student pressed Back button during Phase 2 Viva.',
        'BACK_NAVIGATION'
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [challengeId, isChallengeActive, handleSecurityFail]);

  // 2. Server-Authoritative Timer Loop
  useEffect(() => {
    if (!deadlineAt || isExpired || phase2State?.state === 'PHASE2_SUBMITTED') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const updateTimer = () => {
      const deadlineMs = new Date(deadlineAt).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));

      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        setIsExpired(true);
        clearInterval(timerIntervalRef.current);
      }
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [deadlineAt, isExpired, phase2State?.state]);

  // 3. Start Phase 2 Challenge
  const handleStartChallenge = async () => {
    try {
      setStarting(true);
      setErrorMessage(null);

      const res = await api.startStudentPhase2(assignmentId);
      const formattedMutated = formatCodeLikeVSCode(res.mutatedCode, res.language || language);

      setChallengeId(res.challengeId);
      setDeadlineAt(res.deadlineAt);
      setInitialMutatedCode(formattedMutated);
      setCode(formattedMutated);
      setLanguage(res.language);
      setRemainingSeconds(res.remainingSeconds);
      setIsExpired(false);

      // Update local state to ACTIVE
      setPhase2State((prev) => ({
        ...(prev || { isAvailable: true, assignment: assignment || undefined }),
        isAvailable: true,
        state: 'PHASE2_ACTIVE',
        challengeId: res.challengeId,
        startedAt: res.startedAt,
        deadlineAt: res.deadlineAt,
        remainingSeconds: res.remainingSeconds,
        mutatedCode: formattedMutated,
        language: res.language,
        bugsCount: res.bugsCount || prev?.bugsCount || 3,
        bugs: res.bugs || prev?.bugs || [],
      }));
    } catch (err: any) {
      console.error('Failed to start Phase 2 challenge:', err);
      setSafeErrorMessage(err.message || 'Failed to start challenge. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  // 3b. Retake / Re-test Phase 2 with 3 Fresh Complex Defects
  const handleRetryChallenge = async () => {
    try {
      setStarting(true);
      setErrorMessage(null);
      const res = await api.retryStudentPhase2(assignmentId);
      const formattedMutated = formatCodeLikeVSCode(res.mutatedCode, res.language || language);

      setChallengeId(res.challengeId);
      setDeadlineAt(res.deadlineAt);
      setInitialMutatedCode(formattedMutated);
      setCode(formattedMutated);
      setLanguage(res.language);
      setRemainingSeconds(res.remainingSeconds);
      setIsExpired(false);
      setHasClickedSubmitOnce(false);

      setPhase2State({
        isAvailable: true,
        assignment: assignment || undefined,
        state: 'PHASE2_ACTIVE',
        challengeId: res.challengeId,
        startedAt: res.startedAt,
        deadlineAt: res.deadlineAt,
        remainingSeconds: res.remainingSeconds,
        mutatedCode: formattedMutated,
        language: res.language,
        bugsCount: res.bugsCount || 3,
        bugs: res.bugs || [],
      });
      toast.success('Phase 2 Challenge Started', '3 complex defects have been injected into your code.');
    } catch (err: any) {
      console.error('Failed to retry Phase 2:', err);
      setErrorMessage(err.message || 'Failed to start Phase 2 retry.');
    } finally {
      setStarting(false);
    }
  };

  // 4. Submit Phase 2 Fix (Strictly ONE-TIME ONLY)
  const handleSubmitFix = async () => {
    if (hasClickedSubmitOnce || isSubmitted || submitting) {
      return;
    }

    if (!challengeId) {
      setErrorMessage('No active challenge found.');
      return;
    }

    if (isExpired || remainingSeconds <= 0) {
      setErrorMessage('Time expired. This challenge can no longer be submitted.');
      return;
    }

    const formattedFinalCode = formatCodeLikeVSCode(code, language);
    if (formattedFinalCode !== code) {
      setCode(formattedFinalCode);
    }

    // Immediately lock submission so the Submit button can NEVER appear a second time
    setHasClickedSubmitOnce(true);

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const res = await api.submitStudentPhase2(assignmentId, {
        challengeId,
        finalCode: formattedFinalCode,
      });

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      if (res.results && Array.isArray(res.results) && res.results.length > 0) {
        const passedCnt = res.results.filter((r) => r.passed).length;
        setTestRunOutcome({
          success: true,
          testsTotal: res.results.length,
          testsPassed: passedCnt,
          testsFailed: res.results.length - passedCnt,
          results: res.results,
          durationMs: res.durationMs ?? 0,
        });
        setShowTestPanel(true);
        setSelectedTestIndex(0);
      }

      const isPass = res.evaluationStatus === 'PASSED';
      const evalScore = res.score !== undefined ? res.score : (isPass ? 100 : 0);

      setEditorMode('diagnostic');

      if (isPass) {
        setSuccessMessage(
          `Challenge PASSED! All ${res.testsPassed}/${res.testsTotal} deterministic test cases verified.`
        );

        setPhase2State((prev) => ({
          ...(prev || { isAvailable: false, assignment: assignment || undefined }),
          isAvailable: false,
          state: 'PHASE2_PASSED',
          challengeId,
          submittedAt: res.submittedAt,
          finalCode: formattedFinalCode,
          originalCode: (res as any)?.originalCode || phase1BaselineCode || (prev as any)?.originalCode || formattedFinalCode,
          baselineCode: (res as any)?.baselineCode || (res as any)?.originalCode || phase1BaselineCode || (prev as any)?.baselineCode || formattedFinalCode,
          phase1Code: (res as any)?.phase1Code || (res as any)?.originalCode || phase1BaselineCode || (prev as any)?.phase1Code || formattedFinalCode,
          solutionCode: (res as any)?.solutionCode || (res as any)?.referenceSolution || (res as any)?.originalCode || phase1BaselineCode || formattedFinalCode,
          referenceSolution: (res as any)?.referenceSolution || (res as any)?.solutionCode || (res as any)?.originalCode || phase1BaselineCode || formattedFinalCode,
          evaluationStatus: 'PASSED',
          score: evalScore,
          summary: res.summary || res.message,
          issues: res.issues || [],
          suggestions: res.suggestions || [],
          bugReports: res.bugReports || [],
          evaluation: res.evaluation || {
            status: 'PASSED',
            score: evalScore,
            summary: res.summary,
            issues: res.issues,
            bugReports: res.bugReports,
          },
          testsTotal: res.testsTotal,
          testsPassed: res.testsPassed,
          testsFailed: res.testsFailed,
          results: res.results,
          durationMs: res.durationMs,
        }));
      } else {
        setErrorMessage(
          `Challenge FAILED: ${res.failureReason || 'Code did not pass all deterministic test cases.'} (${res.testsPassed || 0}/${res.testsTotal || 0} passed).`
        );

        setPhase2State((prev) => ({
          ...(prev || { isAvailable: false, assignment: assignment || undefined }),
          isAvailable: false,
          state: 'PHASE2_FAILED',
          challengeId,
          submittedAt: res.submittedAt,
          finalCode: formattedFinalCode,
          originalCode: (res as any)?.originalCode || phase1BaselineCode || (prev as any)?.originalCode || '',
          baselineCode: (res as any)?.baselineCode || (res as any)?.originalCode || phase1BaselineCode || (prev as any)?.baselineCode || '',
          phase1Code: (res as any)?.phase1Code || (res as any)?.originalCode || phase1BaselineCode || (prev as any)?.phase1Code || '',
          solutionCode: (res as any)?.solutionCode || (res as any)?.referenceSolution || (res as any)?.originalCode || phase1BaselineCode || '',
          referenceSolution: (res as any)?.referenceSolution || (res as any)?.solutionCode || (res as any)?.originalCode || phase1BaselineCode || '',
          evaluationStatus: 'FAILED',
          score: evalScore,
          summary: res.summary || res.message,
          issues: res.issues || [],
          suggestions: res.suggestions || [],
          bugReports: res.bugReports || [],
          evaluation: res.evaluation || {
            status: 'FAILED',
            score: evalScore,
            summary: res.summary,
            issues: res.issues,
            bugReports: res.bugReports,
          },
          testsTotal: res.testsTotal,
          testsPassed: res.testsPassed,
          testsFailed: res.testsFailed,
          failureReason: res.failureReason,
          results: res.results,
          durationMs: res.durationMs,
        }));
      }
    } catch (err: any) {
      console.error('Failed to submit Phase 2 fix:', err);
      setSafeErrorMessage(err.message || 'Submission recorded.');
      setPhase2State((prev) => ({
        ...(prev || { isAvailable: false, assignment: assignment || undefined }),
        isAvailable: false,
        state: 'PHASE2_SUBMITTED',
        challengeId,
        finalCode: formattedFinalCode,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  // Run Code (Non-finalizing public test execution)
  const handleRunTests = async () => {
    if (!code.trim()) {
      setErrorMessage('Code cannot be empty to run tests.');
      return;
    }

    try {
      setRunningTests(true);
      setErrorMessage(null);
      setShowTestPanel(true);

      const res = await api.runStudentCode(assignmentId, {
        code,
        language,
      });

      setTestRunOutcome(res);
      if (res.results && res.results.length > 0) {
        setSelectedTestIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to run test cases:', err);
      setErrorMessage(err.message || 'Failed to execute test cases.');
    } finally {
      setRunningTests(false);
    }
  };

  // 5. Handle Tab / Enter keys and block forbidden shortcuts in editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      ['c', 'v', 'x', 'a', 's', 'p', 'u'].includes(e.key.toLowerCase())
    ) {
      if (['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        if (proctoringManagerRef.current) {
          proctoringManagerRef.current.reportViolation(
            e.key.toLowerCase() === 'v' ? 'PASTE_BLOCKED' : 'COPY_BLOCKED',
            'WARNING',
            { key: e.key }
          );
        }
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const target = e.currentTarget;
      const val = target.value;
      target.value = val.substring(0, start) + '    ' + val.substring(end);
      target.selectionStart = target.selectionEnd = start + 4;
      setCode(target.value);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLineBefore = val.slice(lineStart, start);
      const currentIndent = currentLineBefore.match(/^\s*/)?.[0] || '';
      const trimmedBefore = currentLineBefore.trimEnd();
      const lastChar = trimmedBefore.slice(-1);
      const opensBlock = lastChar === '{' || lastChar === ':' || lastChar === '(' || lastChar === '[';
      const nextIndent = opensBlock ? currentIndent + '    ' : currentIndent;
      const insertStr = '\n' + nextIndent;
      const nextVal = val.substring(0, start) + insertStr + val.substring(end);
      setCode(nextVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            start + insertStr.length;
        }
      });
    }
  };

  const handleCopyBlocked = (e?: React.ClipboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleSecurityFail(
      'Exam Disqualified / Failed: Prohibited copy action during Phase 2 Viva.',
      'COPY_BLOCKED'
    );
  };

  const handleCutBlocked = (e?: React.ClipboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleSecurityFail(
      'Exam Disqualified / Failed: Prohibited cut action during Phase 2 Viva.',
      'CUT_BLOCKED'
    );
  };

  const handlePasteBlocked = (e?: React.ClipboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleSecurityFail(
      'Exam Disqualified / Failed: Prohibited paste action during Phase 2 Viva.',
      'PASTE_BLOCKED'
    );
  };

  const handleContextMenuBlocked = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Fullscreen Helper
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  // 6. Reset to initial mutated code
  const handleResetToMutated = () => {
    if (initialMutatedCode) {
      setCode(initialMutatedCode);
      if (errorMessage) setErrorMessage(null);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const linesCount = code ? code.split('\n').length : 1;

  // Loading Screen
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">
          Loading Phase 2 Debugging Challenge state...
        </p>
      </div>
    );
  }

  // Security Terminated Screen
  if (phase2State?.state === 'SECURITY_TERMINATED' || phase2State?.terminated) {
    const cancelReason =
      phase2State?.reason ||
      phase2State?.failureReason ||
      proctoringState.terminationReason ||
      'Exam Cancelled: Student pressed Back, minimized window, or closed browser tab.';

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignment</span>
        </button>

        <div className="bg-white p-8 rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-300 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
              Exam Cancelled — Security Violation Detected
            </div>
            <h2 className="text-xl font-bold text-slate-900">Assessment Terminated &amp; Locked</h2>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl max-w-lg mx-auto text-xs font-semibold text-red-800">
              {cancelReason}
            </div>
            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              Your session was terminated by the proctoring system and reported to your Faculty dashboard. This attempt has been permanently locked.
            </p>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={onBack}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Badi Screen Full-Screen Result Dossier (Side-by-Side Comparison & Bug Review)
  if ((isSubmitted || isFailed || isPassed) && submissionForModal) {
    return (
      <LargeSubmissionResultModal
        submission={submissionForModal}
        onClose={onBack}
      />
    );
  }

  // Unavailable State
  if (!phase2State?.isAvailable && !isSubmitted && !isExpired && phase2State?.state !== 'PHASE2_READY') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignment</span>
        </button>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              {phase2State?.state === 'PHASE1_OPEN'
                ? 'Phase 1 Not Submitted Yet — Phase 2 Locked'
                : phase2State?.state === 'PHASE2_LOCKED_BY_FACULTY'
                ? 'Phase 2 Locked by Faculty'
                : 'Phase 2 Not Available Yet'}
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {phase2State?.reason ||
                'Phase 2 requires a completed Phase 1 submission and Faculty unlock.'}
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={onBack}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
            >
              Return to Phase 1
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-Start Screen (Ready to Begin 3-Minute Challenge)
  if (phase2State?.state === 'PHASE2_READY') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assignment</span>
          </button>
          <span className="text-xs font-mono text-slate-400">Phase 2 — Active Integrity Shield</span>
        </div>

        {/* Hero Card: 3-Minute Challenge Briefing */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                  Phase 2 • Debugging Challenge
                </span>
                <span className="text-xs font-mono text-slate-500 capitalize">{language}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {assignment?.title || 'Debugging Challenge'}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Deterministic Code Debugging Challenge
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center shrink-0">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-800">3 Minutes</div>
              <div className="text-[10px] text-slate-400">Server-Timed</div>
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" /> Challenge Instructions
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Three intentional, targeted complex defects were introduced into your Phase 1 code by the mutation engine.
              Your task is to identify and fix all 3 defects before the 180-second deadline expires.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Server-Authoritative Timer:</strong> 180 seconds starts immediately when you begin.
              </li>
              <li>
                <strong>Anti-Reset Guarantee:</strong> Refreshing or reopening this page will not restore or extend the timer.
              </li>
              <li>
                <strong>Browser Integrity:</strong> Tab switching, window defocusing, and copy/paste are strictly monitored.
              </li>
              <li>
                <strong>Targeted Defects (3 Injected):</strong> Exactly 3 complex algorithmic/state defects have been injected into your code. You must locate and fix all 3 bugs to pass.
              </li>
            </ul>
          </div>

          {/* Browser Integrity Verification */}
          <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Environment Integrity Checks
                </h3>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700">
                Server-Authoritative Security
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Fullscreen Mode */}
              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                  <span>Fullscreen Mode</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className={`font-semibold px-2.5 py-1 rounded text-[10px] cursor-pointer transition ${
                    proctoringState.isFullscreen
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {proctoringState.isFullscreen ? 'Fullscreen Active' : 'Enter Fullscreen'}
                </button>
              </div>

              {/* Anti-Tampering Shield */}
              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Clipboard & Shortcuts</span>
                </div>
                <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Protected & Monitored
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Deterministic test verification. 3 strikes before security termination.</span>
            </div>

            <button
              id="btn-start-phase2-challenge"
              onClick={handleStartChallenge}
              disabled={starting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/25 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {starting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing Challenge...</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Start 3-Minute Challenge</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active / Submitted / Expired Challenge View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePhase2BackClick}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer"
            title="Back to assignments"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                Phase 2 — Debugging Challenge
              </span>
              <span className="text-xs font-mono text-slate-500 capitalize">{language}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              {assignment?.title || 'Phase 2 Challenge'}
            </h1>
          </div>
        </div>

        {/* Big Timer Header Display */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {isPassed ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>PASSED • ALL TESTS VERIFIED</span>
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-bold">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>FAILED • BUG NOT FIXED</span>
            </div>
          ) : isSubmitted ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>PHASE 2 SUBMITTED</span>
            </div>
          ) : isExpired ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>TIME EXPIRED (00:00)</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition ${
                remainingSeconds <= 30
                  ? 'bg-red-50 border-red-200 text-red-800 animate-pulse'
                  : remainingSeconds <= 60
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-slate-900 text-white border-slate-800'
              }`}
            >
              <Clock
                className={`w-4 h-4 ${
                  remainingSeconds <= 30
                    ? 'text-red-600'
                    : remainingSeconds <= 60
                    ? 'text-amber-600'
                    : 'text-blue-400'
                }`}
              />
              <div className="flex flex-col items-start">
                <span className="text-[9px] uppercase font-bold tracking-wider opacity-75">
                  Time Remaining
                </span>
                <span className="font-mono text-base font-bold leading-tight">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proctoring Live Monitoring Bar (Active Challenge) */}
      {isChallengeActive && (
        <div className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-blue-400">
              <Shield className="w-4 h-4" />
              <span>Environment Integrity Monitored</span>
            </div>

            {/* Fullscreen Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  proctoringState.isFullscreen ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>Fullscreen: {proctoringState.isFullscreen ? 'Active' : 'Windowed'}</span>
            </div>

            {/* Anti-Tampering Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Clipboard Guard: Active</span>
            </div>
          </div>

          {/* Warning Counter (3-Strike Policy) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Violations:</span>
            <span
              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${
                proctoringState.warningsCount >= 2
                  ? 'bg-red-950 text-red-300 border-red-800 animate-pulse'
                  : proctoringState.warningsCount === 1
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {proctoringState.warningsCount} / {proctoringState.maxWarnings} Warnings
            </span>
          </div>
        </div>
      )}

      {/* Warning Notice Banner */}
      {warningNotice && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs animate-bounce">
          <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">
              Proctoring Warning ({warningNotice.count}/{warningNotice.max}):
            </span>{' '}
            <span>{warningNotice.message}</span>
            <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              Exceeding {warningNotice.max} warnings will automatically terminate your session.
            </div>
          </div>
        </div>
      )}

      {/* Top SyntaXViva AI Verification Banner (matches user screenshot) */}
      {(isSubmitted || isFailed || isPassed) && (
        <div
          className={`p-5 rounded-2xl border flex flex-col gap-3 text-xs shadow-xs ${
            isFailed
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5 font-bold text-sm">
              {isFailed ? (
                <>
                  <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center shrink-0">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-rose-950 text-sm font-bold">Phase 2 Verification: FAILED</span>
                    <span className="block text-[11px] font-normal text-rose-700">
                      {missedCount} of {totalBugs} injected defect(s) were not resolved
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-emerald-950 text-sm font-bold">Phase 2 Verification: PASSED</span>
                    <span className="block text-[11px] font-normal text-emerald-700">
                      All {totalBugs} injected defects were successfully resolved
                    </span>
                  </div>
                </>
              )}
            </div>

            <span
              className={`px-3 py-1 font-mono font-bold rounded-full text-xs text-white ${
                isFailed ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              Score: {score}/100
            </span>
          </div>

          <div className="text-xs leading-relaxed">
            {isFailed ? (
              <p className="text-rose-900 font-medium">
                {fixedCount > 0 ? (
                  <>You successfully resolved <strong>{fixedCount}</strong> of {totalBugs} defects, but <strong>{missedCount}</strong> defect(s) remained uncorrected. All injected defects must be fixed to pass.</>
                ) : (
                  <>None of the <strong>{totalBugs}</strong> injected defects were resolved. Review the code diagnostic below to see where each defect was located.</>
                )}
              </p>
            ) : (
              <p className="text-emerald-900 font-medium">
                Excellent work! All <strong>{totalBugs}</strong> injected complex defects were identified and resolved successfully.
              </p>
            )}
          </div>

          {isFailed && bugReports.filter((b) => !b.isFixed).length > 0 && (
            <div className="pt-2 border-t border-rose-200/80 space-y-2">
              <span className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                Unresolved Defects (Highlighted with red wavy underlines below):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {bugReports
                  .filter((b) => !b.isFixed)
                  .map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/90 border border-rose-200/90 shadow-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200/70 px-1.5 py-0.5 rounded">
                          Line {b.location?.line || '?'}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded">
                          Unresolved
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 text-xs truncate" title={b.name}>
                        {b.name}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                        {b.description || 'Injected defect was not modified in your submission.'}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expired Notification */}
      {isExpired && !isSubmitted && !isFailed && !isPassed && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-red-900 text-xs flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Time Expired:</span>{' '}
              <span>The 180-second server deadline has passed.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Assignments</span>
          </button>
        </div>
      )}

      {/* Error Notification */}
      {!isFailed && !isPassed && errorMessage && !errorMessage.toLowerCase().includes('gemini') && !errorMessage.toLowerCase().includes('api key') && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-900 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT: Left (Editor & Problem) + Right (Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / MAIN AREA (Col 8) */}
        <div className="lg:col-span-8 space-y-5">
          {/* If Submitted/Failed/Passed: Render Hero Card + 4 Metric Stat Cards + Bug Verification Breakdown */}
          {isSubmitted || isFailed || isPassed ? (
            <>
              {/* Hero Banner (matches user screenshot) */}
              <div
                className={`p-6 rounded-2xl border text-white shadow-lg space-y-4 ${
                  isFailed
                    ? 'bg-linear-to-r from-slate-950 via-rose-950 to-slate-900 border-rose-800/50'
                    : 'bg-linear-to-r from-slate-950 via-emerald-950 to-slate-900 border-emerald-800/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-2xl shrink-0 border ${
                      isFailed
                        ? 'bg-rose-900/40 border-rose-700/60 text-rose-400'
                        : 'bg-emerald-900/40 border-emerald-700/60 text-emerald-400'
                    }`}
                  >
                    {isFailed ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span
                      className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        isFailed
                          ? 'bg-rose-900/80 text-rose-200 border-rose-700'
                          : 'bg-emerald-900/80 text-emerald-200 border-emerald-700'
                      }`}
                    >
                      {isFailed ? `FAILED • SCORE: ${score}/100` : `PASSED • SCORE: 100/100`}
                    </span>
                    <h2 className="text-2xl font-extrabold tracking-tight">
                      {isFailed ? 'Phase 2 Debugging Failed' : 'Phase 2 Debugging Passed'}
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isFailed
                        ? `Assessment Rule: All injected defects must be resolved. You missed ${missedCount} defect(s).`
                        : `Assessment Rule: All injected defects resolved. Full marks awarded.`}
                    </p>
                  </div>
                </div>

                {isFailed && (
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-200">
                    <Info className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Mistake Diagnostic:</strong> In the Code Review below, lines where you made mistakes or missed defects are highlighted with{' '}
                      <span className="text-rose-400 font-bold underline decoration-wavy decoration-rose-500 underline-offset-4">
                        red wavy underlines
                      </span>.
                    </span>
                  </div>
                )}
              </div>

              {/* 4 Metric Stat Cards (matches user screenshot) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Defects</span>
                  <div className="text-3xl font-extrabold text-slate-800 tabular-nums">{totalBugs}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Fixed Bugs</span>
                  <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">{fixedCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Missed Bugs</span>
                  <div className="text-3xl font-extrabold text-rose-600 tabular-nums">{missedCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Final Score</span>
                  <div className="text-3xl font-extrabold text-indigo-600 tabular-nums">{score}%</div>
                </div>
              </div>

              {/* INJECTED BUG VERIFICATION BREAKDOWN (matches user screenshot) */}
              {bugReports.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      Injected Bug Verification Breakdown
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {bugReports.map((b: any, idx: number) => {
                      const isBugFixed = Boolean(b.isFixed);
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border space-y-2 transition-all ${
                            isBugFixed
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : 'bg-rose-50/70 border-rose-200 text-rose-950 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 font-bold text-xs">
                              {isBugFixed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span>
                                {b.name} (Line {b.location?.line || '?'})
                              </span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isBugFixed
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                  : 'bg-rose-100 text-rose-700 border-rose-300'
                              }`}
                            >
                              {isBugFixed ? 'Resolved Fix' : 'Missed Mistake'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {isBugFixed ? (
                              `Defect on Line ${b.location?.line || '?'}: '${b.name}' was correctly resolved.`
                            ) : (
                              <>
                                Mistake on Line {b.location?.line || '?'}: Defect '{b.name}' was not modified.{' '}
                                {b.mutatedFragment && b.originalFragment ? (
                                  <span className="font-mono text-[11px] text-rose-800">
                                    Mutated code:{' '}
                                    <code className="bug-wavy-underline font-bold px-1 py-0.5 bg-rose-100 rounded">
                                      {b.mutatedFragment}
                                    </code>{' '}
                                    replaced baseline logic.
                                  </span>
                                ) : (
                                  b.description
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Active Challenge Instructions Banner */
            <div className="p-3.5 bg-linear-to-r from-purple-50 via-indigo-50/60 to-purple-50 border border-purple-200/90 rounded-2xl shadow-xs flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs text-purple-950">
                    Phase 2 Viva: Exactly 3 Injected Defects
                  </span>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    Locate all 3 defects in your code, fix them, and submit your solution.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-200 text-purple-900 border border-purple-300">
                Fix All 3 Bugs to Pass
              </span>
            </div>
          )}

          {/* Code Editor Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            {/* Editor Toolbar Header (matches user screenshot tabs) */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {isSubmitted || isFailed || isPassed ? 'Submitted Code Verification' : 'mutated_solution.' + (
                    language === 'python'
                      ? 'py'
                      : language === 'javascript'
                      ? 'js'
                      : language === 'typescript'
                      ? 'ts'
                      : language === 'java'
                      ? 'java'
                      : language === 'cpp'
                      ? 'cpp'
                      : language === 'c'
                      ? 'c'
                      : 'txt'
                  )}
                </span>
                {isSubmitted || isFailed || isPassed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    Verification View
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    3 Complex Bugs
                  </span>
                )}
              </div>

              {/* Inspector View Mode Tabs (matches user screenshot) */}
              {isSubmitted || isFailed || isPassed ? (
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/70 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setEditorMode('diagnostic')}
                    className={`px-3 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      editorMode === 'diagnostic'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    <span>Diagnostic Inspector (With Underlines)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('standard')}
                    className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                      editorMode === 'standard'
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    <span>Standard Code Editor</span>
                  </button>
                </div>
              ) : (
                isChallengeActive && initialMutatedCode && (
                  <button
                    type="button"
                    onClick={handleResetToMutated}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                    title="Reset to original mutated code"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-500" />
                    <span>Reset to Mutated</span>
                  </button>
                )
              )}
            </div>

            {/* Code Editor Container */}
            <div
              className="relative bg-slate-950"
              onCopy={handleCopyBlocked}
              onCut={handleCutBlocked}
              onPaste={handlePasteBlocked}
              onContextMenu={handleContextMenuBlocked}
            >
              <DeveloperCodeEditor
                value={
                  (isSubmitted || isFailed || isPassed)
                    ? (phase2State?.finalCode || (phase2State as any)?.repaired_code || code || phase2State?.mutatedCode || '')
                    : code
                }
                onChange={(nextVal) => {
                  if (isSubmitted || isExpired || isFailed || isPassed) return;
                  setCode(nextVal);
                  if (errorMessage) setErrorMessage(null);
                }}
                language={language || 'python'}
                readOnly={isSubmitted || isExpired || isFailed || isPassed}
                minHeight={450}
                filename={`phase2_submission.${
                  language === 'c'
                    ? 'c'
                    : language === 'cpp'
                    ? 'cpp'
                    : language === 'java'
                    ? 'java'
                    : language === 'javascript'
                    ? 'js'
                    : language === 'typescript'
                    ? 'ts'
                    : 'py'
                }`}
                minimalToolbar={false}
                hideCopyButton={true}
                disableCopyPaste={isChallengeActive}
                bugAnnotations={bugAnnotations}
                showBugAnnotations={editorMode === 'diagnostic' && (isSubmitted || isFailed || isPassed)}
                onCopyAttempt={() =>
                  handleSecurityFail(
                    'Exam Disqualified / Failed: Prohibited copy action during Phase 2 Viva.',
                    'COPY_BLOCKED'
                  )
                }
                onPasteAttempt={() =>
                  handleSecurityFail(
                    'Exam Disqualified / Failed: Prohibited paste action during Phase 2 Viva.',
                    'PASTE_BLOCKED'
                  )
                }
                onCutAttempt={() =>
                  handleSecurityFail(
                    'Exam Disqualified / Failed: Prohibited cut action during Phase 2 Viva.',
                    'CUT_BLOCKED'
                  )
                }
              />
            </div>

            {/* Bottom Editor Status & Action */}
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                <span>{linesCount} lines</span>
                <span>•</span>
                <span>{code.length} chars</span>
                {(isSubmitted || isFailed || isPassed) ? (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">Evaluation Finalized</span>
                  </>
                ) : isChallengeActive ? (
                  <>
                    <span>•</span>
                    <span className="text-blue-700 font-semibold">Ready to Submit</span>
                  </>
                ) : null}
              </div>

              {/* Submit Button or Navigation */}
              {isSubmitted || isFailed || isPassed ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRunTests}
                    disabled={runningTests || !code.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer border bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs"
                    title="Run code to view program output"
                  >
                    {runningTests ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        <span>Run Code &amp; View Output</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={onBack}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              ) : isExpired ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={onBack}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition cursor-pointer"
                  >
                    Back to Assignments
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-run-phase2-tests"
                    type="button"
                    onClick={handleRunTests}
                    disabled={runningTests || !code.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer border bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    title="Run code against visible deterministic test cases"
                  >
                    {runningTests ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        <span>Run Code</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-submit-phase2-fix"
                    onClick={handleSubmitFix}
                    disabled={submitting || hasClickedSubmitOnce || !code.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating Fix...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Fix &amp; Evaluate</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Test Execution Console (Visible Tests) */}
          {(showTestPanel || testRunOutcome) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md text-xs text-slate-200">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-100">Test Execution Console (Visible Tests)</span>
                  {testRunOutcome && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        testRunOutcome.testsPassed === testRunOutcome.testsTotal
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}
                    >
                      {testRunOutcome.testsPassed} / {testRunOutcome.testsTotal} Passed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {testRunOutcome && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {testRunOutcome.durationMs}ms
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTestPanel(!showTestPanel)}
                    className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    title={showTestPanel ? 'Collapse Console' : 'Expand Console'}
                  >
                    {showTestPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {showTestPanel && (
                <div className="p-4 space-y-4">
                  {runningTests && (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-slate-400 text-xs font-sans">
                        Executing code in isolated sandbox against visible test cases...
                      </p>
                    </div>
                  )}

                  {!runningTests && testRunOutcome && (
                    <div className="space-y-3">
                      {/* Test Case Select Tabs */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {testRunOutcome.results.map((res, idx) => (
                          <button
                            key={res.testIndex}
                            type="button"
                            onClick={() => setSelectedTestIndex(idx)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-2 transition cursor-pointer border ${
                              selectedTestIndex === idx
                                ? 'bg-slate-800 text-white border-slate-600 shadow-xs'
                                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/60 hover:text-slate-200'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                res.passed
                                  ? 'bg-emerald-400'
                                  : res.timedOut
                                  ? 'bg-orange-400'
                                  : res.error
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                              }`}
                            />
                            <span>Test {res.testIndex}</span>
                          </button>
                        ))}
                      </div>

                      {/* Selected Test Case Details */}
                      {testRunOutcome.results[selectedTestIndex] && (() => {
                        const cur = testRunOutcome.results[selectedTestIndex];
                        return (
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 font-mono text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <span className="text-slate-300 font-sans text-xs font-semibold">
                                {cur.description || `Test Case ${cur.testIndex}`}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  cur.passed
                                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800'
                                    : cur.timedOut
                                    ? 'bg-orange-900/60 text-orange-300 border border-orange-800'
                                    : cur.error
                                    ? 'bg-amber-900/60 text-amber-300 border border-amber-800'
                                    : 'bg-red-900/60 text-red-300 border border-red-800'
                                }`}
                              >
                                {cur.passed
                                  ? 'PASSED'
                                  : cur.timedOut
                                  ? 'TIME LIMIT EXCEEDED'
                                  : cur.error
                                  ? 'RUNTIME ERROR'
                                  : 'OUTPUT MISMATCH'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider font-sans">
                                  Standard Input (stdin)
                                </span>
                                <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 whitespace-pre-wrap max-h-28 overflow-y-auto">
                                  {cur.input || '(empty)'}
                                </pre>
                              </div>

                              <div className="space-y-1">
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider font-sans">
                                  Expected Output
                                </span>
                                <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-300 border border-slate-800 whitespace-pre-wrap max-h-28 overflow-y-auto">
                                  {cur.expected || '(empty)'}
                                </pre>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider font-sans">
                                Actual Program Output (stdout)
                              </span>
                              <pre
                                className={`p-2.5 rounded-lg bg-slate-900 border whitespace-pre-wrap max-h-36 overflow-y-auto ${
                                  cur.passed
                                    ? 'text-emerald-300 border-slate-800'
                                    : 'text-amber-200 border-red-900/40'
                                }`}
                              >
                                {cur.actual || cur.stdout || '(no output)'}
                              </pre>
                            </div>

                            {cur.stderr && (
                              <div className="space-y-1">
                                <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider font-sans">
                                  Standard Error / Diagnostics (stderr)
                                </span>
                                <pre className="p-2.5 rounded-lg bg-red-950/40 text-red-300 border border-red-900/60 whitespace-pre-wrap max-h-36 overflow-y-auto">
                                  {cur.stderr}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <p className="text-[11px] text-slate-400 font-sans italic">
                        Note: "Run Code" executes only visible tests to help you debug. Your final submission evaluates both visible and hidden edge cases.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT / SIDE PANEL (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Challenge Timer & Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phase 2 Information
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Debugging Challenge</h3>
            </div>

            {/* Countdown / Evaluation Outcome Box (matches user screenshot) */}
            <div
              className={`p-5 rounded-xl border text-center space-y-1.5 ${
                isFailed
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : isPassed
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : isSubmitted
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : isExpired
                  ? 'bg-red-50/70 border-red-200 text-red-900'
                  : remainingSeconds <= 30
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : remainingSeconds <= 60
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                {isFailed
                  ? 'EVALUATION FAILED'
                  : isPassed
                  ? 'EVALUATION PASSED'
                  : isSubmitted
                  ? 'SUBMISSION COMPLETED'
                  : isExpired
                  ? 'CHALLENGE STATUS'
                  : 'TIME REMAINING'}
              </div>
              <div
                className={`text-3xl font-mono font-extrabold tracking-tight ${
                  isFailed
                    ? 'text-rose-600'
                    : isPassed
                    ? 'text-emerald-600'
                    : isSubmitted
                    ? 'text-slate-800'
                    : ''
                }`}
              >
                {isFailed
                  ? 'FAILED'
                  : isPassed
                  ? 'PASSED'
                  : isSubmitted
                  ? 'SUBMITTED'
                  : isExpired
                  ? 'EXPIRED'
                  : formatTime(remainingSeconds)}
              </div>
              {!isSubmitted && !isExpired && !isFailed && !isPassed && (
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      remainingSeconds <= 30
                        ? 'bg-red-500'
                        : remainingSeconds <= 60
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (remainingSeconds / 180) * 100))}%` }}
                  />
                </div>
              )}
            </div>

            {/* Metadata Rows (matches user screenshot) */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Language:</span>
                <span className="font-mono font-bold capitalize text-slate-800">{language}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`font-semibold capitalize ${
                    isPassed
                      ? 'text-emerald-600 font-bold'
                      : isFailed
                      ? 'text-rose-600 font-bold'
                      : isSubmitted
                      ? 'text-slate-800 font-semibold'
                      : isExpired
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}
                >
                  {isPassed ? 'Passed' : isFailed ? 'Failed' : isSubmitted ? 'Submitted' : isExpired ? 'Expired' : 'Active'}
                </span>
              </div>
              {(isSubmitted || isFailed || isPassed) && (
                <>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Score:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {score} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Resolved Defects:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {fixedCount} / {totalBugs}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Timer Authority:</span>
                <span className="font-mono font-medium text-slate-700">Server Time (180s)</span>
              </div>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-[11px] text-purple-900 leading-relaxed">
              <strong>Requirement:</strong> Analyze your code, resolve all 3 injected defects, and submit before timer ends.
            </div>
          </div>

          {/* Problem Statement Card */}
          {assignment && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Original Requirements
                </span>
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
              </div>

              <h4 className="text-xs font-bold text-slate-800">{assignment.title}</h4>

              <div className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                {assignment.description}
              </div>

              {assignment.requirements &&
                assignment.requirements.trim() !== (assignment.description || '').trim() && (
                  <div className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-32 overflow-y-auto">
                    {assignment.requirements}
                  </div>
                )}
            </div>
          )}

          {/* Submission Guarantee */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Phase 2 submission is final and evaluated deterministically.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
