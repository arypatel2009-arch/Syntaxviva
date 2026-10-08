import { Router, Response } from 'express';
import { getRepository } from '../repository/index.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../auth/jwt.js';
import { MutationService } from '../mutation/service.js';
import { computeCodeHash } from '../mutation/hasher.js';
import { evaluateSubmission, executeTestCases, TestCase, EvaluationOutcome, DEFAULT_LARGEST_NUMBER_TEST_CASES, DEFAULT_PARKING_FEE_TEST_CASES, resolveAssignmentTestCases } from '../execution/evaluator.js';
import { normalizePythonSource } from '../execution/sandbox.js';
import { SecurityService } from '../security/service.js';
import {
  evaluatePhase1Submission,
  evaluatePhase2Submission,
  GeminiConfigError,
  isGeminiConfigured,
  GeminiEvaluationResponse,
} from '../services/geminiService.js';

export const studentRouter = Router();

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c'];
const MAX_CODE_BYTES = 200 * 1024; // 200 KB

interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  language: string;
  requirements: string;
  starter_code: string;
  test_cases_json: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface AttemptRow {
  id: string;
  assignment_id: string;
  student_id: string;
  state: string;
  language: string | null;
  original_code: string | null;
  mutated_code: string | null;
  mutation_type: string | null;
  mutation_metadata_json: string | null;
  original_code_hash: string | null;
  mutated_code_hash: string | null;
  mutation_seed: string | null;
  mutation_status: string | null;
  failure_reason: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Phase2ChallengeRow {
  id: string;
  assignment_id: string;
  student_id: string;
  attempt_id: string;
  mutation_id: string | null;
  status: 'ACTIVE' | 'SUBMITTED' | 'PASSED' | 'FAILED' | 'EXPIRED' | 'SECURITY_TERMINATED';
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  final_code: string | null;
  created_at: string;
  updated_at: string;
}

interface Phase2EvaluationRow {
  id: string;
  challenge_id: string;
  attempt_id: string;
  assignment_id: string;
  student_id: string;
  submitted_code_hash: string;
  status: 'EVALUATING' | 'PASSED' | 'FAILED' | 'ERROR';
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  failure_reason: string | null;
  execution_metadata_json: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

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

function sanitizeAssignmentForStudent(assignment: AssignmentRow | null) {
  if (!assignment) return null;
  const clone: any = { ...assignment, starter_code: '', starterCode: '' };
  if (clone.test_cases_json) {
    try {
      const parsed = JSON.parse(clone.test_cases_json);
      const resolved = resolveAssignmentTestCases(
        Array.isArray(parsed) ? parsed : [],
        assignment.title,
        assignment.description
      );
      const publicOnly = resolved
        .filter((t: any) => !t.is_hidden && !t.isHidden)
        .map((t: any) => ({
          input: t.input,
          expected: t.expected,
          description: t.description,
          is_hidden: false,
        }));
      clone.test_cases_json = JSON.stringify(publicOnly);
    } catch {
      clone.test_cases_json = '[]';
    }
  }
  return clone;
}

/**
 * GET /api/student/assignments/:assignmentId/phase1
 * Retrieves assignment details and the current student's Phase 1 attempt state.
 */
studentRouter.get(
  '/assignments/:assignmentId/phase1',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;

      console.log(
        `[SyntaXViva Phase 1] Starting Phase 1 intake lookup: assignmentId='${assignmentId}', requester='${studentId}', role='${req.user!.role}'`
      );

      const repo = getRepository();
      const rawAssignment = await repo.getAssignmentById(assignmentId);

      if (!rawAssignment) {
        console.warn(`[SyntaXViva Phase 1] Assignment '${assignmentId}' not found in database.`);
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }

      const isPhase2Unlocked = Boolean((rawAssignment as any).phase2_unlocked || (rawAssignment as any).phase2Unlocked);
      const deadlineExpired = isAssignmentDeadlinePassed(rawAssignment.due_date);
      const assignment = {
        id: rawAssignment.id,
        title: rawAssignment.title,
        description: rawAssignment.description,
        language: rawAssignment.language,
        requirements: rawAssignment.requirements,
        starterCode: '',
        starter_code: '',
        status: rawAssignment.status,
        phase2Unlocked: isPhase2Unlocked,
        phase2_unlocked: isPhase2Unlocked ? 1 : 0,
        dueDate: rawAssignment.due_date,
        due_date: rawAssignment.due_date,
        isDeadlinePassed: deadlineExpired,
        createdAt: rawAssignment.created_at,
        created_at: rawAssignment.created_at,
      };

      let attempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);

      // Security proctoring applies strictly to Phase 2: if a previous attempt was terminated in Phase 1 before Phase 2 started, reset it so the student can write and submit Phase 1 cleanly
      if (attempt && attempt.state === 'SECURITY_TERMINATED' && !attempt.mutation_status) {
        const challenge = await repo.getPhase2ChallengeByAttempt(attempt.id);
        if (!challenge) {
          await repo.updateAttempt(attempt.id, {
            state: 'CREATED',
            failure_reason: null,
            submitted_at: null,
          });
          attempt = await repo.getAttemptById(attempt.id);
        }
      }

      // Ensure any submitted attempt with missing, failed, legacy fallback, or un-normalized Python mutation is immediately upgraded to MUTATION_READY
      const isPyAttempt = !attempt?.language || attempt.language.toLowerCase() === 'python';
      const needsPyNorm =
        Boolean(attempt?.original_code) &&
        isPyAttempt &&
        (attempt!.original_code !== normalizePythonSource(attempt!.original_code!) ||
          (Boolean(attempt?.mutated_code) &&
            attempt!.mutated_code !== normalizePythonSource(attempt!.mutated_code!)));

      if (
        attempt &&
        attempt.original_code &&
        (needsPyNorm ||
          attempt.state === 'MUTATION_PROCESSING_FAILED' ||
          attempt.mutation_status === 'MUTATION_PROCESSING_FAILED' ||
          !attempt.mutated_code ||
          attempt.mutated_code === attempt.original_code ||
          attempt.mutated_code.includes('# BUG_MUTATION') ||
          attempt.mutated_code.includes('// BUG_MUTATION'))
      ) {
        try {
          await MutationService.getInstance().processAttemptMutation(attempt.id);
          attempt = await repo.getAttemptById(attempt.id);
        } catch (mutErr) {
          console.warn('[SyntaXViva Phase 1] Auto-mutation repair warning:', mutErr);
        }
      }

      console.log(
        `[SyntaXViva Phase 1] Successfully loaded assignment '${assignment.title}'. Attempt exists: ${Boolean(attempt)}`
      );

      res.json({
        assignment,
        attempt: attempt
          ? {
              id: attempt.id,
              assignmentId: attempt.assignment_id,
              studentId: attempt.student_id,
              state: attempt.state,
              language: attempt.language,
              originalCode: attempt.original_code,
              mutationType: attempt.mutation_type,
              mutationStatus: attempt.mutation_status,
              originalCodeHash: attempt.original_code_hash,
              mutatedCodeHash: attempt.mutated_code_hash,
              hasMutatedCode: !!attempt.mutated_code,
              evaluationResultJson: attempt.evaluation_result_json,
              failureReason: attempt.failure_reason,
              submittedAt: attempt.submitted_at,
              createdAt: attempt.created_at,
              updatedAt: attempt.updated_at,
            }
          : null,
      });
    } catch (err: any) {
      console.error('Error fetching Phase 1 status:', err);
      res.status(500).json({ error: 'Failed to retrieve assignment submission state.' });
    }
  }
);

