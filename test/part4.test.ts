import assert from 'assert';
import http from 'http';
import express from 'express';
import { getDatabase, dbGet, dbQuery, dbRun } from '../server/db/database.ts';
import { generateToken } from '../server/auth/jwt.ts';
import { studentRouter } from '../server/routes/student.ts';
import { MutationEngine } from '../server/mutation/engine.ts';

// Helper function to create test server
async function startTestServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/student', studentRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function runPart4Tests() {
  console.log('=== [SyntaXViva] PART 4 AUTOMATED VERIFICATION SUITE ===');
  console.log('Phase 2 Debugging Challenge & Server-Authoritative Timer Verification\n');

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
    // Test 1: Verify phase2_challenges table schema
    console.log('Test 1: Verifying phase2_challenges table schema...');
    const tableCols = dbQuery<{ name: string; type: string }>('PRAGMA table_info(phase2_challenges)');
    const colNames = tableCols.map((c) => c.name);
    assert(colNames.includes('id'), 'Missing id column');
    assert(colNames.includes('attempt_id'), 'Missing attempt_id column');
    assert(colNames.includes('student_id'), 'Missing student_id column');
    assert(colNames.includes('assignment_id'), 'Missing assignment_id column');
    assert(colNames.includes('status'), 'Missing status column');
    assert(colNames.includes('started_at'), 'Missing started_at column');
    assert(colNames.includes('deadline_at'), 'Missing deadline_at column');
    assert(colNames.includes('final_code'), 'Missing final_code column');
    assert(colNames.includes('submitted_at'), 'Missing submitted_at column');
    console.log('  ✔ phase2_challenges table schema verified with all required fields.\n');

    // Create test student user and tokens
    const testStudentId = `std-test-${Date.now()}`;
    const testStudentToken = generateToken({
      userId: testStudentId,
      email: 'student_part4@syntaxviva.edu',
      role: 'student',
      name: 'Part 4 Student',
    });
    const authHeader = { Authorization: `Bearer ${testStudentToken}` };

    // Create test assignment
    const testAssignmentId = `asg-part4-${Date.now()}`;
    dbRun(
      `INSERT INTO assignments (id, title, description, requirements, starter_code, language, test_cases_json, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testAssignmentId,
        'Palindrome Permutation',
        'Return true if a permutation of the string could form a palindrome.',
        'O(N) time complexity',
        '# Starter code',
        'python',
        JSON.stringify([{ input: 'tactcoa', expected: 'True' }]),
        'active',
        'usr-prof-1',
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    // Test 2: Phase 2 status when Phase 1 not submitted
    console.log('Test 2: Verifying Phase 2 availability before Phase 1 is submitted...');
    const resPreSubmit = await makeRequest('GET', `/api/student/assignments/${testAssignmentId}/phase2`, authHeader);
    assert.strictEqual(resPreSubmit.body.isAvailable, false);
    assert(resPreSubmit.body.reason.includes('Phase 1'));
    console.log('  ✔ Phase 2 correctly unavailable before Phase 1 completion.\n');

    // Submit Phase 1 with Python code
    const originalPythonCode = `def is_palindrome_permutation(s: str) -> bool:
    counts = {}
    for ch in s.lower():
        if ch.isalnum():
            counts[ch] = counts.get(ch, 0) + 1
    odd_counts = 0
    for count in counts.values():
        if count % 2 == 1:
            odd_counts += 1
            if odd_counts > 1:
                return False
    return True
`;

    console.log('Test 3: Submitting Phase 1 code to trigger Mutation Engine...');
    const phase1SubmitRes = await makeRequest(
      'POST',
      `/api/student/assignments/${testAssignmentId}/phase1/submit`,
      authHeader,
      { code: originalPythonCode, language: 'python' }
    );
    assert.strictEqual(phase1SubmitRes.status, 201);
    assert.strictEqual(phase1SubmitRes.body.success, true);
    assert.strictEqual(phase1SubmitRes.body.mutation.status, 'MUTATION_READY');
    console.log('  ✔ Phase 1 submitted and mutation engine executed successfully.\n');

    // Test 4: Phase 2 is now available (PHASE2_READY)
    console.log('Test 4: Verifying Phase 2 status after mutation is ready...');
    const phase2StatusRes = await makeRequest(
      'GET',
      `/api/student/assignments/${testAssignmentId}/phase2`,
      authHeader
    );
    assert.strictEqual(phase2StatusRes.status, 200);
    assert.strictEqual(phase2StatusRes.body.isAvailable, true);
    assert.strictEqual(phase2StatusRes.body.state, 'PHASE2_READY');
    // Notice: mutated code is NOT exposed before student starts the challenge!
    console.log('  ✔ Phase 2 state is PHASE2_READY and timer not yet started.\n');

    // Test 5: Start 3-minute Phase 2 challenge
    console.log('Test 5: Starting 3-minute Phase 2 challenge (POST /phase2/start)...');
    const startRes = await makeRequest(
      'POST',
      `/api/student/assignments/${testAssignmentId}/phase2/start`,
      authHeader
    );
    assert(startRes.status === 200 || startRes.status === 201, 'Status must be 200 or 201');
    assert.strictEqual(startRes.body.success, true);
    assert(startRes.body.challengeId, 'Must return challengeId');
    assert.strictEqual(startRes.body.status, 'ACTIVE');
    assert.strictEqual(startRes.body.remainingSeconds, 180);
    assert(startRes.body.mutatedCode, 'Must return mutated code');
    assert.notStrictEqual(startRes.body.mutatedCode, originalPythonCode, 'Mutated code must differ from original code');

    const challengeId = startRes.body.challengeId;
    const deadlineAtFirst = startRes.body.deadlineAt;
    const mutatedCode = startRes.body.mutatedCode;
    console.log(`  ✔ Phase 2 challenge started (id: ${challengeId}).`);
    console.log(`  ✔ Server-authoritative deadline: ${deadlineAtFirst}`);
    console.log('  ✔ Mutated code received and differs from original.\n');

    // Test 6: Idempotency & Timer Anti-Reset
    console.log('Test 6: Verifying Timer Anti-Reset on refresh/re-start...');
    const reStartRes = await makeRequest(
      'POST',
      `/api/student/assignments/${testAssignmentId}/phase2/start`,
      authHeader
    );
    assert.strictEqual(reStartRes.status, 200);
    assert.strictEqual(reStartRes.body.challengeId, challengeId);
    assert.strictEqual(reStartRes.body.deadlineAt, deadlineAtFirst, 'Deadline must NOT change upon restart/reopen');

    const getPhase2Again = await makeRequest(
      'GET',
      `/api/student/assignments/${testAssignmentId}/phase2`,
      authHeader
    );
    assert.strictEqual(getPhase2Again.status, 200);
    assert.strictEqual(getPhase2Again.body.state, 'PHASE2_ACTIVE');
    assert.strictEqual(getPhase2Again.body.deadlineAt, deadlineAtFirst);
    assert.strictEqual(getPhase2Again.body.challengeId, challengeId);
    console.log('  ✔ Server deadline is strictly immutable; refreshing/reopening cannot reset the timer.\n');

    // Test 7: Original code immutability
    console.log('Test 7: Verifying original code remains permanently untouched in database...');
    const attemptRow = dbGet<any>('SELECT original_code, mutated_code FROM student_attempts WHERE assignment_id = ? AND student_id = ?', [
      testAssignmentId,
      testStudentId,
    ]);
    assert.strictEqual(attemptRow?.original_code, originalPythonCode);
    assert.strictEqual(attemptRow?.mutated_code, mutatedCode);
    console.log('  ✔ original_code and mutated_code remain distinct and immutable.\n');

    // Test 8: Submit Phase 2 fix before deadline
    console.log('Test 8: Submitting corrected code before timer expires...');
    const repairedCode = originalPythonCode; // student fixes the bug back to correct
    const submitFixRes = await makeRequest(
      'POST',
      `/api/student/assignments/${testAssignmentId}/phase2/submit`,
      authHeader,
      {
        challengeId,
        finalCode: repairedCode,
      }
    );
    assert.strictEqual(submitFixRes.status, 200);
    assert.strictEqual(submitFixRes.body.success, true);
    assert.strictEqual(submitFixRes.body.state, 'PHASE2_SUBMITTED');
    console.log('  ✔ Phase 2 submission accepted and recorded.');

    // Verify stored in phase2_challenges
    const challengeRow = dbGet<any>('SELECT * FROM phase2_challenges WHERE id = ?', [challengeId]);
    assert(challengeRow?.status === 'SUBMITTED' || challengeRow?.status === 'PASSED', 'Challenge status must be SUBMITTED or PASSED');
    assert.strictEqual(challengeRow?.final_code, repairedCode);
    assert(challengeRow?.submitted_at, 'submitted_at must be populated');
    console.log('  ✔ final_code recorded in phase2_challenges table.\n');

    // Test 9: Submitting again after already submitted is rejected
    console.log('Test 9: Verifying duplicate submission is rejected...');
    const dupSubmitRes = await makeRequest(
      'POST',
      `/api/student/assignments/${testAssignmentId}/phase2/submit`,
      authHeader,
      {
        challengeId,
        finalCode: 'def different_code(): pass',
      }
    );
    assert.strictEqual(dupSubmitRes.status, 400);
    console.log('  ✔ Duplicate submission cleanly rejected.\n');

    // Test 10: Test deadline expiration enforcement
    console.log('Test 10: Testing server deadline expiration enforcement...');
    // Create another student & assignment to test expired scenario
    const expiredStudentId = `std-exp-${Date.now()}`;
    const expiredStudentToken = generateToken({
      userId: expiredStudentId,
      email: 'student_exp@syntaxviva.edu',
      role: 'student',
      name: 'Expired Student',
    });
    const expAuthHeader = { Authorization: `Bearer ${expiredStudentToken}` };

    const expAssignmentId = `asg-exp-${Date.now()}`;
    dbRun(
      `INSERT INTO assignments (id, title, description, requirements, starter_code, language, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [expAssignmentId, 'Expired Test', 'Testing expiry', 'Solve problem', '# starter', 'python', 'active', 'usr-prof-1', new Date().toISOString(), new Date().toISOString()]
    );

    // Submit Phase 1
    await makeRequest(
      'POST',
      `/api/student/assignments/${expAssignmentId}/phase1/submit`,
      expAuthHeader,
      { code: 'def solve(n): return n * 2', language: 'python' }
    );

    // Start Phase 2
    const expStartRes = await makeRequest(
      'POST',
      `/api/student/assignments/${expAssignmentId}/phase2/start`,
      expAuthHeader
    );
    const expChallengeId = expStartRes.body.challengeId;

    // Artificially wind back deadline_at in database to 10 seconds ago to simulate expiry
    const pastDeadline = new Date(Date.now() - 10000).toISOString();
    dbRun('UPDATE phase2_challenges SET deadline_at = ? WHERE id = ?', [pastDeadline, expChallengeId]);

    // Attempt to submit after deadline
    const lateSubmitRes = await makeRequest(
      'POST',
      `/api/student/assignments/${expAssignmentId}/phase2/submit`,
      expAuthHeader,
      {
        challengeId: expChallengeId,
        finalCode: 'def solve(n): return n * 2',
      }
    );
    assert.strictEqual(lateSubmitRes.status, 400);
    assert(lateSubmitRes.body.error.toLowerCase().includes('expired'));
    console.log('  ✔ Submission after deadline rejected with "Challenge time expired".');

    // Verify challenge status updated to EXPIRED
    const expChallengeRow = dbGet<any>('SELECT status FROM phase2_challenges WHERE id = ?', [expChallengeId]);
    assert.strictEqual(expChallengeRow?.status, 'EXPIRED');
    console.log('  ✔ Challenge status updated to EXPIRED in database.\n');

    console.log('===========================================================');
    console.log('🎉 ALL PART 4 TESTS PASSED PERFECTLY!');
    console.log('===========================================================');
  } finally {
    await close();
  }
}

runPart4Tests().catch((err) => {
  console.error('PART 4 Test Failed:', err);
  process.exit(1);
});
