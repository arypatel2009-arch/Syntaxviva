/**
 * Centralized Security Service
 * Handles append-only persistence, attempt authorization, and anti-tampering enforcement.
 * Refactored to use the Application Repository abstraction.
 */

import { getRepository } from '../repository/index.js';
import { SecurityPolicyEngine } from './policy.js';
import { SecurityEventPayload, SecurityEventRecord, SecurityPolicyResult } from './types.js';

export class SecurityService {
  private static instance: SecurityService;
  private policyEngine = SecurityPolicyEngine.getInstance();

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Appends a security event and evaluates policy enforcement.
   */
  public async logSecurityEvent(
    assignmentId: string,
    studentId: string,
    payload: SecurityEventPayload
  ): Promise<{
    eventId: string;
    recorded: boolean;
    terminated: boolean;
    reason?: string;
    warningCount: number;
    maxWarnings: number;
  }> {
    const { challengeId, eventType, severity: clientSeverity, metadata, clientTimestamp } = payload;
    const repo = getRepository();

    // 1. Verify Attempt existence and ownership
    const attempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);

    if (!attempt) {
      throw new Error('Attempt not found for student and assignment.');
    }

    // 2. Anti-tampering: Verify Challenge ownership if provided
    let challenge: any = null;
    if (challengeId) {
      const found = await repo.getPhase2ChallengeById(challengeId);
      if (found && found.student_id === studentId) {
        challenge = found;
      }
      if (!challenge) {
        throw new Error('Challenge not found or not owned by student.');
      }
    } else {
      challenge = await repo.getPhase2ChallengeByAttempt(attempt.id);
    }

    // 3. Pre-start readiness protection: If challenge is not ACTIVE yet, do NOT fail or lock
    if (!challenge || challenge.status !== 'ACTIVE') {
      const eventId = `sec_pre_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const serverTimestamp = new Date().toISOString();
      const metadataStr = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : '{}';

      await repo.recordSecurityEvent({
        id: eventId,
        attempt_id: attempt.id,
        challenge_id: challenge?.id || null,
        student_id: studentId,
        assignment_id: assignmentId,
        event_type: eventType,
        severity: 'INFO',
        phase: 'PRE_START',
        metadata_json: metadataStr,
        client_timestamp: clientTimestamp || serverTimestamp,
        server_timestamp: serverTimestamp,
      });

      return {
        eventId,
        recorded: true,
        terminated: false,
        reason: 'Pre-start readiness telemetry (no violation enforced prior to active challenge start).',
        warningCount: 0,
        maxWarnings: this.policyEngine.maxWarnings,
      };
    }

    // 4. If already terminated, record event for audit and return terminated
    if (attempt.state === 'SECURITY_TERMINATED' || challenge?.status === 'SECURITY_TERMINATED') {
      const eventId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const serverTimestamp = new Date().toISOString();
      const metadataStr = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : '{}';

      await repo.recordSecurityEvent({
        id: eventId,
        attempt_id: attempt.id,
        challenge_id: challenge?.id || null,
        student_id: studentId,
        assignment_id: assignmentId,
        event_type: eventType,
        severity: 'CRITICAL',
        phase: 'PHASE2',
        metadata_json: metadataStr,
        client_timestamp: clientTimestamp || serverTimestamp,
        server_timestamp: serverTimestamp,
      });

      return {
        eventId,
        recorded: true,
        terminated: true,
        reason: attempt.failure_reason || 'Assessment was previously terminated due to a critical security violation.',
        warningCount: this.policyEngine.maxWarnings,
        maxWarnings: this.policyEngine.maxWarnings,
      };
    }

    // 5. Count existing WARNING events for this attempt
    const existingEvents = await repo.getSecurityEventsForAttempt(attempt.id);
    const currentWarningCount = existingEvents.filter(
      (e) => (e.severity || '').toUpperCase() === 'WARNING'
    ).length;

    // 6. Evaluate policy
    const policyResult: SecurityPolicyResult = this.policyEngine.evaluateEvent(
      eventType,
      clientSeverity,
      currentWarningCount,
      metadata
    );

    // 7. Persist append-only security event record
    const eventId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const serverTimestamp = new Date().toISOString();
    const metadataStr = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : '{}';

    await repo.recordSecurityEvent({
      id: eventId,
      attempt_id: attempt.id,
      challenge_id: challenge?.id || null,
      student_id: studentId,
      assignment_id: assignmentId,
      event_type: eventType,
      severity: policyResult.severity,
      phase: 'PHASE2',
      metadata_json: metadataStr,
      client_timestamp: clientTimestamp || serverTimestamp,
      server_timestamp: serverTimestamp,
    });

    // 8. If critical violation or warnings limit exceeded -> Atomically terminate attempt
    if (policyResult.shouldTerminate) {
      if (challenge && (challenge.status === 'ACTIVE' || challenge.status === 'READY')) {
        await repo.updatePhase2Challenge(challenge.id, {
          status: 'SECURITY_TERMINATED',
        });
      }

      await repo.updateAttempt(attempt.id, {
        state: 'SECURITY_TERMINATED',
        failure_reason: policyResult.reason || 'Critical security policy violation detected.',
      });

      return {
        eventId,
        recorded: true,
        terminated: true,
        reason: policyResult.reason,
        warningCount: policyResult.warningCount,
        maxWarnings: policyResult.maxWarnings,
      };
    }

    return {
      eventId,
      recorded: true,
      terminated: false,
      reason: policyResult.reason,
      warningCount: policyResult.warningCount,
      maxWarnings: policyResult.maxWarnings,
    };
  }

  /**
   * Retrieves security monitoring status and event history for student attempt.
   */
  public async getSecurityStatus(assignmentId: string, studentId: string): Promise<{
    attemptId: string | null;
    challengeId: string | null;
    state: string;
    isTerminated: boolean;
    warningCount: number;
    maxWarnings: number;
    events: any[];
  }> {
    const repo = getRepository();
    const attempt = await repo.getAttemptByStudentAndAssignment(studentId, assignmentId);

    if (!attempt) {
      throw new Error('Attempt not found.');
    }

    const challenge = await repo.getPhase2ChallengeByAttempt(attempt.id);
    const rawEvents = await repo.getSecurityEventsForAttempt(attempt.id);

    const warningCount = rawEvents.filter(
      (e) => (e.severity || '').toUpperCase() === 'WARNING'
    ).length;

    const isTerminated =
      attempt.state === 'SECURITY_TERMINATED' || challenge?.status === 'SECURITY_TERMINATED';

    const events = rawEvents.map((e) => {
      let meta: any = {};
      try {
        meta = typeof e.metadata_json === 'string' ? JSON.parse(e.metadata_json) : (e.metadata_json || {});
      } catch {
        meta = {};
      }
      return {
        id: e.id,
        attemptId: e.attempt_id,
        challengeId: e.challenge_id || undefined,
        studentId: e.student_id || undefined,
        assignmentId: e.assignment_id || undefined,
        eventType: e.event_type as any,
        severity: e.severity as any,
        phase: (e.phase as any) || 'PHASE2',
        metadata: meta,
        clientTimestamp: e.client_timestamp || undefined,
        serverTimestamp: e.server_timestamp,
        createdAt: e.created_at,
      };
    });

    return {
      attemptId: attempt.id,
      challengeId: challenge?.id || null,
      state: attempt.state,
      isTerminated,
      warningCount,
      maxWarnings: this.policyEngine.maxWarnings,
      events,
    };
  }
}
