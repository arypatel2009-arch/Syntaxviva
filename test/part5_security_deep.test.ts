import assert from 'assert';
import http from 'http';
import express from 'express';
import { getDatabase, dbGet, dbRun, saveDatabaseToDisk } from '../server/db/database.js';
import { getRepository } from '../server/repository/index.js';
import { generateToken } from '../server/auth/jwt.js';
import { studentRouter } from '../server/routes/student.js';
import { assignmentsRouter } from '../server/routes/assignments.js';

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

async function runSecurityDeepSuite() {
  console.log('=== [SyntaXViva] PART 5 EXTENDED SECURITY VERIFICATION SUITE ===\n');

  process.env.NODE_ENV = 'test';
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyTestMockKeyForVerificationSuite';
  const db = await getDatabase();
  assert(db, 'Database ready');

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
    const studentA = 'stu_sec_test_a_' + Math.random().toString(36).substring(2, 7);
    const tokenA = generateToken({
      userId: studentA,
      name: 'Security Test Student A',
      email: `${studentA}@university.edu`,
      role: 'student',
    });
    const authA = { Authorization: `Bearer ${tokenA}` };

    const studentB = 'stu_sec_test_b_' + Math.random().toString(36).substring(2, 7);
    const tokenB = generateToken({
      userId: studentB,
      name: 'Security Test Student B',
      email: `${studentB}@university.edu`,
      role: 'student',
    });
    const authB = { Authorization: `Bearer ${tokenB}` };

    const studentC = 'stu_sec_test_c_' + Math.random().toString(36).substring(2, 7);
    const tokenC = generateToken({
      userId: studentC,
      name: 'Security Test Student C',
      email: `${studentC}@university.edu`,
      role: 'student',
    });
    const authC = { Authorization: `Bearer ${tokenC}` };

    const repo = getRepository();
    await repo.upsertProfile({
      id: studentA,
      email: `${studentA}@university.edu`,
      full_name: 'Security Test Student A',
      role: 'student',
      institution_id: 'inst_test',
      roll_number: 'R_A_' + Math.random().toString(36).slice(2, 6),
      class_id: 'CS101',
      division_id: 'A',
    });
    await repo.upsertProfile({
      id: studentB,
      email: `${studentB}@university.edu`,
      full_name: 'Security Test Student B',
      role: 'student',
      institution_id: 'inst_test',
      roll_number: 'R_B_' + Math.random().toString(36).slice(2, 6),
      class_id: 'CS101',
      division_id: 'A',
    });
    await repo.upsertProfile({
      id: studentC,
      email: `${studentC}@university.edu`,
      full_name: 'Security Test Student C',
      role: 'student',
      institution_id: 'inst_test',
      roll_number: 'R_C_' + Math.random().toString(36).slice(2, 6),
      class_id: 'CS101',
      division_id: 'A',
    });

    const assignmentId = `asg_sec_${Date.now()}`;
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO assignments (
         id, title, description, language, requirements, starter_code, test_cases_json,
         status, created_by, due_date, phase2_unlocked, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'faculty_demo', NULL, 1, ?, ?)`,
      [
        assignmentId,
        'Security Policy Assessment',
        'Demonstrates anti-tampering and strike policy.',
        'python',
        'Requirements',
        'print("hello")\n',
        JSON.stringify([{ input: '', expected: 'hello', description: 'Basic' }]),
        now,
        now,
      ]
    );
    saveDatabaseToDisk();

    const testCode = `a, b = map(int, input().split())
if a > b:
    print(a)
else:
    print(b)
`;

    // 1. Submit Phase 1 for Student A & Start Phase 2
    const p1A = await makeRequest('POST', `/api/student/assignments/${assignmentId}/phase1/submit`, authA, {
      code: testCode,
      language: 'python',
      requestedMutationType: 'CONDITIONAL_BRANCH_INVERSION',
    });
    assert.strictEqual(p1A.status, 201);
    const startA = await makeRequest('POST', `/api/student/assignments/${assignmentId}/phase2/start`, authA);
    assert.strictEqual(startA.status, 201);
    const challengeA = startA.body.challengeId;

    // 2. Test Three-Warning Policy for Face/Attention (Warning #1, #2, #3 continue; #4 terminates)
    console.log('Sub-test 1: Reporting Strike 1 (FACE_MOVEMENT_WARNING)...');
    const strike1 = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/events`,
      authA,
      { challengeId: challengeA, eventType: 'FACE_MOVEMENT_WARNING' }
    );
    assert.strictEqual(strike1.status, 200);
    assert.strictEqual(strike1.body.terminated, false);
    assert.strictEqual(strike1.body.warningCount, 1);
    console.log('  ✔ Strike 1 logged: Warning #1 recorded, challenge continues (1/3).');

    // Test Strike 2: Attention Deviation (WARNING #2)
    console.log('Sub-test 2: Reporting Strike 2 (ATTENTION_DEVIATION)...');
    const strike2 = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/events`,
      authA,
      { challengeId: challengeA, eventType: 'ATTENTION_DEVIATION' }
    );
    assert.strictEqual(strike2.status, 200);
    assert.strictEqual(strike2.body.terminated, false);
    assert.strictEqual(strike2.body.warningCount, 2);
    console.log('  ✔ Strike 2 logged: Warning #2 recorded, challenge continues (2/3).');

    // Test Strike 3: Significant Face Movement (WARNING #3)
    console.log('Sub-test 3: Reporting Strike 3 (SIGNIFICANT_FACE_MOVEMENT)...');
    const strike3 = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/events`,
      authA,
      { challengeId: challengeA, eventType: 'SIGNIFICANT_FACE_MOVEMENT' }
    );
    assert.strictEqual(strike3.status, 200);
    assert.strictEqual(strike3.body.terminated, false);
    assert.strictEqual(strike3.body.warningCount, 3);
    console.log('  ✔ Strike 3 logged: Warning #3 recorded, challenge continues (3/3).');

    // Check status endpoint: 3 warnings logged, still NOT terminated
    const statusMid = await makeRequest(
      'GET',
      `/api/student/assignments/${assignmentId}/phase2/security-status`,
      authA
    );
    assert.strictEqual(statusMid.status, 200);
    assert.strictEqual(statusMid.body.warningCount, 3);
    assert.strictEqual(statusMid.body.isTerminated, false);
    assert.strictEqual(statusMid.body.events.length, 3);
    console.log('  ✔ Security status confirms 3 warnings logged and session still active.');

    // 4. Test Strike 4: Next confirmed deviation -> TERMINATION & LOCK
    console.log('Sub-test 4: Reporting Strike 4 (FACE_MOVEMENT_WARNING -> FAIL & LOCK)...');
    const strike4 = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/events`,
      authA,
      { challengeId: challengeA, eventType: 'FACE_MOVEMENT_WARNING' }
    );
    assert.strictEqual(strike4.status, 200);
    assert.strictEqual(strike4.body.terminated, true);
    assert.strictEqual(strike4.body.warningCount, 4);
    console.log('  ✔ Strike 4 triggered automatic FAIL + TERMINATE + PERMANENT LOCK.');

    // Verify DB
    const chgRow = dbGet<any>('SELECT * FROM phase2_challenges WHERE id = ?', [challengeA]);
    assert.strictEqual(chgRow.status, 'SECURITY_TERMINATED');

    // 5. Test Pre-Start Protection on Student B (before starting challenge)
    console.log('Sub-test 5: Pre-start readiness protection (no violations before start)...');
    await makeRequest('POST', `/api/student/assignments/${assignmentId}/phase1/submit`, authB, {
      code: testCode,
      language: 'python',
      requestedMutationType: 'CONDITIONAL_BRANCH_INVERSION',
    });

    const preStartEvent = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/events`,
      authB,
      { eventType: 'MULTIPLE_FACES_DETECTED' }
    );
    assert.strictEqual(preStartEvent.status, 200);
    assert.strictEqual(preStartEvent.body.terminated, false);
    console.log('  ✔ Pre-start camera check event did not fail or lock attempt.');

    // 6. Test Immediate Strict Critical Violation on Student B once active
    console.log('Sub-test 6: Testing immediate strict critical violation (TAB_SWITCH)...');
    const startB = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/start`,
      authB,
      {}
    );
    assert.strictEqual(startB.status, 201);
    const challengeB = startB.body.challengeId;

    const criticalEvent = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/events`,
      authB,
      { challengeId: challengeB, eventType: 'TAB_SWITCH' }
    );
    assert.strictEqual(criticalEvent.status, 200);
    assert.strictEqual(criticalEvent.body.terminated, true);
    console.log('  ✔ TAB_SWITCH immediately triggered 1-strike CRITICAL termination.');

    // 7. Test Cross-Student Attempt Authorization
    console.log('Sub-test 7: Cross-student security event injection attempt...');
    const spoofRes = await makeRequest(
      'POST',
      `/api/student/phase2/${chgRow.attempt_id}/security-events`,
      authB, // Student B trying to post to Student A's attempt
      { eventType: 'DEVTOOLS_OPENED' }
    );
    assert.strictEqual(spoofRes.status, 403, 'Cross-student security event must return 403 Forbidden');
    console.log('  ✔ Cross-student unauthorized tampering blocked with 403 Forbidden.');

    // 8. Test Explicit Termination Endpoint for a new attempt
    console.log('Sub-test 8: Explicit termination endpoint...');
    await makeRequest('POST', `/api/student/assignments/${assignmentId}/phase1/submit`, authC, {
      code: testCode,
      language: 'python',
      requestedMutationType: 'CONDITIONAL_BRANCH_INVERSION',
    });
    const startC = await makeRequest('POST', `/api/student/assignments/${assignmentId}/phase2/start`, authC);
    assert.strictEqual(startC.status, 201);
    const challengeC = startC.body.challengeId;

    const termC = await makeRequest(
      'POST',
      `/api/student/assignments/${assignmentId}/phase2/terminate`,
      authC,
      { challengeId: challengeC, reason: 'Candidate left proctoring boundary' }
    );
    assert.strictEqual(termC.status, 200);
    assert.strictEqual(termC.body.terminated, true);

    const chgCRow = dbGet<any>('SELECT * FROM phase2_challenges WHERE id = ?', [challengeC]);
    assert.strictEqual(chgCRow.status, 'SECURITY_TERMINATED');
    console.log('  ✔ Explicit termination endpoint properly locks challenge.\n');

    console.log('===========================================================');
    console.log('🎉 ALL PART 5 EXTENDED SECURITY TESTS PASSED!');
    console.log('===========================================================\n');
  } finally {
    await close();
  }
}

runSecurityDeepSuite().catch((err) => {
  console.error('❌ EXTENDED SECURITY TESTS FAILED:', err);
  process.exit(1);
});