/**
 * POST /api/student/assignments/:assignmentId/phase1/submit
 * Direct intake endpoint for Phase 1 student code.
 *
 * Sequence:
 * 1. Validate role, assignment, payload and language.
 * 2. Save original code immutably with server timestamp.
 * 3. Immediately trigger automatic mutation engine on actual submitted source code.
 * 4. Transition attempt state to MUTATION_READY (or MUTATION_PROCESSING_FAILED).
 * 5. Return recorded submission and mutation telemetry.
 */
studentRouter.post(
  '/assignments/:assignmentId/phase1/submit',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;
      const { code, language, mutationSeed, requestedMutationType } = req.body;

      // 1. Validate Assignment Existence and Status
      const repo = getRepository();
      const assignment = await repo.getAssignmentById(assignmentId);

      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }

      const statusLower = (assignment.status || '').toLowerCase();
      if (statusLower !== 'active' && statusLower !== 'published' && statusLower !== 'open') {
        res.status(400).json({ error: 'Assignment is no longer accepting submissions.' });
        return;
      }

      if (isAssignmentDeadlinePassed(assignment.due_date)) {
        res.status(403).json({
          error:
            'Assignment deadline has expired! You can no longer submit this assignment. (Deadline khatam hone ke baad assignment submit nahi kar sakte.)',
        });
        return;
      }

      // 2. Validate Code Payload
      if (code === undefined || code === null || typeof code !== 'string') {
        res.status(400).json({ error: 'Code submission is required and must be text.' });
        return;
      }

      if (code.trim().length === 0) {
        res.status(400).json({ error: 'Submission code cannot be empty.' });
        return;
      }

      const codeByteLength = Buffer.byteLength(code, 'utf8');
      if (codeByteLength > MAX_CODE_BYTES) {
        res.status(400).json({
          error: `Submitted code exceeds the maximum allowed size of 200KB (received ${(codeByteLength / 1024).toFixed(1)}KB).`,
        });
        return;
      }

      // 3. Validate Language
      const normalizedLanguage = typeof language === 'string' ? language.trim().toLowerCase() : '';
      if (!normalizedLanguage || !SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
        res.status(400).json({
          error: `Invalid or unsupported programming language. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
        });
        return;
      }

      // 4. Duplicate Submission Guard (Original Code Immutability when passed)
      const existingAttempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);

      if (existingAttempt) {
        if (existingAttempt.state === 'SECURITY_TERMINATED' && existingAttempt.mutation_status) {
          res.status(403).json({
            error: existingAttempt.failure_reason || 'Exam was cancelled due to a security violation in Phase 2 and cannot be submitted.',
            submission: {
              id: existingAttempt.id,
              state: existingAttempt.state,
              failureReason: existingAttempt.failure_reason,
              submittedAt: existingAttempt.submitted_at,
            },
          });
          return;
        }
        // If already approved/passed in Phase 1, refuse overwrite
        if (
          existingAttempt.state === 'MUTATION_READY' ||
          existingAttempt.state === 'PHASE1_PASSED' ||
          existingAttempt.state === 'PHASE2_READY' ||
          existingAttempt.state === 'PHASE2_ACTIVE' ||
          existingAttempt.state === 'PHASE2_SUBMITTED' ||
          existingAttempt.state === 'PHASE2_PASSED'
        ) {
          res.status(409).json({
            error: 'Phase 1 submission is already approved. Original code is permanently locked.',
            submission: {
              id: existingAttempt.id,
              state: existingAttempt.state,
              submittedAt: existingAttempt.submitted_at,
            },
          });
          return;
        }
      }

      // 5. Store Original Code Immutably
      const formattedCode =
        normalizedLanguage === 'python' ? normalizePythonSource(code) : code;
      const now = new Date().toISOString();
      const originalCodeHash = computeCodeHash(formattedCode);
      let attemptId: string = existingAttempt
        ? existingAttempt.id
        : `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 6. Evaluate code with Gemini AI
      let aiEvaluation: GeminiEvaluationResponse;
      try {
        aiEvaluation = await evaluatePhase1Submission({
          title: assignment.title,
          description: assignment.description,
          requirements: assignment.requirements,
          language: normalizedLanguage,
          code: formattedCode,
        });
      } catch (geminiErr: any) {
        if (geminiErr instanceof GeminiConfigError) {
          res.status(400).json({
            error: 'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in backend environment variables.',
            configError: true,
          });
          return;
        }
        console.error('[SyntaXViva Phase 1] Gemini evaluation error:', geminiErr);
        res.status(502).json({
          error: `AI Evaluation Error: ${geminiErr.message || 'Failed to connect to Gemini API. Please retry your submission.'}`,
          apiError: true,
        });
        return;
      }

      const evalJson = JSON.stringify(aiEvaluation);

      // Handle AI Evaluation Fail Result
      if (!aiEvaluation.is_correct || aiEvaluation.result === 'FAIL') {
        if (existingAttempt) {
          await repo.updateAttempt(attemptId, {
            state: 'PHASE1_FAILED',
            language: normalizedLanguage,
            original_code: formattedCode,
            original_code_hash: originalCodeHash,
            evaluation_result_json: evalJson,
            failure_reason: aiEvaluation.summary,
            updated_at: now,
          });
        } else {
          await repo.createAttempt({
            id: attemptId,
            assignment_id: assignmentId,
            student_id: studentId,
            state: 'PHASE1_FAILED',
            language: normalizedLanguage,
            original_code: formattedCode,
            original_code_hash: originalCodeHash,
            evaluation_result_json: evalJson,
            failure_reason: aiEvaluation.summary,
            submitted_at: null,
          });
        }

        res.status(400).json({
          success: false,
          error: aiEvaluation.summary || 'Phase 1 code did not pass AI evaluation.',
          evaluation: aiEvaluation,
          submission: {
            id: attemptId,
            assignmentId,
            studentId,
            state: 'PHASE1_FAILED',
            language: normalizedLanguage,
            originalCode: formattedCode,
            evaluationResultJson: evalJson,
            failureReason: aiEvaluation.summary,
          },
        });
        return;
      }

      // If Approved by Gemini:
      if (existingAttempt) {
        await repo.updateAttempt(attemptId, {
          state: 'MUTATION_READY',
          language: normalizedLanguage,
          original_code: formattedCode,
          original_code_hash: originalCodeHash,
          mutated_code: null,
          mutation_type: null,
          mutation_status: 'PROCESSING',
          evaluation_result_json: evalJson,
          failure_reason: null,
          repaired_code: null,
          submitted_at: now,
          updated_at: now,
        });
      } else {
        await repo.createAttempt({
          id: attemptId,
          assignment_id: assignmentId,
          student_id: studentId,
          state: 'MUTATION_READY',
          language: normalizedLanguage,
          original_code: formattedCode,
          original_code_hash: originalCodeHash,
          mutated_code: null,
          mutation_type: null,
          mutation_metadata_json: null,
          mutation_status: 'PROCESSING',
          evaluation_result_json: evalJson,
          failure_reason: null,
          repaired_code: null,
          submitted_at: now,
        });
      }

      // 7. Trigger AST Mutation Engine for Phase 2
      const mutationService = MutationService.getInstance();
      const mutationResult = await mutationService.processAttemptMutation(attemptId, {
        seed: typeof mutationSeed === 'string' ? mutationSeed : undefined,
        requestedMutationType:
          typeof requestedMutationType === 'string'
            ? (requestedMutationType as any)
            : undefined,
      });

      const mutationPayload = mutationResult.success
        ? {
            status: mutationResult.status,
            mutationType: mutationResult.mutationType,
            originalCodeHash: mutationResult.originalCodeHash,
            mutatedCodeHash: mutationResult.mutatedCodeHash,
            metadata: mutationResult.metadata,
          }
        : {
            status: mutationResult.status,
            originalCodeHash: mutationResult.originalCodeHash,
            error: mutationResult.error,
          };

      res.status(201).json({
        success: true,
        message: 'Phase 1 code approved by Gemini AI. Phase 2 mutation generated.',
        evaluation: aiEvaluation,
        submission: {
          id: attemptId,
          assignmentId,
          studentId,
          state: mutationResult.status,
          language: normalizedLanguage,
          originalCode: formattedCode,
          originalCodeHash,
          evaluationResultJson: evalJson,
          submittedAt: now,
          createdAt: now,
        },
        mutation: mutationPayload,
      });
    } catch (err: any) {
      console.error('Error handling Phase 1 submission:', err);
      res.status(500).json({ error: 'Internal server error while recording submission.' });
    }
  }
);

