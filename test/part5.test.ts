/**
 * PART 5 AUTOMATED VERIFICATION SUITE
 * Strict Security + Deterministic Bug Verification
 *
 * Verifies:
 * 1. Unchanged mutated code fails deterministic evaluation and permanently locks attempt.
 * 2. Correct bug fix passes deterministic evaluation and permanently locks attempt as PASSED.
 * 3. Incorrect fix fails deterministic evaluation and locks attempt as FAILED.
 * 4. Critical security events (phone detected, camera disconnect) trigger immediate termination (SECURITY_TERMINATED).
 * 5. Terminated attempts reject any further submission attempts (403).
 * 6. Hidden test cases are completely masked and never exposed to the student.
 * 7. Evaluation records are explicitly saved in phase2_evaluations (100% deterministic, non-AI).
 */

import assert from 'assert';
import http from 'http';
import express from 'express';
import { getDatabase, dbGet, dbQuery, dbRun, saveDatabaseToDisk } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';
import { generateToken } from '../server/auth/jwt.ts';
import { studentRouter } from '../server/routes/student.ts';
import { assignmentsRouter } from '../server/routes/assignments.ts';

async function startTestServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/student', studentRouter);
  app.use('/api/assignments', assignmentsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function runPart5VerificationSuite() {
  console.log('=== [SyntaXViva] PART 5 AUTOMATED VERIFICATION SUITE ===');
  console.log('Strict Security + Deterministic Bug Verification\n');

  process.env.NODE_ENV = 'test';
  // Step 0: Ensure DB is initialized
  const db = await getDatabase();
  assert(db, 'Database must be ready');

  const { baseUrl, close } = await startTestServer();

  async function makeRequest(
    method: 'GET' | 'POST',
    path: string,
    headers: Record<string, string> = {},
    body?: any
  ): Promise<{ status: number; body: any }> {
    const opts: RequestInit = {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    };
    if (body) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, opts);
    const data = await res.json().catch(() => null);
    return { status: res.status, body: data };
  }

  try {
    const repo = getRepository();
    const studentId = 'stu_test_part5_' + Math.random().toString(36).substring(2, 7);
    await repo.upsertProfile({
      id: studentId,
      email: `${studentId}@university.edu`,
      full_name: 'Test Student 1',
      role: 'student',
      institution_id: 'inst_test',
      roll_number: 'R_P5_1_' + Math.random().toString(36).slice(2, 6),
      class_id: 'CS101',
      division_id: 'A',
    });
    const studentToken = generateToken({
      userId: studentId,
      name: 'Test Student 1',
      email: `${studentId}@university.edu`,
      role: 'student',
    });
    const authHeader = { Authorization: `Bearer ${studentToken}` };

    // Setup test assignment with public and hidden test cases
    const assignmentId = `asg_part5_${Date.now()}`;
    const now = new Date().toISOString();
    const testCases = [
      { input: '5 10\n', expected: '10', description: 'Second is greater', is_hidden: false },
      { input: '20 7\n', expected: '20', description: 'First is greater', is_hidden: false },
      { input: '15 15\n', expected: '15', description: 'Equal numbers', is_hidden: false },
      { input: '-4 -10\n', expected: '-4', description: 'Negative numbers', is_hidden: true },
      { input: '0 0\n', expected: '0', description: 'Zeros', is_hidden: true },
    ];

    dbRun(
      `INSERT INTO assignments (
         id, title, description, language, requirements, starter_code, test_cases_json,
         status, created_by, due_date, phase2_unlocked, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'faculty_demo', NULL, 1, ?, ?)`,
      [
        assignmentId,
        'Part 5 Find Maximum',
        'Read two numbers from stdin and output the larger one.',
        'python',
        'Must handle all integers.',
        'a, b = map(int, input().split())\n',
        JSON.stringify(testCases),
        now,
        now,
      ]
    );
    saveDatabaseToDisk();

    // -------------------------------------------------------------
    // Test 1: Verify Hidden Test Cases are Masked for Students
    // -------------------------------------------------------------
    console.log('Test 1: Verifying hidden test cases are masked for student role...');
    const asgRes = await makeRequest('GET', `/api/assignments/${assignmentId}`, authHeader);
    assert.strictEqual(asgRes.status, 200);
    const returnedTests = JSON.parse(asgRes.body.assignment.testCasesJson);
    assert.strictEqual(returnedTests.length, 3, 'Only 3 public tests should be returned to student');
    assert(returnedTests.every((t: any) => !t.is_hidden && !t.isHidden), 'No hidden tests returned');
    console.log('  ✔ Hidden test cases are completely masked from student endpoints.\n');

    // -------------------------------------------------------------
    // Test 2: Unchanged Mutated Code Submission -> Deterministic FAIL
    // -------------------------------------------------------------
    console.log('Test 2: Submitting unchanged mutated code...');

    const originalCode = `a, b = map(int, input().split())
if a > b:
    print(a)
else:
    print(b)
`;

    // Submit Phase 1 with an observable mutation bug (CONDITIONAL_BRANCH_INVERSION)
    const p1Res = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase1/submit`,
      authHeader,
      {
        code: originalCode,
        language: 'python',
        requestedMutationType: 'CONDITIONAL_BRANCH_INVERSION',
      }
    );
    assert.strictEqual(p1Res.status, 201);
    assert.strictEqual(p1Res.body.mutation.status, 'MUTATION_READY');

    // Start Phase 2 challenge
    const startRes = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/start`,
      authHeader
    );
    assert(startRes.status === 200 || startRes.status === 201);
    const challenge1Id = startRes.body.challengeId;
    const mutatedCode = startRes.body.mutatedCode;
    assert(mutatedCode, 'Mutated code must exist');
    assert.notStrictEqual(mutatedCode, originalCode, 'Mutated code must differ');

    // Submit UNCHANGED mutated code
    const submitMutatedRes = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/submit`,
      authHeader,
      {
        challengeId: challenge1Id,
        finalCode: mutatedCode, // submitting without fixing the bug
      }
    );

    assert.strictEqual(submitMutatedRes.status, 200);
    assert.strictEqual(submitMutatedRes.body.success, false, 'Unchanged mutated code must NOT succeed');
    assert.strictEqual(submitMutatedRes.body.evaluationStatus, 'FAILED', 'Evaluation must be FAILED');
    assert(submitMutatedRes.body.testsFailed > 0, 'One or more tests must fail');
    console.log(`  ✔ Unchanged code evaluated: FAILED (${submitMutatedRes.body.testsFailed} tests failed)`);

    // Verify challenge record updated to FAILED
    const chg1 = dbGet<any>('SELECT * FROM phase2_challenges WHERE id = ?', [challenge1Id]);
    assert.strictEqual(chg1.status, 'FAILED', 'Challenge status must be FAILED');

    // Verify attempt is locked in PHASE2_FAILED
    const att1 = dbGet<any>('SELECT * FROM student_attempts WHERE id = ?', [chg1.attempt_id]);
    assert.strictEqual(att1.state, 'PHASE2_FAILED', 'Attempt state must be PHASE2_FAILED');

    // Verify second submission is rejected (attempt locked)
    const retrySubmitRes = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/submit`,
      authHeader,
      { challengeId: challenge1Id, finalCode: originalCode }
    );
    assert.strictEqual(retrySubmitRes.status, 400, 'Resubmission after FAILED must be rejected');
    console.log('  ✔ Attempt permanently locked after evaluation failure.\n');

    // -------------------------------------------------------------
    // Test 3: Incorrect Fix Submission -> Deterministic FAIL
    // -------------------------------------------------------------
    console.log('Test 3: Submitting incorrect fix with broken logic...');
    const studentIncorrectId = 'stu_test_p5_inc_' + Math.random().toString(36).substring(2, 7);
    await repo.upsertProfile({
      id: studentIncorrectId,
      email: `${studentIncorrectId}@university.edu`,
      full_name: 'Test Student Inc',
      role: 'student',
      institution_id: 'inst_test',
      roll_number: 'R_P5_2_' + Math.random().toString(36).slice(2, 6),
      class_id: 'CS101',
      division_id: 'A',
    });
    const studentIncorrectToken = generateToken({
      userId: studentIncorrectId,
      name: 'Test Student Inc',
      email: `${studentIncorrectId}@university.edu`,
      role: 'student',
    });
    const authHeaderInc = { Authorization: `Bearer ${studentIncorrectToken}` };

    await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase1/submit`,
      authHeaderInc,
      { code: originalCode, language: 'python' }
    );

    const startResInc = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/start`,
      authHeaderInc
    );
    assert.strictEqual(startResInc.status, 201);
    const challengeIncId = startResInc.body.challengeId;

    // Submit broken logic (e.g. always prints 0)
    const brokenFix = `a, b = map(int, input().split())\nprint(0)\n`;
    const submitIncorrectRes = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/submit`,
      authHeaderInc,
      {
        challengeId: challengeIncId,
        finalCode: brokenFix,
      }
    );

    assert.strictEqual(submitIncorrectRes.status, 200);
    assert.strictEqual(submitIncorrectRes.body.success, false);
    assert.strictEqual(submitIncorrectRes.body.evaluationStatus, 'FAILED');
    assert(submitIncorrectRes.body.testsFailed > 0, 'Failed tests must be > 0');
    console.log(`  ✔ Incorrect fix evaluated: FAILED (${submitIncorrectRes.body.testsFailed} tests failed)`);

    const chgInc = dbGet<any>('SELECT * FROM phase2_challenges WHERE id = ?', [challengeIncId]);
    assert.strictEqual(chgInc.status, 'FAILED');

    // -------------------------------------------------------------
    // Test 4: Correct Bug Fix Submission -> Deterministic PASS
    // -------------------------------------------------------------
    console.log('Test 4: Submitting correct bug fix with a new student attempt...');
    const student2Id = 'stu_test_p5_success_' + Math.random().toString(36).substring(2, 7);
    await repo.upsertProfile({
      id: student2Id,
      email: `${student2Id}@university.edu`,
      full_name: 'Test Student 2',
      role: 'student',
      institution_id: 'inst_test',
      roll_number: 'R_P5_3_' + Math.random().toString(36).slice(2, 6),
      class_id: 'CS101',
      division_id: 'A',
    });
    const student2Token = generateToken({
      userId: student2Id,
      name: 'Test Student 2',
      email: `${student2Id}@university.edu`,
      role: 'student',
    });
    const authHeader2 = { Authorization: `Bearer ${student2Token}` };

    // Phase 1 submit
    const p1Res2 = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase1/submit`,
      authHeader2,
      { code: originalCode, language: 'python' }
    );
    assert.strictEqual(p1Res2.status, 201);

    // Phase 2 start
    const startRes2 = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/start`,
      authHeader2
    );
    assert.strictEqual(startRes2.status, 201);
    const challenge2Id = startRes2.body.challengeId;

    // Submit correctly repaired code
    const submitCorrectRes = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/submit`,
      authHeader2,
      {
        challengeId: challenge2Id,
        finalCode: originalCode, // correctly fixes bug
      }
    );

    assert.strictEqual(submitCorrectRes.status, 200);
    assert.strictEqual(submitCorrectRes.body.success, true, 'Correct fix must succeed');
    assert.strictEqual(submitCorrectRes.body.evaluationStatus, 'PASSED', 'Evaluation status must be PASSED');
    assert.strictEqual(submitCorrectRes.body.testsPassed, 5, 'All 5 tests (public + hidden) must pass');
    console.log(`  ✔ Correct fix passed all ${submitCorrectRes.body.testsPassed} deterministic tests.`);

    // Verify challenge marked PASSED
    const chg2 = dbGet<any>('SELECT * FROM phase2_challenges WHERE id = ?', [challenge2Id]);
    assert.strictEqual(chg2.status, 'PASSED');

    // Verify attempt state is PHASE2_PASSED
    const att2 = dbGet<any>('SELECT * FROM student_attempts WHERE id = ?', [chg2.attempt_id]);
    assert.strictEqual(att2.state, 'PHASE2_PASSED');

    // Verify evaluation record exists in phase2_evaluations
    const evalRecord = dbGet<any>(
      'SELECT * FROM phase2_evaluations WHERE challenge_id = ?',
      [challenge2Id]
    );
    assert(evalRecord, 'Evaluation record must exist in phase2_evaluations');
    assert.strictEqual(evalRecord.status, 'PASSED');
    assert.strictEqual(evalRecord.tests_total, 5);
    console.log('  ✔ Explicit non-AI evaluation record saved in phase2_evaluations table.\n');

    // -------------------------------------------------------------
    // Test 5: Critical Security Violation -> SECURITY_TERMINATED
    // -------------------------------------------------------------
    console.log('Test 5: Testing strict security violation enforcement...');
    const student3Id = 'stu_test_p5_sec_' + Math.random().toString(36).substring(2, 7);
    await repo.upsertProfile({
      id: student3Id,
      email: `${student3Id}@university.edu`,
      full_name: 'Test Student 3',
      role: 'student',
      institution_id: 'inst_test',
      roll_number: 'R_P5_4_' + Math.random().toString(36).slice(2, 6),
      class_id: 'CS101',
      division_id: 'A',
    });
    const student3Token = generateToken({
      userId: student3Id,
      name: 'Test Student 3',
      email: `${student3Id}@university.edu`,
      role: 'student',
    });
    const authHeader3 = { Authorization: `Bearer ${student3Token}` };

    // Phase 1 submit
    await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase1/submit`,
      authHeader3,
      { code: originalCode, language: 'python' }
    );

    // Phase 2 start
    const startRes3 = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/start`,
      authHeader3
    );
    assert.strictEqual(startRes3.status, 201);
    const challenge3Id = startRes3.body.challengeId;

    // Ingest CRITICAL security violation (e.g., PHONE_DETECTED or CAMERA_DISCONNECTED)
    const secEventRes = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/events`,
      authHeader3,
      {
        challengeId: challenge3Id,
        eventType: 'PHONE_DETECTED',
        severity: 'CRITICAL',
        metadata: { detectionConfidence: 0.94 },
        clientTimestamp: new Date().toISOString(),
      }
    );

    assert.strictEqual(secEventRes.status, 200);
    assert.strictEqual(secEventRes.body.terminated, true);
    console.log('  ✔ Critical security event triggered assessment termination.');

    // Verify database record
    const chg3 = dbGet<any>('SELECT * FROM phase2_challenges WHERE id = ?', [challenge3Id]);
    assert.strictEqual(chg3.status, 'SECURITY_TERMINATED');

    const att3 = dbGet<any>('SELECT * FROM student_attempts WHERE id = ?', [chg3.attempt_id]);
    assert.strictEqual(att3.state, 'SECURITY_TERMINATED');

    // Verify student cannot submit code after termination
    const postTermSubmitRes = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/submit`,
      authHeader3,
      { challengeId: challenge3Id, finalCode: originalCode }
    );
    assert.strictEqual(postTermSubmitRes.status, 403, 'Submission after termination must return 403');
    console.log('  ✔ Submission permanently blocked (403) after security termination.');

    // Verify Phase 2 status reports SECURITY_TERMINATED
    const statusRes = await makeRequest(
      'GET',
      `/api/student/assignments/${assignmentId}/phase2`,
      authHeader3
    );
    assert.strictEqual(statusRes.body.state, 'SECURITY_TERMINATED');
    assert.strictEqual(statusRes.body.terminated, true);
    console.log('  ✔ Student Phase 2 query properly reports SECURITY_TERMINATED state.\n');

    console.log('===========================================================');
    console.log('🎉 ALL PART 5 STRICT SECURITY & EVALUATION TESTS PASSED!');
    console.log('===========================================================\n');
  } finally {
    await close();
  }
}

runPart5VerificationSuite().catch((err) => {
  console.error('❌ PART 5 VERIFICATION FAILED:', err);
  process.exit(1);
});
