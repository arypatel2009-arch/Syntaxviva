/**
 * SyntaXViva Phase 2 — SQLite Application Repository
 * Production fallback and reference data access layer.
 */

import {
  IApplicationRepository,
  ProfileEntity,
  AssignmentEntity,
  StudentAttemptEntity,
  AttemptMutationEntity,
  Phase2ChallengeEntity,
  Phase2EvaluationEntity,
  SecurityEventEntity,
  FacultyDivisionSessionEntity,
  MutationRegistryEntity,
  ProctoringEventEntity,
  DashboardStatsEntity,
  UserRole,
} from './types.js';
import {
  dbGet,
  dbQuery,
  dbRun,
  saveDatabaseToDisk,
  getProfileById as dbGetProfileById,
  getProfileByEmail as dbGetProfileByEmail,
  getStudentByAcademicRoll as dbGetStudentByAcademicRoll,
  upsertProfile as dbUpsertProfile,
  updateProfile as dbUpdateProfile,
  getFacultyDivisionSession as dbGetFacultyDivisionSession,
  claimFacultyDivisionSession as dbClaimFacultyDivisionSession,
  heartbeatFacultyDivisionSession as dbHeartbeatFacultyDivisionSession,
  releaseFacultyDivisionSession as dbReleaseFacultyDivisionSession,
} from '../db/database.js';
import { resolveAssignmentTestCases, evaluateSubmission } from '../execution/evaluator.js';