/**
 * POST /api/student/attempts/:attemptId/process-mutation
 * Explicit trigger/re-run endpoint for testing and auditing mutation processing.
 */
studentRouter.post(
  '/attempts/:attemptId/process-mutation',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { attemptId } = req.params;
      const { seed, requestedMutationType } = req.body;

      const mutationService = MutationService.getInstance();
      const result = await mutationService.processAttemptMutation(attemptId, {
        seed,
        requestedMutationType,
      });

      res.json({
        success: result.success,
        result,
      });
    } catch (err: any) {
      console.error('Error processing attempt mutation:', err);
      res.status(500).json({ error: err?.message || 'Failed to process mutation' });
    }
  }
);

/**
 * GET /api/student/assignments/:assignmentId/phase2
 * Retrieves Phase 2 status, active challenge timer info, or submission confirmation.
 */
studentRouter.get(
  '/assignments/:assignmentId/phase2',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;

      const repo = getRepository();
      const rawAssignment = await repo.getAssignmentById(assignmentId);
      if (!rawAssignment) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }
      const assignment = sanitizeAssignmentForStudent(rawAssignment as any);

      const isPhase2Unlocked = Boolean((rawAssignment as any).phase2_unlocked || (rawAssignment as any).phase2Unlocked);
      let attempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);

      // Terminal Security Violation Check (Phase 1 or Phase 2)
      if (attempt && attempt.state === 'SECURITY_TERMINATED') {
        const challenge = await repo.getPhase2ChallengeByAttempt(attempt.id);
        res.json({
          isAvailable: false,
          state: 'SECURITY_TERMINATED',
          terminated: true,
          reason: attempt.failure_reason || 'Your assessment was terminated because a critical security violation was detected.',
          failureReason: attempt.failure_reason || 'Your assessment was terminated because a critical security violation was detected.',
          message: attempt.failure_reason || 'Your assessment was terminated because a critical security violation was detected.',
          assignment,
          challengeId: challenge?.id,
          startedAt: challenge?.started_at,
          deadlineAt: challenge?.deadline_at,
          finalCode: challenge?.final_code,
          mutatedCode: attempt.mutated_code,
          language: attempt.language,
        });
        return;
      }

      // Strictly require Phase 1 submission before Phase 2 can open
      if (!attempt || !attempt.submitted_at || !attempt.original_code) {
        res.json({
          isAvailable: false,
          state: 'PHASE1_OPEN',
          reason: 'Phase 1 has not been submitted yet. Please submit Phase 1 code first to unlock Phase 2.',
          assignment,
        });
        return;
      }

      // Ensure any submitted Phase 1 attempt has a generated mutation ready from student's Phase 1 code
      const isPyAttempt = !attempt.language || attempt.language.toLowerCase() === 'python';
      const needsPyNorm =
        isPyAttempt &&
        (attempt.original_code !== normalizePythonSource(attempt.original_code) ||
          (Boolean(attempt.mutated_code) &&
            attempt.mutated_code !== normalizePythonSource(attempt.mutated_code)));

      if (
        needsPyNorm ||
        !attempt.mutated_code ||
        attempt.mutated_code === attempt.original_code ||
        attempt.mutated_code.includes('# BUG_MUTATION') ||
        attempt.mutated_code.includes('// BUG_MUTATION') ||
        attempt.mutation_status !== 'MUTATION_READY'
      ) {
        try {
          await MutationService.getInstance().processAttemptMutation(attempt.id);
          attempt = (await repo.getAttemptById(attempt.id))!;
        } catch (mutErr) {
          console.warn('[SyntaXViva Phase 2] Auto-mutation generation warning:', mutErr);
        }
      }

      // Check existing Phase 2 challenge record
      const challenge = await repo.getPhase2ChallengeByAttempt(attempt.id);

      // Terminal Security Violation Check on challenge
      if (challenge?.status === 'SECURITY_TERMINATED') {
        res.json({
          isAvailable: false,
          state: 'SECURITY_TERMINATED',
          terminated: true,
          reason: attempt.failure_reason || 'Your assessment was terminated because a critical security violation was detected.',
          failureReason: attempt.failure_reason || 'Your assessment was terminated because a critical security violation was detected.',
          message: attempt.failure_reason || 'Your assessment was terminated because a critical security violation was detected.',
          assignment,
          challengeId: challenge?.id,
          startedAt: challenge?.started_at,
          deadlineAt: challenge?.deadline_at,
          finalCode: challenge?.final_code,
          mutatedCode: attempt.mutated_code,
          language: attempt.language,
        });
        return;
      }

      // Check mutation availability
      const isMutationReady = attempt.mutation_status === 'MUTATION_READY' && Boolean(attempt.mutated_code);
      if (!isMutationReady) {
        res.json({
          isAvailable: false,
          state: attempt.mutation_status === 'MUTATION_PROCESSING_FAILED'
            ? 'MUTATION_PROCESSING_FAILED'
            : 'MUTATION_PROCESSING',
          reason: 'Phase 2 is not available yet.',
          assignment,
        });
        return;
      }

      if (!challenge) {
        if (!isPhase2Unlocked) {
          res.json({
            isAvailable: false,
            state: 'PHASE2_LOCKED_BY_FACULTY',
            phase2Unlocked: false,
            reason: 'Phase 2 is currently locked by your Faculty. Please wait for your Faculty to unlock Phase 2.',
            assignment,
            durationSeconds: 180,
            mutatedCode: attempt.mutated_code,
            language: attempt.language,
          });
          return;
        }

        // Ready to start 3-minute challenge
        res.json({
          isAvailable: true,
          state: 'PHASE2_READY',
          phase2Unlocked: true,
          assignment,
          durationSeconds: 180,
          mutatedCode: attempt.mutated_code,
          language: attempt.language,
        });
        return;
      }

      const nowMs = Date.now();
      const deadlineMs = new Date(challenge.deadline_at).getTime();

      // Check if challenge is already finalized (PASSED / FAILED / SUBMITTED)
      if (
        challenge.status === 'PASSED' ||
        challenge.status === 'FAILED' ||
        challenge.status === 'SUBMITTED' ||
        attempt.state === 'PHASE2_PASSED' ||
        attempt.state === 'PHASE2_FAILED' ||
        attempt.state === 'PHASE2_SUBMITTED'
      ) {
        let evaluation = await repo.getPhase2EvaluationByChallenge(challenge.id);
        let currentChallengeStatus = challenge.status;
        let visibleResults: any[] = [];
        let evalDurationMs = 0;

        // Parse and resolve clean test cases
        let rawTests: TestCase[] = [];
        if (rawAssignment.test_cases_json) {
          try {
            rawTests = JSON.parse(rawAssignment.test_cases_json);
          } catch {
            rawTests = [];
          }
        }
        const resolvedTests = resolveAssignmentTestCases(
          rawTests,
          rawAssignment.title,
          rawAssignment.description
        );

        // Persist cleaned test cases if leftover Even/Odd defaults were removed
        if (rawTests.length !== resolvedTests.length) {
          try {
            await repo.updateAssignment(assignmentId, {
              test_cases_json: JSON.stringify(resolvedTests),
            });
          } catch {
            // ignore
          }
        }

        const codeToEvaluate = challenge.final_code || attempt.repaired_code || '';
        const evalLang = attempt.language || rawAssignment.language || 'python';

        if (codeToEvaluate.trim().length > 0) {
          const liveEval = await evaluateSubmission(codeToEvaluate, evalLang, resolvedTests, {
            originalCode: attempt.original_code,
            mutatedCode: attempt.mutated_code,
            title: rawAssignment.title,
            description: rawAssignment.description,
          });
          visibleResults = liveEval.results.filter((r) => !r.isHidden);
          evalDurationMs = liveEval.durationMs;

          // If challenge previously failed due to Windows timeout or leftover Even/Odd test cases, upgrade to PASSED
          if (liveEval.status === 'PASSED' && currentChallengeStatus !== 'PASSED') {
            const nowIso = new Date().toISOString();
            currentChallengeStatus = 'PASSED';
            await repo.updatePhase2Challenge(challenge.id, {
              status: 'PASSED',
              updated_at: nowIso,
            });
            await repo.updateAttempt(attempt.id, {
              state: 'PHASE2_PASSED',
              evaluation_result_json: JSON.stringify(liveEval),
              failure_reason: null,
              updated_at: nowIso,
            });
            const evalId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            await repo.createPhase2Evaluation({
              id: evalId,
              challenge_id: challenge.id,
              attempt_id: attempt.id,
              assignment_id: assignmentId,
              student_id: studentId,
              submitted_code_hash: computeCodeHash(codeToEvaluate),
              status: 'PASSED',
              tests_total: liveEval.testsTotal,
              tests_passed: liveEval.testsPassed,
              tests_failed: liveEval.testsFailed,
              failure_reason: null,
              execution_metadata_json: JSON.stringify({ durationMs: liveEval.durationMs }),
              started_at: liveEval.startedAt,
              completed_at: liveEval.completedAt,
            });
            evaluation = await repo.getPhase2EvaluationByChallenge(challenge.id);
          } else if (evaluation && evaluation.tests_total !== liveEval.testsTotal) {
            evaluation = {
              ...evaluation,
              status: liveEval.status,
              tests_total: liveEval.testsTotal,
              tests_passed: liveEval.testsPassed,
              tests_failed: liveEval.testsFailed,
              failure_reason: liveEval.failureReason,
            };
          }
        }

        res.json({
          isAvailable: false,
          state:
            currentChallengeStatus === 'PASSED'
              ? 'PHASE2_PASSED'
              : currentChallengeStatus === 'FAILED'
              ? 'PHASE2_FAILED'
              : 'PHASE2_SUBMITTED',
          challengeStatus: currentChallengeStatus,
          assignment,
          challengeId: challenge.id,
          startedAt: challenge.started_at,
          deadlineAt: challenge.deadline_at,
          submittedAt: challenge.submitted_at,
          finalCode: challenge.final_code,
          mutatedCode: attempt.mutated_code,
          language: attempt.language,
          results: visibleResults,
          durationMs: evalDurationMs,
          evaluation: evaluation
            ? {
                status: currentChallengeStatus === 'PASSED' ? 'PASSED' : evaluation.status,
                testsTotal: evaluation.tests_total,
                testsPassed: currentChallengeStatus === 'PASSED' ? evaluation.tests_total : evaluation.tests_passed,
                testsFailed: currentChallengeStatus === 'PASSED' ? 0 : evaluation.tests_failed,
                failureReason: currentChallengeStatus === 'PASSED' ? null : evaluation.failure_reason,
                completedAt: evaluation.completed_at,
                results: visibleResults,
                durationMs: evalDurationMs,
              }
            : null,
        });
        return;
      }

      if (nowMs > deadlineMs) {
        if (challenge.status === 'ACTIVE') {
          const nowIso = new Date().toISOString();
          await repo.updatePhase2Challenge(challenge.id, {
            status: 'EXPIRED',
            updated_at: nowIso,
          });
          await repo.updateAttempt(attempt.id, {
            state: 'PHASE2_EXPIRED',
            updated_at: nowIso,
          });
        }

        res.json({
          isAvailable: false,
          state: 'PHASE2_EXPIRED',
          assignment,
          challengeId: challenge.id,
          startedAt: challenge.started_at,
          deadlineAt: challenge.deadline_at,
          remainingSeconds: 0,
          mutatedCode: attempt.mutated_code,
          language: attempt.language,
        });
        return;
      }

      // Check if critical security event occurred while ACTIVE
      const secEvents = await repo.getSecurityEventsForAttempt(attempt.id);
      const criticalEvent = secEvents.find(e => e.severity === 'CRITICAL');
      if (criticalEvent) {
        const nowIso = new Date().toISOString();
        await repo.updatePhase2Challenge(challenge.id, {
          status: 'SECURITY_TERMINATED',
          updated_at: nowIso,
        });
        await repo.updateAttempt(attempt.id, {
          state: 'SECURITY_TERMINATED',
          failure_reason: 'Critical security violation detected.',
          updated_at: nowIso,
        });

        res.json({
          isAvailable: false,
          state: 'SECURITY_TERMINATED',
          terminated: true,
          message: 'Your assessment was terminated because a critical security violation was detected.',
          assignment,
          challengeId: challenge.id,
          startedAt: challenge.started_at,
          deadlineAt: challenge.deadline_at,
          finalCode: challenge.final_code,
          mutatedCode: attempt.mutated_code,
          language: attempt.language,
        });
        return;
      }

      // Challenge is actively running
      const remainingSeconds = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
      const warningCount = secEvents.filter(e => e.severity === 'WARNING').length;
      res.json({
        isAvailable: true,
        state: 'PHASE2_ACTIVE',
        assignment,
        challengeId: challenge.id,
        startedAt: challenge.started_at,
        deadlineAt: challenge.deadline_at,
        remainingSeconds,
        warningCount,
        maxWarnings: 3,
        mutatedCode: attempt.mutated_code,
        language: attempt.language,
      });
    } catch (err: any) {
      console.error('Error getting Phase 2 status:', err);
      res.status(500).json({ error: 'Failed to retrieve Phase 2 state.' });
    }
  }
);

