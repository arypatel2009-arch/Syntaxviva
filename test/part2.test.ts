import assert from 'assert';
import http from 'http';
import { getDatabase, dbGet, dbQuery, dbRun, saveDatabaseToDisk } from '../server/db/database.ts';
import { generateToken } from '../server/auth/jwt.ts';
import express from 'express';
import { studentRouter } from '../server/routes/student.ts';

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

async function runPart2Tests() {
  console.log('=== [SyntaXViva] PART 2 AUTOMATED VERIFICATION SUITE ===');
  console.log('Phase 1 Direct Code Intake & Immutability Verification\n');

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

  // Test 1: Verify student_attempts schema includes language and submitted_at
  console.log('Test 1: Verifying student_attempts schema columns...');
  const tableInfo = dbQuery<{ name: string; type: string }>(
    'PRAGMA table_info(student_attempts)'
  );
  const columnNames = tableInfo.map((c) => c.name);
  console.log('Columns in student_attempts:', columnNames.join(', '));

  assert(columnNames.includes('language'), 'student_attempts must have language column');
  assert(columnNames.includes('submitted_at'), 'student_attempts must have submitted_at column');
  assert(columnNames.includes('original_code'), 'student_attempts must have original_code column');
  assert(columnNames.includes('mutated_code'), 'student_attempts must have mutated_code column');
  console.log('✔ Test 1 Passed: Database schema includes all Phase 1 and future Phase 2 columns.\n');

  // Prepare test users and test assignment
  const studentUser = {
    id: 'user_test_student_p2',
    email: 'p2student@example.com',
    name: 'P2 Student',
    role: 'student',
  };

  const facultyUser = {
    id: 'user_test_faculty_p2',
    email: 'p2faculty@example.com',
    name: 'P2 Faculty',
    role: 'faculty',
  };

  const testAssignment = {
    id: 'asg_p2_twosum',
    title: 'Two Sum Problem',
    description: 'Find two integers in an array that sum to a specific target.',
    language: 'python',
    requirements: 'Return 0-indexed tuple. Time complexity O(N).',
    starter_code: 'def two_sum(nums, target):\n    # Write code here\n    pass',
    status: 'active',
  };

  // Seed DB with users & assignment if not existing
  const now = new Date().toISOString();
  dbRun(
    `INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at, updated_at)
     VALUES (?, ?, 'hash', ?, ?, ?, ?)`,
    [studentUser.id, studentUser.email, studentUser.name, studentUser.role, now, now]
  );
  dbRun(
    `INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at, updated_at)
     VALUES (?, ?, 'hash', ?, ?, ?, ?)`,
    [facultyUser.id, facultyUser.email, facultyUser.name, facultyUser.role, now, now]
  );
  dbRun(
    `INSERT OR REPLACE INTO assignments (id, title, description, language, requirements, starter_code, test_cases_json, created_by, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)`,
    [
      testAssignment.id,
      testAssignment.title,
      testAssignment.description,
      testAssignment.language,
      testAssignment.requirements,
      testAssignment.starter_code,
      facultyUser.id,
      testAssignment.status,
      now,
      now,
    ]
  );
  // Clean any prior attempts for this student & assignment
  dbRun('DELETE FROM student_attempts WHERE assignment_id = ? AND student_id = ?', [
    testAssignment.id,
    studentUser.id,
  ]);
  saveDatabaseToDisk();

  const studentToken = generateToken({
    userId: studentUser.id,
    email: studentUser.email,
    name: studentUser.name,
    role: 'student',
  });

  const facultyToken = generateToken({
    userId: facultyUser.id,
    email: facultyUser.email,
    name: facultyUser.name,
    role: 'faculty',
  });

  // Test 2: Authentication & Role Enforcement
  console.log('Test 2: Verifying Authentication & Role Barriers...');
  // 2a: Unauthenticated
  const unauthRes = await makeRequest(
    'POST',
    `/api/student/assignments/${testAssignment.id}/phase1/submit`,
    {},
    { code: 'print("hello")', language: 'python' }
  );
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

  // 2b: Faculty role attempting student submission
  const facultyRes = await makeRequest(
    'POST',
    `/api/student/assignments/${testAssignment.id}/phase1/submit`,
    { authorization: `Bearer ${facultyToken}` },
    { code: 'print("hello")', language: 'python' }
  );
  assert.strictEqual(facultyRes.status, 403, 'Faculty role attempting student submission must return 403');
  console.log('✔ Test 2 Passed: Role-based access control strictly enforced (401 / 403).\n');

  // Test 3: Validation & Error Handling
  console.log('Test 3: Validating request shapes and payload constraints...');
  // 3a: Empty code
  const emptyRes = await makeRequest(
    'POST',
    `/api/student/assignments/${testAssignment.id}/phase1/submit`,
    { authorization: `Bearer ${studentToken}` },
    { code: '   ', language: 'python' }
  );
  assert.strictEqual(emptyRes.status, 400, 'Empty code must return 400');
  assert(emptyRes.body.error.includes('empty'), 'Must specify code cannot be empty');

  // 3b: Invalid language
  const badLangRes = await makeRequest(
    'POST',
    `/api/student/assignments/${testAssignment.id}/phase1/submit`,
    { authorization: `Bearer ${studentToken}` },
    { code: 'SELECT 1;', language: 'cobol' }
  );
  assert.strictEqual(badLangRes.status, 400, 'Unsupported language must return 400');

  // 3c: Non-existent assignment
  const notFoundRes = await makeRequest(
    'POST',
    `/api/student/assignments/asg_does_not_exist/phase1/submit`,
    { authorization: `Bearer ${studentToken}` },
    { code: 'print("test")', language: 'python' }
  );
  assert.strictEqual(notFoundRes.status, 404, 'Non-existent assignment must return 404');
  console.log('✔ Test 3 Passed: Bad inputs, empty payloads, and missing assignments handled cleanly.\n');

  // Test 4: Direct Phase 1 Code Submission (Happy Path)
  console.log('Test 4: Executing Direct Phase 1 Student Submission without pre-run...');
  const originalStudentCode = `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return (seen[diff], i)
        seen[n] = i
    return ()
`;

  const submitRes = await makeRequest(
    'POST',
    `/api/student/assignments/${testAssignment.id}/phase1/submit`,
    { authorization: `Bearer ${studentToken}` },
    { code: originalStudentCode, language: 'python' }
  );

  assert.strictEqual(submitRes.status, 201, `Submission must return 201 Created, received ${submitRes.status}`);
  assert.strictEqual(submitRes.body.success, true, 'Response must have success: true');
  assert(
    submitRes.body.submission.state === 'PHASE1_SUBMITTED' || submitRes.body.submission.state === 'MUTATION_READY',
    'State must be PHASE1_SUBMITTED or MUTATION_READY'
  );
  assert.strictEqual(submitRes.body.submission.originalCode, originalStudentCode, 'originalCode in response must match verbatim');
  assert(submitRes.body.submission.submittedAt, 'submittedAt must be populated with timestamp');
  console.log('✔ Test 4 Passed: Direct submission recorded successfully.\n');

  // Test 5: Verify Storage Immutability in SQLite Database
  console.log('Test 5: Verifying SQLite persistence and field segregation...');
  const attemptRow = dbGet<any>(
    'SELECT * FROM student_attempts WHERE assignment_id = ? AND student_id = ?',
    [testAssignment.id, studentUser.id]
  );
  assert(attemptRow, 'Attempt row must exist in database');
  assert(
    attemptRow.state === 'PHASE1_SUBMITTED' || attemptRow.state === 'MUTATION_READY',
    'DB state must be PHASE1_SUBMITTED or MUTATION_READY'
  );
  assert.strictEqual(attemptRow.original_code, originalStudentCode, 'Stored original_code must exactly match input verbatim');
  assert.strictEqual(attemptRow.language, 'python', 'Stored language must be python');
  assert(attemptRow.submitted_at, 'submitted_at must be populated');
  // Phase 2 evaluation fields must be strictly NULL
  assert.strictEqual(attemptRow.repaired_code, null, 'repaired_code must be NULL in Phase 1');
  assert.strictEqual(attemptRow.evaluation_result_json, null, 'evaluation_result_json must be NULL in Phase 1');
  console.log('✔ Test 5 Passed: Original code stored immutably. Future Phase 2 repair and evaluation fields remain NULL.\n');

  // Test 6: Duplicate Submission Rejection & Immutability Enforcement
  console.log('Test 6: Verifying duplicate submission rejection (HTTP 409 Conflict)...');
  const tamperedCode = 'def two_sum(nums, target): return "HACKED"';
  const duplicateRes = await makeRequest(
    'POST',
    `/api/student/assignments/${testAssignment.id}/phase1/submit`,
    { authorization: `Bearer ${studentToken}` },
    { code: tamperedCode, language: 'python' }
  );

  assert.strictEqual(duplicateRes.status, 409, `Duplicate submission must return 409 Conflict, received ${duplicateRes.status}`);
  assert(duplicateRes.body.error.includes('already exists'), 'Error must note Phase 1 submission already exists');

  // Verify DB original_code was NOT modified
  const verifiedAttempt = dbGet<any>(
    'SELECT original_code FROM student_attempts WHERE assignment_id = ? AND student_id = ?',
    [testAssignment.id, studentUser.id]
  );
  assert.strictEqual(
    verifiedAttempt.original_code,
    originalStudentCode,
    'Original code must NOT be changed by subsequent attempts'
  );
  console.log('✔ Test 6 Passed: Duplicate submission rejected with 409 and original code is preserved.\n');

  // Test 7: GET Phase 1 Status
  console.log('Test 7: Verifying GET /api/student/assignments/:assignmentId/phase1...');
  const getRes = await makeRequest(
    'GET',
    `/api/student/assignments/${testAssignment.id}/phase1`,
    { authorization: `Bearer ${studentToken}` }
  );

  assert.strictEqual(getRes.status, 200, 'GET Phase 1 status must return 200');
  assert.strictEqual(getRes.body.assignment.id, testAssignment.id, 'Assignment ID must match');
  assert(getRes.body.attempt, 'Attempt object must be returned');
  assert(
    getRes.body.attempt.state === 'PHASE1_SUBMITTED' || getRes.body.attempt.state === 'MUTATION_READY',
    'State must be PHASE1_SUBMITTED or MUTATION_READY'
  );
  assert.strictEqual(getRes.body.attempt.originalCode, originalStudentCode, 'originalCode must be returned');
  console.log('✔ Test 7 Passed: Phase 1 retrieval provides accurate state and original code.\n');

  await close();

  console.log('====================================================');
  console.log('ALL PART 2 PHASE 1 DIRECT SUBMISSION TESTS PASSED! ✔');
  console.log('====================================================\n');
}

runPart2Tests().catch((err) => {
  console.error('PART 2 TEST FAILURE:', err);
  process.exit(1);
});