function isDeadlinePassed(dueDate?: string | null): boolean {
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

export class SqliteApplicationRepository implements IApplicationRepository {
  async getProfileById(id: string): Promise<ProfileEntity | null> {
    const p = dbGetProfileById(id);
    return p ? (p as ProfileEntity) : null;
  }

  async getProfileByEmail(email: string): Promise<ProfileEntity | null> {
    const p = dbGetProfileByEmail(email);
    return p ? (p as ProfileEntity) : null;
  }

  async getStudentByAcademicRoll(
    institution: string,
    classId: string,
    divisionId: string,
    rollNumber: string
  ): Promise<ProfileEntity | null> {
    const p = dbGetStudentByAcademicRoll(institution, classId, divisionId, rollNumber);
    return p ? (p as ProfileEntity) : null;
  }

  async upsertProfile(data: Partial<ProfileEntity> & { id: string; email: string; full_name: string }): Promise<ProfileEntity> {
    const p = dbUpsertProfile(data as any);
    return p as ProfileEntity;
  }

  async updateProfile(id: string, updates: Partial<ProfileEntity>): Promise<ProfileEntity | null> {
    const p = dbUpdateProfile(id, updates as any);
    return p ? (p as ProfileEntity) : null;
  }

  async getAssignments(filter?: { role?: UserRole; studentId?: string; status?: string }): Promise<any[]> {
    // Clean up any legacy Phase-1-only security terminations, clear template starter_code, and remove old template-only attempts
    try {
      dbRun(`UPDATE assignments SET starter_code = '' WHERE starter_code IS NOT NULL AND starter_code != ''`);
      dbRun(
        `DELETE FROM phase2_challenges 
         WHERE attempt_id IN (SELECT id FROM student_attempts WHERE original_code LIKE '%def solve(nums, target):%')`
      );
      dbRun(
        `DELETE FROM attempt_mutations 
         WHERE attempt_id IN (SELECT id FROM student_attempts WHERE original_code LIKE '%def solve(nums, target):%')`
      );
      dbRun(`DELETE FROM student_attempts WHERE original_code LIKE '%def solve(nums, target):%'`);
      dbRun(
        `DELETE FROM student_attempts 
         WHERE state = 'SECURITY_TERMINATED' 
           AND mutation_status IS NULL 
           AND id NOT IN (SELECT attempt_id FROM phase2_challenges)`
      );
      dbRun(
        `UPDATE student_attempts 
         SET state = 'MUTATION_READY', mutation_status = 'MUTATION_READY', failure_reason = NULL
         WHERE state = 'MUTATION_PROCESSING_FAILED' OR mutation_status = 'MUTATION_PROCESSING_FAILED'`
      );
      dbRun(
        `UPDATE assignments 
         SET phase2_unlocked = 1 
         WHERE phase2_unlocked = 0 
           AND LOWER(TRIM(title)) IN (SELECT LOWER(TRIM(title)) FROM assignments WHERE phase2_unlocked = 1)`
      );

      // Clean leftover Even/Odd default test cases on non-even/odd assignments
      const allAsgs = dbQuery(`SELECT id, title, description, test_cases_json FROM assignments`);
      for (const asg of allAsgs) {
        let parsed: any[] = [];
        try {
          parsed = asg.test_cases_json ? JSON.parse(asg.test_cases_json) : [];
        } catch {
          parsed = [];
        }
        const resolved = resolveAssignmentTestCases(parsed, asg.title, asg.description);
        if (JSON.stringify(parsed) !== JSON.stringify(resolved)) {
          dbRun(`UPDATE assignments SET test_cases_json = ? WHERE id = ?`, [
            JSON.stringify(resolved),
            asg.id,
          ]);
        }
      }

      // Auto-repair any PHASE2_FAILED attempts that failed due to Windows timeout or leftover Even/Odd defaults
      const failedAttempts = dbQuery(
        `SELECT sa.id, sa.assignment_id, sa.language, sa.original_code, sa.mutated_code, sa.repaired_code,
                p2.id as challenge_id, p2.final_code,
                a.title, a.description, a.test_cases_json
         FROM student_attempts sa
         JOIN phase2_challenges p2 ON p2.attempt_id = sa.id
         JOIN assignments a ON a.id = sa.assignment_id
         WHERE sa.state = 'PHASE2_FAILED' OR p2.status = 'FAILED'`
      );
      for (const fa of failedAttempts) {
        const finalCode = fa.final_code || fa.repaired_code || '';
        if (!finalCode.trim()) continue;
        let tests: any[] = [];
        try {
          tests = fa.test_cases_json ? JSON.parse(fa.test_cases_json) : [];
        } catch {
          tests = [];
        }
        const outcome = await evaluateSubmission(finalCode, fa.language || 'python', tests, {
          originalCode: fa.original_code,
          mutatedCode: fa.mutated_code,
          title: fa.title,
          description: fa.description,
        });
        if (outcome.status === 'PASSED') {
          dbRun(
            `UPDATE student_attempts SET state = 'PHASE2_PASSED', failure_reason = NULL, evaluation_result_json = ? WHERE id = ?`,
            [JSON.stringify(outcome), fa.id]
          );
          dbRun(`UPDATE phase2_challenges SET status = 'PASSED' WHERE id = ?`, [fa.challenge_id]);
          dbRun(
            `UPDATE phase2_evaluations SET status = 'PASSED', tests_total = ?, tests_passed = ?, tests_failed = 0, failure_reason = NULL WHERE challenge_id = ?`,
            [outcome.testsTotal, outcome.testsPassed, fa.challenge_id]
          );
        }
      }
    } catch {
      // ignore cleanup note
    }

    const params: any[] = [];
    let studentFields = '';
    if (filter?.role === 'student' && filter.studentId) {
      studentFields = `,
        (SELECT sa.id FROM student_attempts sa WHERE sa.assignment_id = a.id AND sa.student_id = ? LIMIT 1) as myAttemptId,
        (SELECT sa.state FROM student_attempts sa WHERE sa.assignment_id = a.id AND sa.student_id = ? LIMIT 1) as myAttemptState,
        (SELECT sa.submitted_at FROM student_attempts sa WHERE sa.assignment_id = a.id AND sa.student_id = ? LIMIT 1) as mySubmittedAt,
        (SELECT sa.mutation_status FROM student_attempts sa WHERE sa.assignment_id = a.id AND sa.student_id = ? LIMIT 1) as myMutationStatus,
        (SELECT sa.failure_reason FROM student_attempts sa WHERE sa.assignment_id = a.id AND sa.student_id = ? LIMIT 1) as myFailureReason,
        (SELECT p2.status FROM phase2_challenges p2 JOIN student_attempts sa ON p2.attempt_id = sa.id WHERE sa.assignment_id = a.id AND sa.student_id = ? LIMIT 1) as myPhase2Status`;
      params.push(filter.studentId, filter.studentId, filter.studentId, filter.studentId, filter.studentId, filter.studentId);
    }

    let querySql = `
      SELECT 
        a.id, a.title, a.description, a.language, a.requirements, '' as starterCode,
        a.test_cases_json as testCasesJson, a.status,
        COALESCE(a.phase2_unlocked, 0) as phase2Unlocked,
        COALESCE(a.phase2_unlocked, 0) as phase2_unlocked,
        a.created_by as createdBy,
        COALESCE(NULLIF(TRIM(a.due_date), ''), '2026-10-20') as dueDate,
        a.created_at as createdAt, a.updated_at as updatedAt,
        COALESCE(p.full_name, u.name, 'Faculty') as createdByName,
        (SELECT COUNT(*) FROM student_attempts sa WHERE sa.assignment_id = a.id) as submissionCount
        ${studentFields}
      FROM assignments a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN profiles p ON a.created_by = p.id
    `;

    if (filter?.role === 'student') {
      querySql += ` WHERE LOWER(a.status) IN ('active', 'published', 'open')`;
    }
    querySql += ` ORDER BY a.created_at DESC`;

    const rows = dbQuery(querySql, params);
    return rows.map((r: any) => ({
      ...r,
      starterCode: '',
      starter_code: '',
      phase2Unlocked: Boolean(r.phase2Unlocked || r.phase2_unlocked),
      phase2_unlocked: r.phase2Unlocked || r.phase2_unlocked ? 1 : 0,
      isDeadlinePassed: isDeadlinePassed(r.dueDate),
    }));
  }

  async getAssignmentById(id: string): Promise<AssignmentEntity | null> {
    const row = dbGet<AssignmentEntity>(
      `SELECT a.*, COALESCE(p.full_name, u.name, 'Faculty') as createdByName
       FROM assignments a
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN profiles p ON a.created_by = p.id
       WHERE a.id = ?`,
      [id]
    );
    if (row) {
      if (!row.due_date || !row.due_date.trim()) {
        row.due_date = '2026-10-20';
      }
      row.starter_code = '';
      row.phase2Unlocked = Boolean(row.phase2_unlocked);
    }
    return row;
  }

  async createAssignment(data: Omit<AssignmentEntity, 'created_at' | 'updated_at'>): Promise<AssignmentEntity> {
    const now = new Date().toISOString();
    const creatorId = data.created_by || 'faculty-default';

    // Ensure creator exists in users table so foreign key constraints never fail
    try {
      const prof = dbGetProfileById(creatorId);
      dbRun(
        `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          creatorId,
          prof?.full_name || 'Faculty',
          prof?.email || `${creatorId}@syntaxviva.local`,
          'SUPABASE_MANAGED_AUTH',
          prof?.role === 'admin' ? 'admin' : 'faculty',
          now,
          now,
        ]
      );
    } catch {
      // ignore if user already exists
    }

    const phase2UnlockedVal = data.phase2_unlocked || data.phase2Unlocked ? 1 : 0;

    dbRun(
      `INSERT INTO assignments (
        id, title, description, language, requirements, starter_code, 
        test_cases_json, status, phase2_unlocked, created_by, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.title || 'Untitled Assignment',
        data.description || data.title || '',
        data.language || 'python',
        data.requirements || '',
        data.starter_code || '',
        data.test_cases_json || '[]',
        data.status || 'active',
        phase2UnlockedVal,
        creatorId,
        data.due_date || '2026-10-20',
        now,
        now,
      ]
    );
    return (await this.getAssignmentById(data.id))!;
  }

  async updateAssignment(id: string, data: Partial<AssignmentEntity>): Promise<AssignmentEntity | null> {
    const existing = await this.getAssignmentById(id);
    if (!existing) return null;
    const now = new Date().toISOString();

    const title = data.title !== undefined ? data.title : existing.title;
    const description = data.description !== undefined ? data.description : existing.description;
    const requirements = data.requirements !== undefined ? data.requirements : existing.requirements;
    const starterCode = data.starter_code !== undefined ? data.starter_code : existing.starter_code;
    const testCasesJson = data.test_cases_json !== undefined ? data.test_cases_json : existing.test_cases_json;
    const dueDate = data.due_date !== undefined ? data.due_date : existing.due_date;
    const status = data.status !== undefined ? data.status : existing.status;
    const phase2Unlocked =
      data.phase2_unlocked !== undefined
        ? data.phase2_unlocked
          ? 1
          : 0
        : data.phase2Unlocked !== undefined
          ? data.phase2Unlocked
            ? 1
            : 0
          : existing.phase2_unlocked
            ? 1
            : 0;

    dbRun(
      `UPDATE assignments SET 
        title = ?, description = ?, requirements = ?, starter_code = ?,
        test_cases_json = ?, due_date = ?, status = ?, phase2_unlocked = ?, updated_at = ?
       WHERE id = ?`,
      [title, description, requirements, starterCode, testCasesJson, dueDate, status, phase2Unlocked, now, id]
    );

    if (data.phase2_unlocked !== undefined || data.phase2Unlocked !== undefined) {
      try {
        dbRun(
          `UPDATE assignments SET phase2_unlocked = ?, updated_at = ? WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))`,
          [phase2Unlocked, now, title]
        );
        if (phase2Unlocked === 1) {
          dbRun(
            `DELETE FROM phase2_challenges 
             WHERE assignment_id IN (SELECT id FROM assignments WHERE id = ? OR LOWER(TRIM(title)) = LOWER(TRIM(?)))
               AND status IN ('FAILED', 'EXPIRED', 'SECURITY_TERMINATED')`,
            [id, title]
          );
          dbRun(
            `UPDATE student_attempts
             SET state = 'MUTATION_READY', mutation_status = 'MUTATION_READY', failure_reason = NULL, updated_at = ?
             WHERE assignment_id IN (SELECT id FROM assignments WHERE id = ? OR LOWER(TRIM(title)) = LOWER(TRIM(?)))
               AND state IN ('MUTATION_PROCESSING_FAILED', 'PHASE1_SUBMITTED', 'PHASE2_FAILED', 'PHASE2_EXPIRED', 'SECURITY_TERMINATED')`,
            [now, id, title]
          );
        }
      } catch {
        // ignore
      }
    }

    return this.getAssignmentById(id);
  }

  async deleteAssignment(id: string): Promise<boolean> {
    try {
      dbRun(`DELETE FROM phase2_evaluations WHERE assignment_id = ?`, [id]);
      dbRun(`DELETE FROM phase2_challenges WHERE assignment_id = ?`, [id]);
      dbRun(
        `DELETE FROM attempt_mutations WHERE attempt_id IN (SELECT id FROM student_attempts WHERE assignment_id = ?)`,
        [id]
      );
      dbRun(
        `DELETE FROM proctoring_events WHERE attempt_id IN (SELECT id FROM student_attempts WHERE assignment_id = ?)`,
        [id]
      );
      dbRun(
        `DELETE FROM security_events WHERE attempt_id IN (SELECT id FROM student_attempts WHERE assignment_id = ?)`,
        [id]
      );
      dbRun(`DELETE FROM student_attempts WHERE assignment_id = ?`, [id]);
    } catch (err) {
      console.warn('Cleanup warning while deleting assignment:', err);
    }
    const res = dbRun(`DELETE FROM assignments WHERE id = ?`, [id]);
    return res.changes > 0;
  }

  async getDashboardStats(user: { userId: string; role: UserRole }): Promise<DashboardStatsEntity> {
    if (user.role === 'faculty' || user.role === 'admin') {
      const totalAssignments = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM assignments')?.count ?? 0;
      const totalStudents =
        dbGet<{ count: number }>(
          "SELECT COUNT(*) as count FROM (SELECT id FROM profiles WHERE role = 'student' UNION SELECT id FROM users WHERE role = 'student')"
        )?.count ?? 0;
      const totalSubmissions = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM student_attempts')?.count ?? 0;
      const completedAttempts =
        dbGet<{ count: number }>(
          "SELECT COUNT(*) as count FROM student_attempts WHERE state IN ('PASSED', 'PHASE2_PASSED')"
        )?.count ?? 0;

      return {
        totalAssignments,
        totalStudents,
        totalSubmissions,
        completedAttempts,
      };
    } else {
      const activeAssignments = dbGet<{ count: number }>("SELECT COUNT(*) as count FROM assignments WHERE status = 'active'")?.count ?? 0;
      const myAttempts = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM student_attempts WHERE student_id = ?', [user.userId])?.count ?? 0;
      const passedAttempts = dbGet<{ count: number }>("SELECT COUNT(*) as count FROM student_attempts WHERE student_id = ? AND state IN ('PASSED', 'PHASE2_PASSED')", [user.userId])?.count ?? 0;

      return {
        activeAssignments,
        myAttempts,
        passedAttempts,
      };
    }
  }

  async getAttemptById(id: string): Promise<StudentAttemptEntity | null> {
    return dbGet<StudentAttemptEntity>(`SELECT * FROM student_attempts WHERE id = ?`, [id]);
  }

  async getAttemptByStudentAndAssignment(studentId: string, assignmentId: string): Promise<StudentAttemptEntity | null> {
    return dbGet<StudentAttemptEntity>(
      `SELECT * FROM student_attempts WHERE student_id = ? AND assignment_id = ?`,
      [studentId, assignmentId]
    );
  }

  async createAttempt(data: Partial<StudentAttemptEntity> & { id: string; assignment_id: string; student_id: string; state: string }): Promise<StudentAttemptEntity> {
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO student_attempts (
        id, assignment_id, student_id, state, language, original_code, 
        mutated_code, mutation_type, mutation_metadata_json, repaired_code,
        phase2_start_time, phase2_deadline, evaluation_result_json, failure_reason,
        original_code_hash, mutated_code_hash, mutation_seed, mutation_status,
        submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.assignment_id,
        data.student_id,
        data.state || 'CREATED',
        data.language || 'python',
        data.original_code || null,
        data.mutated_code || null,
        data.mutation_type || null,
        data.mutation_metadata_json || null,
        data.repaired_code || null,
        data.phase2_start_time || null,
        data.phase2_deadline || null,
        data.evaluation_result_json || null,
        data.failure_reason || null,
        data.original_code_hash || null,
        data.mutated_code_hash || null,
        data.mutation_seed || null,
        data.mutation_status || null,
        data.submitted_at || null,
        now,
        now,
      ]
    );
    return (await this.getAttemptById(data.id))!;
  }

  async updateAttempt(id: string, updates: Partial<StudentAttemptEntity>): Promise<StudentAttemptEntity | null> {
    const existing = await this.getAttemptById(id);
    if (!existing) return null;
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    const allowedCols: (keyof StudentAttemptEntity)[] = [
      'state', 'language', 'original_code', 'mutated_code', 'mutation_type',
      'mutation_metadata_json', 'repaired_code', 'phase2_start_time', 'phase2_deadline',
      'evaluation_result_json', 'failure_reason', 'original_code_hash', 'mutated_code_hash',
      'mutation_seed', 'mutation_status', 'submitted_at'
    ];

    for (const col of allowedCols) {
      if (updates[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(updates[col]);
      }
    }

    fields.push(`updated_at = ?`);
    values.push(now);
    values.push(id);

    dbRun(`UPDATE student_attempts SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getAttemptById(id);
  }

  async getSubmissions(filter?: { assignmentId?: string; studentId?: string; facultyId?: string }): Promise<any[]> {
    let sql = `
      SELECT 
        sa.*,
        COALESCE(p.full_name, u.name) as student_name,
        COALESCE(p.email, u.email) as student_email,
        COALESCE(p.roll_number, u.roll_number) as student_roll_number,
        COALESCE(p.class_id, u.class_id) as student_class_id,
        COALESCE(p.division_id, u.division_id) as student_division_id,
        a.title as assignment_title,
        a.language as assignment_language,
        a.created_by as assignment_faculty_id,
        p2c.status as phase2_challenge_status,
        p2c.started_at as phase2_challenge_started_at,
        p2c.deadline_at as phase2_challenge_deadline_at,
        p2c.submitted_at as phase2_challenge_submitted_at,
        p2c.final_code as phase2_challenge_final_code,
        p2e.status as evaluation_status,
        p2e.tests_total as evaluation_tests_total,
        p2e.tests_passed as evaluation_tests_passed,
        p2e.tests_failed as evaluation_tests_failed,
        p2e.failure_reason as evaluation_failure_reason
      FROM student_attempts sa
      LEFT JOIN profiles p ON sa.student_id = p.id
      LEFT JOIN users u ON sa.student_id = u.id
      LEFT JOIN assignments a ON sa.assignment_id = a.id
      LEFT JOIN phase2_challenges p2c ON p2c.attempt_id = sa.id
      LEFT JOIN phase2_evaluations p2e ON p2e.attempt_id = sa.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.assignmentId) {
      sql += ` AND sa.assignment_id = ?`;
      params.push(filter.assignmentId);
    }
    if (filter?.studentId) {
      sql += ` AND sa.student_id = ?`;
      params.push(filter.studentId);
    }

    sql += ` ORDER BY COALESCE(p2c.submitted_at, sa.submitted_at, sa.updated_at, sa.created_at) DESC`;

    const rows = dbQuery<any>(sql, params);
    return rows.map((r) => {
      const rawEvents = dbQuery<any>(
        `SELECT * FROM security_events WHERE attempt_id = ? ORDER BY server_timestamp DESC, created_at DESC`,
        [r.id]
      );
      const securityEvents = rawEvents.map((e) => {
        let meta: any = {};
        try {
          meta = typeof e.metadata_json === 'string' ? JSON.parse(e.metadata_json) : (e.metadata_json || {});
        } catch {
          meta = {};
        }
        return {
          id: e.id,
          attemptId: e.attempt_id,
          challengeId: e.challenge_id,
          eventType: e.event_type,
          severity: e.severity,
          phase: e.phase || 'PHASE2',
          metadata: meta,
          reason: meta.reason || null,
          clientTimestamp: e.client_timestamp,
          serverTimestamp: e.server_timestamp,
          createdAt: e.created_at || e.server_timestamp,
        };
      });

      const fallbackSecurityReason =
        securityEvents.find((ev) => ev.reason)?.reason ||
        (r.state === 'SECURITY_TERMINATED' || r.phase2_challenge_status === 'SECURITY_TERMINATED'
          ? 'Exam Cancelled: Student pressed Back, minimized window, or closed browser tab'
          : null);

      return {
        id: r.id,
        assignmentId: r.assignment_id,
        assignmentTitle: r.assignment_title || 'Untitled Assignment',
        assignmentLanguage: r.assignment_language || r.language || 'python',
        studentId: r.student_id,
        studentName: r.student_name || 'Student',
        studentEmail: r.student_email || '',
        studentRollNumber: r.student_roll_number || null,
        studentClassId: r.student_class_id || null,
        studentDivisionId: r.student_division_id || null,
        state: r.state,
        language: r.language,
        originalCode: r.original_code,
        mutatedCode: r.mutated_code,
        repairedCode: r.repaired_code || r.phase2_challenge_final_code,
        submittedCode: r.repaired_code || r.phase2_challenge_final_code || r.original_code,
        mutationType: r.mutation_type,
        mutationMetadataJson: r.mutation_metadata_json,
        failureReason: r.failure_reason || r.evaluation_failure_reason || fallbackSecurityReason,
        submittedAt: r.phase2_challenge_submitted_at || r.submitted_at || r.updated_at || r.created_at,
        createdAt: r.created_at,
        phase2Status: r.phase2_challenge_status,
        securityEvents,
        challenge: {
          mutationType: r.mutation_type,
          mutatedCode: r.mutated_code,
          repairedCode: r.repaired_code || r.phase2_challenge_final_code,
        },
        evaluation: r.evaluation_status
          ? {
              status: r.evaluation_status,
              testsTotal: r.evaluation_tests_total,
              testsPassed: r.evaluation_tests_passed,
              testsFailed: r.evaluation_tests_failed,
              failureReason: r.evaluation_failure_reason,
            }
          : null,
      };
    });
  }

  async getEnrolledStudents(_facultyId?: string): Promise<any[]> {
    const sql = `
      WITH combined_students AS (
        SELECT
          p.id,
          COALESCE(p.full_name, u.name) as name,
          COALESCE(p.email, u.email) as email,
          COALESCE(p.institution_id, u.institution) as institution,
          COALESCE(p.roll_number, u.roll_number) as roll_number,
          COALESCE(p.class_id, u.class_id) as class_id,
          COALESCE(p.division_id, u.division_id) as division_id,
          COALESCE(p.created_at, u.created_at) as created_at,
          COALESCE(p.updated_at, u.updated_at, p.created_at, u.created_at) as last_login_at
        FROM profiles p
        LEFT JOIN users u ON u.id = p.id
        WHERE p.role = 'student'
        UNION
        SELECT
          u.id,
          u.name,
          u.email,
          u.institution,
          u.roll_number,
          u.class_id,
          u.division_id,
          u.created_at,
          COALESCE(u.updated_at, u.created_at) as last_login_at
        FROM users u
        WHERE u.role = 'student' AND u.id NOT IN (SELECT id FROM profiles)
      )
      SELECT 
        cs.*,
        COUNT(sa.id) as attempts_count,
        SUM(CASE WHEN sa.state = 'PHASE2_PASSED' OR sa.state = 'PASSED' THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN sa.state = 'SECURITY_TERMINATED' THEN 1 ELSE 0 END) as terminated_count,
        (
          SELECT sa2.failure_reason
          FROM student_attempts sa2
          WHERE sa2.student_id = cs.id AND sa2.state = 'SECURITY_TERMINATED'
          ORDER BY sa2.updated_at DESC, sa2.created_at DESC
          LIMIT 1
        ) as latest_failure_reason
      FROM combined_students cs
      LEFT JOIN student_attempts sa ON sa.student_id = cs.id
      GROUP BY cs.id
      ORDER BY cs.last_login_at DESC, cs.name ASC
    `;
    const rows = dbQuery<any>(sql);
    const activeAssignments = dbQuery<any>(
      `SELECT id, title, COALESCE(NULLIF(TRIM(due_date), ''), '2026-10-20') as due_date
       FROM assignments
       WHERE LOWER(status) IN ('active', 'published', 'open')
       ORDER BY created_at DESC`
    );
    const allAttempts = dbQuery<any>(
      `SELECT student_id, assignment_id, state, submitted_at FROM student_attempts`
    );
    const submittedByStudent = new Map<string, Set<string>>();
    for (const att of allAttempts) {
      if (att.submitted_at || (att.state && att.state !== 'CREATED')) {
        if (!submittedByStudent.has(att.student_id)) {
          submittedByStudent.set(att.student_id, new Set());
        }
        submittedByStudent.get(att.student_id)!.add(att.assignment_id);
      }
    }

    return rows.map((r) => {
      const terminatedCount = Number(r.terminated_count || 0);
      const passedCount = Number(r.passed_count || 0);
      const studentSubmittedSet = submittedByStudent.get(r.id) || new Set<string>();
      const missingAssignments = activeAssignments
        .filter((asg) => !studentSubmittedSet.has(asg.id))
        .map((asg) => ({
          id: asg.id,
          title: asg.title,
          dueDate: asg.due_date,
          isDeadlinePassed: isDeadlinePassed(asg.due_date),
        }));
      const notSubmittedCount = missingAssignments.length;
      const missedDeadlineCount = missingAssignments.filter((m) => m.isDeadlinePassed).length;

      return {
        id: r.id,
        name: r.name,
        email: r.email,
        institution: r.institution,
        rollNumber: r.roll_number,
        classId: r.class_id,
        divisionId: r.division_id,
        createdAt: r.created_at,
        lastLoginAt: r.last_login_at || r.created_at,
        attemptsCount: Number(r.attempts_count || 0),
        passedCount,
        terminatedCount,
        notSubmittedCount,
        missedDeadlineCount,
        missingAssignments,
        latestFailureReason: r.latest_failure_reason || null,
        status: terminatedCount > 0 ? 'SECURITY_TERMINATED' : passedCount > 0 ? 'PASSED' : 'ACTIVE',
      };
    });
  }

  async createAttemptMutation(data: AttemptMutationEntity): Promise<AttemptMutationEntity> {
    dbRun(
      `INSERT INTO attempt_mutations (
        id, attempt_id, mutation_type, mutation_version, mutation_seed,
        original_code_hash, mutated_code, mutated_code_hash, mutation_metadata_json,
        status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.attempt_id,
        data.mutation_type,
        data.mutation_version || '1.0.0',
        data.mutation_seed || null,
        data.original_code_hash,
        data.mutated_code || null,
        data.mutated_code_hash || null,
        data.mutation_metadata_json || null,
        data.status,
        data.error_message || null,
        data.created_at || new Date().toISOString(),
      ]
    );
    return data;
  }

  async getAttemptMutation(attemptId: string): Promise<AttemptMutationEntity | null> {
    return dbGet<AttemptMutationEntity>(
      `SELECT * FROM attempt_mutations WHERE attempt_id = ? ORDER BY created_at DESC LIMIT 1`,
      [attemptId]
    );
  }

  async getMutationTypes(): Promise<MutationRegistryEntity[]> {
    return dbQuery<MutationRegistryEntity>(`SELECT * FROM mutation_registry WHERE is_active = 1`);
  }

  async toggleMutationType(code: string): Promise<MutationRegistryEntity | null> {
    const existing = dbGet<MutationRegistryEntity>(`SELECT * FROM mutation_registry WHERE code = ?`, [code]);
    if (!existing) return null;
    const currentActive = existing.is_active === 1 || existing.is_active === true;
    const newActive = currentActive ? 0 : 1;
    dbRun(`UPDATE mutation_registry SET is_active = ? WHERE code = ?`, [newActive, code]);
    saveDatabaseToDisk();
    return dbGet<MutationRegistryEntity>(`SELECT * FROM mutation_registry WHERE code = ?`, [code]);
  }

  async getPhase2ChallengeById(id: string): Promise<Phase2ChallengeEntity | null> {
    return dbGet<Phase2ChallengeEntity>(`SELECT * FROM phase2_challenges WHERE id = ?`, [id]);
  }

  async getPhase2ChallengeByAttempt(attemptId: string): Promise<Phase2ChallengeEntity | null> {
    return dbGet<Phase2ChallengeEntity>(
      `SELECT * FROM phase2_challenges WHERE attempt_id = ? ORDER BY created_at DESC LIMIT 1`,
      [attemptId]
    );
  }

  async createPhase2Challenge(data: Omit<Phase2ChallengeEntity, 'created_at' | 'updated_at'>): Promise<Phase2ChallengeEntity> {
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO phase2_challenges (
        id, assignment_id, student_id, attempt_id, mutation_id, status,
        started_at, deadline_at, submitted_at, final_code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.assignment_id,
        data.student_id,
        data.attempt_id,
        data.mutation_id || null,
        data.status || 'ACTIVE',
        data.started_at,
        data.deadline_at,
        data.submitted_at || null,
        data.final_code || null,
        now,
        now,
      ]
    );
    return (await this.getPhase2ChallengeById(data.id))!;
  }

  async updatePhase2Challenge(id: string, updates: Partial<Phase2ChallengeEntity>): Promise<Phase2ChallengeEntity | null> {
    const existing = await this.getPhase2ChallengeById(id);
    if (!existing) return null;
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];
    const allowed: (keyof Phase2ChallengeEntity)[] = ['status', 'submitted_at', 'final_code'];

    for (const col of allowed) {
      if (updates[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(updates[col]);
      }
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    dbRun(`UPDATE phase2_challenges SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getPhase2ChallengeById(id);
  }

  async createPhase2Evaluation(data: Omit<Phase2EvaluationEntity, 'created_at'>): Promise<Phase2EvaluationEntity> {
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO phase2_evaluations (
        id, challenge_id, attempt_id, assignment_id, student_id, submitted_code_hash,
        status, tests_total, tests_passed, tests_failed, failure_reason,
        execution_metadata_json, started_at, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.challenge_id,
        data.attempt_id,
        data.assignment_id,
        data.student_id,
        data.submitted_code_hash,
        data.status,
        data.tests_total,
        data.tests_passed,
        data.tests_failed,
        data.failure_reason || null,
        data.execution_metadata_json || '{}',
        data.started_at,
        data.completed_at || null,
        now,
      ]
    );
    return { ...data, created_at: now };
  }

  async getEvaluationsForAttempt(attemptId: string): Promise<Phase2EvaluationEntity[]> {
    return dbQuery<Phase2EvaluationEntity>(
      `SELECT * FROM phase2_evaluations WHERE attempt_id = ? ORDER BY created_at DESC`,
      [attemptId]
    );
  }

  async getPhase2EvaluationByChallenge(challengeId: string): Promise<Phase2EvaluationEntity | null> {
    const res = dbGet<Phase2EvaluationEntity>(
      `SELECT * FROM phase2_evaluations WHERE challenge_id = ? ORDER BY created_at DESC LIMIT 1`,
      [challengeId]
    );
    return res || null;
  }

  async recordSecurityEvent(event: Omit<SecurityEventEntity, 'created_at'>): Promise<SecurityEventEntity> {
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO security_events (
        id, attempt_id, challenge_id, student_id, assignment_id, event_type,
        severity, phase, metadata_json, client_timestamp, server_timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.attempt_id,
        event.challenge_id || null,
        event.student_id || null,
        event.assignment_id || null,
        event.event_type,
        event.severity,
        event.phase,
        event.metadata_json || '{}',
        event.client_timestamp || null,
        event.server_timestamp || now,
        now,
      ]
    );
    return { ...event, created_at: now };
  }

  async getSecurityEventsForAttempt(attemptId: string): Promise<SecurityEventEntity[]> {
    return dbQuery<SecurityEventEntity>(
      `SELECT * FROM security_events WHERE attempt_id = ? ORDER BY created_at ASC`,
      [attemptId]
    );
  }

  async getFacultyDivisionSession(
    institution: string,
    classId: string,
    divisionId: string
  ): Promise<FacultyDivisionSessionEntity | null> {
    const s = dbGetFacultyDivisionSession(institution, classId, divisionId);
    return s ? (s as FacultyDivisionSessionEntity) : null;
  }

  async upsertFacultyDivisionSession(session: FacultyDivisionSessionEntity): Promise<FacultyDivisionSessionEntity> {
    dbRun(
      `INSERT OR REPLACE INTO faculty_division_sessions (
        id, faculty_id, faculty_name, faculty_email, institution, class_id, division_id,
        last_heartbeat, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.faculty_id,
        session.faculty_name,
        session.faculty_email,
        session.institution,
        session.class_id,
        session.division_id,
        session.last_heartbeat,
        session.expires_at,
        session.created_at,
      ]
    );
    return session;
  }

  async deleteFacultyDivisionSession(id: string): Promise<boolean> {
    const res = dbRun(`DELETE FROM faculty_division_sessions WHERE id = ?`, [id]);
    return res.changes > 0;
  }

  async claimFacultyDivisionSession(params: {
    facultyId: string;
    facultyName: string;
    facultyEmail: string;
    institution: string;
    classId: string;
    divisionId: string;
  }): Promise<{ success: boolean; session?: FacultyDivisionSessionEntity; occupiedBy?: any; error?: string }> {
    const res = dbClaimFacultyDivisionSession(params);
    return res as { success: boolean; session?: FacultyDivisionSessionEntity; occupiedBy?: any; error?: string };
  }

  async heartbeatFacultyDivisionSession(
    facultyId: string,
    institution: string,
    classId: string,
    divisionId: string
  ): Promise<{ success: boolean; session?: FacultyDivisionSessionEntity; error?: string }> {
    const res = dbHeartbeatFacultyDivisionSession(facultyId, institution, classId, divisionId);
    return res as { success: boolean; session?: FacultyDivisionSessionEntity; error?: string };
  }

  async releaseFacultyDivisionSession(facultyId: string): Promise<{ success: boolean }> {
    return dbReleaseFacultyDivisionSession(facultyId);
  }

  async recordProctoringEvent(event: Omit<ProctoringEventEntity, 'created_at'>): Promise<ProctoringEventEntity> {
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO proctoring_events (id, attempt_id, event_type, severity, details_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [event.id, event.attempt_id, event.event_type, event.severity, event.details_json, now]
    );
    return { ...event, created_at: now };
  }

  async getProctoringEventsForAttempt(attemptId: string): Promise<ProctoringEventEntity[]> {
    return dbQuery<ProctoringEventEntity>(
      `SELECT * FROM proctoring_events WHERE attempt_id = ? ORDER BY created_at ASC`,
      [attemptId]
    );
  }
}