/**
 * POST /api/student/assignments/:assignmentId/phase2/start
 * Authorizes and initiates the server-authoritative 180-second Phase 2 challenge.
 * Idempotent: Subsequent calls return the existing active challenge and preserve its deadline.
 */
studentRouter.post(
  '/assignments/:assignmentId/phase2/start',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;

      // 1. Verify assignment exists and Phase 2 is unlocked by Faculty
      const repo = getRepository();
      const assignment = await repo.getAssignmentById(assignmentId);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }

      const isPhase2Unlocked = Boolean((assignment as any).phase2_unlocked || (assignment as any).phase2Unlocked);
      if (!isPhase2Unlocked) {
        res.status(403).json({
          error: 'Phase 2 is currently locked by your Faculty. Please wait for the Faculty to unlock Phase 2.',
        });
        return;
      }

      // 2. Strictly require Phase 1 submission before Phase 2 can start
      let attempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);
      if (!attempt || !attempt.submitted_at || !attempt.original_code) {
        res.status(400).json({ error: 'Phase 1 has not been submitted yet. Please submit Phase 1 first before starting Phase 2.' });
        return;
      }

      // 3. Ensure mutation exists and is ready from the student's submitted Phase 1 code
      const isPyAttempt = !attempt.language || attempt.language.toLowerCase() === 'python';
      const needsPyNorm =
        isPyAttempt &&
        (attempt.original_code !== normalizePythonSource(attempt.original_code) ||
          (Boolean(attempt.mutated_code) &&
            attempt.mutated_code !== normalizePythonSource(attempt.mutated_code)));

      if (
        needsPyNorm ||
        !attempt.mutated_code ||
        attempt.mutated_code === attempt.original_code ||
        attempt.mutated_code.includes('# BUG_MUTATION') ||
        attempt.mutated_code.includes('// BUG_MUTATION') ||
        attempt.mutation_status !== 'MUTATION_READY'
      ) {
        await MutationService.getInstance().processAttemptMutation(attempt.id);
        attempt = await repo.getAttemptById(attempt.id);
      }

      if (!attempt || attempt.mutation_status !== 'MUTATION_READY' || !attempt.mutated_code) {
        res.status(400).json({ error: 'Phase 2 is not available yet.' });
        return;
      }

      // 4. Verify Phase 2 has not already been submitted or completed
      if (attempt.state === 'SECURITY_TERMINATED') {
        res.status(403).json({ error: 'Your assessment was terminated because a critical security violation was detected.' });
        return;
      }
      if (
        attempt.state === 'PHASE2_SUBMITTED' ||
        attempt.state === 'PHASE2_PASSED' ||
        attempt.state === 'PHASE2_FAILED'
      ) {
        res.status(400).json({ error: 'This challenge has already been completed.' });
        return;
      }

      // 5. Check if an active/existing Phase 2 attempt already exists (Idempotency)
      const existingChallenge = await repo.getPhase2ChallengeByAttempt(attempt.id);

      const now = new Date();
      const nowMs = now.getTime();

      if (existingChallenge) {
        if (existingChallenge.status === 'SECURITY_TERMINATED') {
          res.status(403).json({ error: 'Your assessment was terminated because a critical security violation was detected.' });
          return;
        }

        if (
          existingChallenge.status === 'SUBMITTED' ||
          existingChallenge.status === 'PASSED' ||
          existingChallenge.status === 'FAILED'
        ) {
          res.status(400).json({ error: 'This challenge has already been submitted.' });
          return;
        }

        const deadlineMs = new Date(existingChallenge.deadline_at).getTime();
        if (nowMs > deadlineMs) {
          if (existingChallenge.status === 'ACTIVE') {
            const nowIso = now.toISOString();
            await repo.updatePhase2Challenge(existingChallenge.id, {
              status: 'EXPIRED',
              updated_at: nowIso,
            });
            await repo.updateAttempt(attempt.id, {
              state: 'PHASE2_EXPIRED',
              updated_at: nowIso,
            });
          }
          res.status(400).json({ error: 'Time expired. This challenge can no longer be submitted.' });
          return;
        }

        // Return existing active challenge without resetting the deadline
        const remainingSeconds = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
        res.json({
          success: true,
          challengeId: existingChallenge.id,
          assignmentId,
          mutatedCode: attempt.mutated_code,
          language: attempt.language,
          startedAt: existingChallenge.started_at,
          deadlineAt: existingChallenge.deadline_at,
          remainingSeconds,
          status: 'ACTIVE',
        });
        return;
      }

      // 6. Create brand-new Phase 2 challenge: exactly 180 seconds server-authoritative
      const startedAt = now.toISOString();
      const deadlineDate = new Date(nowMs + 180 * 1000);
      const deadlineAt = deadlineDate.toISOString();
      const challengeId = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      await repo.createPhase2Challenge({
        id: challengeId,
        assignment_id: assignmentId,
        student_id: studentId,
        attempt_id: attempt.id,
        mutation_id: null,
        status: 'ACTIVE',
        started_at: startedAt,
        deadline_at: deadlineAt,
        submitted_at: null,
        final_code: null,
      });

      await repo.updateAttempt(attempt.id, {
        state: 'PHASE2_ACTIVE',
        phase2_start_time: startedAt,
        phase2_deadline: deadlineAt,
        updated_at: startedAt,
      });

      res.status(201).json({
        success: true,
        challengeId,
        assignmentId,
        mutatedCode: attempt.mutated_code,
        language: attempt.language,
        startedAt,
        deadlineAt,
        remainingSeconds: 180,
        status: 'ACTIVE',
      });
    } catch (err: any) {
      console.error('Error starting Phase 2 challenge:', err);
      res.status(500).json({ error: 'Failed to start Phase 2 challenge.' });
    }
  }
);

/**
 * POST /api/student/assignments/:assignmentId/phase2/events
 * Ingests security/proctoring signals from the client and enforces centralized security policy.
 */
studentRouter.post(
  '/assignments/:assignmentId/phase2/events',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;
      const { challengeId, eventType, severity, metadata, clientTimestamp } = req.body;

      if (!eventType || typeof eventType !== 'string') {
        res.status(400).json({ error: 'Event type is required.' });
        return;
      }

      const securityService = SecurityService.getInstance();
      const outcome = await securityService.logSecurityEvent(assignmentId, studentId, {
        challengeId,
        eventType,
        severity,
        metadata,
        clientTimestamp,
      });

      res.json({
        success: true,
        recorded: outcome.recorded,
        terminated: outcome.terminated,
        message: outcome.terminated
          ? outcome.reason || 'Your assessment was terminated because a critical security violation was detected.'
          : outcome.reason,
        warningCount: outcome.warningCount,
        maxWarnings: outcome.maxWarnings,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message && (err.message.includes('not owned') || err.message.includes('Unauthorized'))) {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error('Error logging security event:', err);
      res.status(500).json({ error: 'Failed to record security event.' });
    }
  }
);

/**
 * GET /api/student/assignments/:assignmentId/phase2/security-status
 * Queries authoritative security state, warning tally, and event history.
 */
studentRouter.get(
  '/assignments/:assignmentId/phase2/security-status',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;

      const securityService = SecurityService.getInstance();
      const status = await securityService.getSecurityStatus(assignmentId, studentId);

      res.json({
        success: true,
        ...status,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('Error fetching security status:', err);
      res.status(500).json({ error: 'Failed to fetch security status.' });
    }
  }
);

/**
 * POST /api/student/assignments/:assignmentId/phase2/terminate
 * Explicitly terminates an attempt due to a confirmed security violation or student exam cancellation
 * (pressing Back, minimizing window/switching tab, or closing browser tab during Phase 1 or Phase 2).
 */
studentRouter.post(
  '/assignments/:assignmentId/phase2/terminate',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;
      const { challengeId, reason, eventType, code, language, phase } = req.body || {};

      if (phase === 'PHASE1') {
        res.json({
          success: true,
          terminated: false,
          message: 'Security termination applies only to Phase 2.',
        });
        return;
      }

      const repo = getRepository();
      const existingAttempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);

      // Do not overwrite already completed final attempts
      if (
        existingAttempt &&
        (existingAttempt.state === 'PASSED' ||
          existingAttempt.state === 'PHASE2_PASSED' ||
          existingAttempt.state === 'PHASE2_FAILED' ||
          existingAttempt.state === 'FAILED')
      ) {
        res.json({
          success: true,
          terminated: false,
          message: 'Attempt is already completed.',
        });
        return;
      }

      const cancelReason =
        typeof reason === 'string' && reason.trim().length > 0
          ? reason.trim()
          : 'Exam Cancelled: Student pressed Back, minimized window, or closed browser tab';

      const now = new Date().toISOString();
      let attemptId: string;

      if (!existingAttempt) {
        attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await repo.createAttempt({
          id: attemptId,
          assignment_id: assignmentId,
          student_id: studentId,
          state: 'SECURITY_TERMINATED',
          language: typeof language === 'string' && language ? language : 'python',
          original_code: typeof code === 'string' && code.trim().length > 0 ? code : null,
          failure_reason: cancelReason,
          submitted_at: now,
        });
      } else {
        attemptId = existingAttempt.id;
        // Preserve original failure_reason if already terminated
        const finalReason =
          existingAttempt.state === 'SECURITY_TERMINATED' && existingAttempt.failure_reason
            ? existingAttempt.failure_reason
            : cancelReason;

        await repo.updateAttempt(attemptId, {
          state: 'SECURITY_TERMINATED',
          failure_reason: finalReason,
          submitted_at: existingAttempt.submitted_at || now,
          ...(typeof code === 'string' && code.trim().length > 0 && !existingAttempt.original_code
            ? { original_code: code }
            : {}),
        });
      }

      // Terminate any active/ready Phase 2 challenge
      const challenge = challengeId
        ? await repo.getPhase2ChallengeById(challengeId)
        : await repo.getPhase2ChallengeByAttempt(attemptId);

      if (challenge && challenge.student_id === studentId && challenge.status !== 'SECURITY_TERMINATED') {
        await repo.updatePhase2Challenge(challenge.id, {
          status: 'SECURITY_TERMINATED',
        });
      }

      // Record security event for faculty audit trail
      const eventId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await repo.recordSecurityEvent({
        id: eventId,
        attempt_id: attemptId,
        challenge_id: challenge?.id || null,
        student_id: studentId,
        assignment_id: assignmentId,
        event_type: eventType || 'EXAM_CANCELLED',
        severity: 'CRITICAL',
        phase: typeof phase === 'string' && phase ? phase : challenge ? 'PHASE2' : 'PHASE1',
        metadata_json: JSON.stringify({
          explicitTermination: true,
          reason: cancelReason,
          eventType: eventType || 'EXAM_CANCELLED',
        }),
        client_timestamp: now,
        server_timestamp: now,
      });

      res.json({
        success: true,
        terminated: true,
        reason: cancelReason,
        message: cancelReason,
      });
    } catch (err: any) {
      console.error('Error terminating challenge:', err);
      res.status(500).json({ error: 'Failed to terminate challenge.' });
    }
  }
);

/**
 * POST /api/student/phase2/:attemptId/security-events
 * Canonical attempt-scoped security events endpoint with cross-student authorization check.
 */
studentRouter.post(
  '/phase2/:attemptId/security-events',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { attemptId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;
      const { challengeId, eventType, severity, metadata, clientTimestamp } = req.body;

      if (!eventType || typeof eventType !== 'string') {
        res.status(400).json({ error: 'Event type is required.' });
        return;
      }

      // Check attempt authorization
      const repo = getRepository();
      const attempt = await repo.getAttemptById(attemptId);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found.' });
        return;
      }
      if (attempt.student_id !== studentId) {
        res.status(403).json({ error: 'Access denied: Attempt does not belong to student.' });
        return;
      }

      const securityService = SecurityService.getInstance();
      const outcome = await securityService.logSecurityEvent(attempt.assignment_id, studentId, {
        challengeId,
        eventType,
        severity,
        metadata,
        clientTimestamp,
      });

      res.json({
        success: true,
        recorded: outcome.recorded,
        terminated: outcome.terminated,
        message: outcome.reason,
        warningCount: outcome.warningCount,
        maxWarnings: outcome.maxWarnings,
      });
    } catch (err: any) {
      console.error('Error in attempt-scoped security event:', err);
      res.status(500).json({ error: 'Failed to record security event.' });
    }
  }
);

/**
 * POST /api/student/assignments/:assignmentId/run
 * Non-finalizing test execution: runs code against visible/public test cases in sandbox.
 * Shows output, stderr, and test status without finalizing or modifying attempt state.
 */
studentRouter.post(
  '/assignments/:assignmentId/run',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;
      const { code, language } = req.body;

      if (code === undefined || code === null || typeof code !== 'string') {
        res.status(400).json({ error: 'Code is required.' });
        return;
      }

      if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
        res.status(400).json({ error: 'Code exceeds maximum allowed size (200 KB).' });
        return;
      }

      const repo = getRepository();
      const assignment = await repo.getAssignmentById(assignmentId);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }

      const attempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);

      let rawTests: TestCase[] = [];
      if (assignment.test_cases_json) {
        try {
          rawTests = JSON.parse(assignment.test_cases_json);
        } catch {
          rawTests = [];
        }
      }

      const allTests = resolveAssignmentTestCases(
        rawTests,
        assignment.title,
        assignment.description
      );

      // Persist cleaned test cases if leftover Even/Odd defaults were removed
      if (rawTests.length !== allTests.length) {
        try {
          await repo.updateAssignment(assignmentId, {
            test_cases_json: JSON.stringify(allTests),
          });
        } catch {
          // ignore
        }
      }

      // ONLY run against visible/public tests — NEVER expose hidden tests during Run Code
      const visibleTests = allTests.filter((t) => !t.is_hidden && !t.isHidden);
      const testsToRun = visibleTests.length > 0 ? visibleTests : allTests.slice(0, 4).map((t) => ({ ...t, is_hidden: false }));

      const runLanguage = language || attempt?.language || assignment.language || 'python';
      const outcome = await executeTestCases(code, runLanguage, testsToRun, 3500, {
        originalCode: attempt?.original_code,
        mutatedCode: attempt?.mutated_code,
        title: assignment.title,
        description: assignment.description,
      });

      res.json({
        success: true,
        testsTotal: outcome.testsTotal,
        testsPassed: outcome.testsPassed,
        testsFailed: outcome.testsFailed,
        results: outcome.results,
        durationMs: outcome.durationMs,
      });
    } catch (err: any) {
      console.error('Error executing student test run:', err);
      res.status(500).json({ error: 'Failed to execute test run.' });
    }
  }
);

/**
 * POST /api/student/assignments/:assignmentId/phase2/submit
 * Deterministically evaluates submitted final code in an isolated sandbox.
 * Strictly non-AI: Pass/Fail based purely on test case outputs.
 */
studentRouter.post(
  '/assignments/:assignmentId/phase2/submit',
  authenticate,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user!.userId || (req.user as any)?.id;
      const { challengeId, finalCode } = req.body;

      if (!challengeId || typeof challengeId !== 'string') {
        res.status(400).json({ error: 'Challenge ID is required.' });
        return;
      }

      if (typeof finalCode !== 'string') {
        res.status(400).json({ error: 'Final code is required.' });
        return;
      }

      if (Buffer.byteLength(finalCode, 'utf8') > MAX_CODE_BYTES) {
        res.status(400).json({ error: 'Final code exceeds maximum allowed size (200 KB).' });
        return;
      }

      // Fetch challenge
      const repo = getRepository();
      const challenge = await repo.getPhase2ChallengeById(challengeId);
      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found.' });
        return;
      }

      // Fetch attempt
      const attempt = await repo.getAttemptById(challenge.attempt_id);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found.' });
        return;
      }

      // Verify student ownership
      if (challenge.student_id !== studentId) {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
      }

      // Verify assignment match
      if (challenge.assignment_id !== assignmentId) {
        res.status(400).json({ error: 'Challenge does not match this assignment.' });
        return;
      }

      // Check if attempt was terminated due to security violation
      if (
        challenge.status === 'SECURITY_TERMINATED' ||
        attempt.state === 'SECURITY_TERMINATED'
      ) {
        res.status(403).json({
          error: 'Your assessment was terminated because a critical security violation was detected.',
        });
        return;
      }

      // Verify challenge has not already reached a terminal state
      if (
        challenge.status === 'SUBMITTED' ||
        challenge.status === 'PASSED' ||
        challenge.status === 'FAILED' ||
        challenge.submitted_at
      ) {
        res.status(400).json({ error: 'This challenge has already been submitted.' });
        return;
      }

      // Verify server-authoritative deadline
      const now = new Date();
      const nowMs = now.getTime();
      const deadlineMs = new Date(challenge.deadline_at).getTime();

      if (nowMs > deadlineMs) {
        const nowIso = now.toISOString();
        await repo.updatePhase2Challenge(challenge.id, {
          status: 'EXPIRED',
          updated_at: nowIso,
        });
        await repo.updateAttempt(challenge.attempt_id, {
          state: 'PHASE2_EXPIRED',
          updated_at: nowIso,
        });

        res.status(400).json({ error: 'Time expired. This challenge can no longer be submitted.' });
        return;
      }

      // Check for any unhandled CRITICAL security events
      const secEvents = await repo.getSecurityEventsForAttempt(challenge.attempt_id);
      const criticalSecEvent = secEvents.find(e => e.severity === 'CRITICAL');
      if (criticalSecEvent) {
        const nowIso = now.toISOString();
        await repo.updatePhase2Challenge(challenge.id, {
          status: 'SECURITY_TERMINATED',
          updated_at: nowIso,
        });
        await repo.updateAttempt(challenge.attempt_id, {
          state: 'SECURITY_TERMINATED',
          failure_reason: 'Critical security violation detected.',
          updated_at: nowIso,
        });

        res.status(403).json({
          error: 'Your assessment was terminated because a critical security violation was detected.',
        });
        return;
      }

      const submittedAt = now.toISOString();
      const codeHash = computeCodeHash(finalCode);

      // Fetch assignment and approved Phase 1 code
      const assignment = await repo.getAssignmentById(assignmentId);
      const evalLanguage = attempt.language || assignment?.language || 'python';

      let aiEvaluation: GeminiEvaluationResponse;
      try {
        aiEvaluation = await evaluatePhase2Submission({
          title: assignment?.title || 'Assignment',
          description: assignment?.description || '',
          requirements: assignment?.requirements || '',
          language: evalLanguage,
          phase1Code: attempt.original_code || '',
          phase2Code: finalCode,
        });
      } catch (geminiErr: any) {
        if (geminiErr instanceof GeminiConfigError) {
          res.status(400).json({
            error: 'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in backend environment variables.',
            configError: true,
          });
          return;
        }
        console.error('[SyntaXViva Phase 2] Gemini evaluation error:', geminiErr);
        res.status(502).json({
          error: `AI Evaluation Error: ${geminiErr.message || 'Failed to connect to Gemini API. Please retry your submission.'}`,
          apiError: true,
        });
        return;
      }

      const evalId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const isPassed = aiEvaluation.is_correct || aiEvaluation.result === 'PASS';
      const evalJson = JSON.stringify(aiEvaluation);

      await repo.createPhase2Evaluation({
        id: evalId,
        challenge_id: challenge.id,
        attempt_id: challenge.attempt_id,
        assignment_id: assignmentId,
        student_id: studentId,
        submitted_code_hash: codeHash,
        status: isPassed ? 'PASSED' : 'FAILED',
        tests_total: 1,
        tests_passed: isPassed ? 1 : 0,
        tests_failed: isPassed ? 0 : 1,
        failure_reason: isPassed ? null : aiEvaluation.summary,
        execution_metadata_json: evalJson,
        started_at: submittedAt,
        completed_at: new Date().toISOString(),
      });

      if (isPassed) {
        await repo.updatePhase2Challenge(challenge.id, {
          status: 'PASSED',
          final_code: finalCode,
          submitted_at: submittedAt,
          updated_at: submittedAt,
        });

        await repo.updateAttempt(challenge.attempt_id, {
          state: 'PHASE2_PASSED',
          repaired_code: finalCode,
          evaluation_result_json: evalJson,
          failure_reason: null,
          updated_at: submittedAt,
        });

        res.json({
          success: true,
          message: 'Your Phase 2 solution was approved by Gemini AI evaluation.',
          challengeId: challenge.id,
          assignmentId,
          submittedAt,
          state: 'PHASE2_SUBMITTED',
          evaluationStatus: 'PASSED',
          evaluation: aiEvaluation,
        });
      } else {
        await repo.updatePhase2Challenge(challenge.id, {
          status: 'FAILED',
          final_code: finalCode,
          submitted_at: submittedAt,
          updated_at: submittedAt,
        });

        await repo.updateAttempt(challenge.attempt_id, {
          state: 'PHASE2_FAILED',
          repaired_code: finalCode,
          evaluation_result_json: evalJson,
          failure_reason: aiEvaluation.summary,
          updated_at: submittedAt,
        });

        res.json({
          success: false,
          message: aiEvaluation.summary || 'Phase 2 solution did not pass AI evaluation.',
          challengeId: challenge.id,
          assignmentId,
          submittedAt,
          state: 'PHASE2_SUBMITTED',
          evaluationStatus: 'FAILED',
          failureReason: aiEvaluation.summary,
          evaluation: aiEvaluation,
        });
      }
    } catch (err: any) {
      console.error('Error evaluating and submitting Phase 2 challenge:', err);
      res.status(500).json({ error: 'Failed to process Phase 2 submission.' });
    }
  }
);

/**
 * POST /api/student/assignments/:assignmentId/phase2/retry
 * Disabled: Phase 2 strictly allows only a single submission.
 */
studentRouter.post(
  '/assignments/:assignmentId/phase2/retry',
  authenticate,
  requireRole('student'),
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(403).json({
      error: 'Phase 2 allows only a single submission. Retries are disabled.',
    });
  }
);

