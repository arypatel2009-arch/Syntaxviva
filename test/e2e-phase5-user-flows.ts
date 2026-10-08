import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function request(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, ok: response.ok, data };
}

async function runPhase5RealUserFlows() {
  console.log('=== [SyntaXViva] PHASE 5 REAL USER FLOW VERIFICATION ===\n');

  // -------------------------------------------------------------
  // Step 1: Faculty Authentication & Session Management
  // -------------------------------------------------------------
  console.log('Step 1: Testing Faculty Login and Session Claim...');
  const facultyLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'faculty@college.edu',
      password: 'Password123!',
    }),
  });

  assert.strictEqual(facultyLogin.status, 200, `Faculty login failed: ${JSON.stringify(facultyLogin.data)}`);
  assert(facultyLogin.data.token, 'Faculty login should return token');
  assert.strictEqual(facultyLogin.data.user.role, 'faculty', 'User should have faculty role');
  const facultyToken = facultyLogin.data.token;
  console.log('✔ Faculty authenticated successfully:', facultyLogin.data.user.email);

  // Faculty claims division session
  const claimRes = await request('/api/auth/faculty/session/claim', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({}),
  });
  assert.strictEqual(claimRes.status, 200, `Claim session failed: ${JSON.stringify(claimRes.data)}`);
  console.log('✔ Faculty session claimed for division');

  // Faculty session heartbeat
  const hbRes = await request('/api/auth/faculty/session/heartbeat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({}),
  });
  assert.strictEqual(hbRes.status, 200, `Heartbeat failed: ${JSON.stringify(hbRes.data)}`);
  console.log('✔ Faculty session heartbeat confirmed');

  // -------------------------------------------------------------
  // Step 2: Faculty Dashboard Stats & Assignment Creation
  // -------------------------------------------------------------
  console.log('\nStep 2: Testing Faculty Dashboard Stats and Assignment Creation...');
  const statsRes = await request('/api/assignments/meta/stats', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  assert.strictEqual(statsRes.status, 200, `Stats failed: ${JSON.stringify(statsRes.data)}`);
  console.log('✔ Faculty stats retrieved:', statsRes.data.stats);

  const testTitle = `E2E Flow Test ${Date.now()}`;
  const createAsgRes = await request('/api/assignments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({
      title: testTitle,
      description: 'Find if a number is positive, negative, or zero',
      language: 'python',
      requirements: 'Handle zero, positive, and negative numbers.',
      starterCode: 'def classify_number(n):\n    # Return "Positive", "Negative", or "Zero"\n    pass\n',
      dueDate: '2026-12-31',
      testCases: [
        { input: '5', expected: 'Positive', description: 'Test positive' },
        { input: '-3', expected: 'Negative', description: 'Test negative' },
        { input: '0', expected: 'Zero', description: 'Test zero' },
      ],
    }),
  });

  assert.strictEqual(createAsgRes.status, 201, `Create assignment failed: ${JSON.stringify(createAsgRes.data)}`);
  const createdAssignment = createAsgRes.data.assignment;
  assert(createdAssignment && createdAssignment.id, 'Assignment ID should be returned');
  console.log('✔ Faculty created assignment:', createdAssignment.id, '-', createdAssignment.title);

  // -------------------------------------------------------------
  // Step 3: Student Authentication & Assignment Discovery
  // -------------------------------------------------------------
  console.log('\nStep 3: Testing Student Login and Assignment Discovery...');
  const studentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'student@college.edu',
      password: 'Password123!',
    }),
  });

  assert.strictEqual(studentLogin.status, 200, `Student login failed: ${JSON.stringify(studentLogin.data)}`);
  const studentToken = studentLogin.data.token;
  console.log('✔ Student authenticated successfully:', studentLogin.data.user.email);

  const studentAsgsRes = await request('/api/assignments', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentAsgsRes.status, 200, `Student get assignments failed: ${JSON.stringify(studentAsgsRes.data)}`);
  const foundAsg = studentAsgsRes.data.assignments.find((a: any) => a.id === createdAssignment.id);
  assert(foundAsg, 'Newly created assignment should be visible in Student assignment list');
  console.log('✔ Student discovered newly published assignment in list');

  // -------------------------------------------------------------
  // Step 4: Student Phase 1 Submission & Mutation Generation
  // -------------------------------------------------------------
  console.log('\nStep 4: Testing Student Phase 1 Code Submission & AST Mutation Engine...');
  const studentPhase1Code = `def classify_number(n):
    if n > 0:
        return "Positive"
    elif n < 0:
        return "Negative"
    else:
        return "Zero"

val = int(input())
print(classify_number(val))
`;

  const submitP1Res = await request(`/api/student/assignments/${createdAssignment.id}/phase1/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      code: studentPhase1Code,
      language: 'python',
    }),
  });

  assert(submitP1Res.status === 200 || submitP1Res.status === 201, `Phase 1 submit failed: ${JSON.stringify(submitP1Res.data)}`);
  assert(submitP1Res.data.submission, 'Submission object should be returned');
  const attemptId = submitP1Res.data.submission.id;
  console.log('✔ Phase 1 code submitted. Attempt ID:', attemptId);
  console.log('✔ Mutation generation result:', submitP1Res.data.mutation?.status || 'READY');

  // -------------------------------------------------------------
  // Step 5: Student Phase 2 Challenge Viva Flow
  // -------------------------------------------------------------
  console.log('\nStep 5: Testing Phase 2 Viva Challenge Initialization...');
  const startP2Res = await request(`/api/student/assignments/${createdAssignment.id}/phase2/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({}),
  });

  assert(startP2Res.status === 200 || startP2Res.status === 201, `Phase 2 start failed: ${JSON.stringify(startP2Res.data)}`);
  const challengeId = startP2Res.data.challengeId;
  const deadlineAt = startP2Res.data.deadlineAt;
  assert(challengeId, 'Phase 2 challenge should be created with challengeId');
  assert(deadlineAt, 'Phase 2 challenge should have server-enforced deadline');
  console.log('✔ Phase 2 Viva challenge initialized. Challenge ID:', challengeId);
  console.log('✔ Server deadline established:', deadlineAt);

  // Submit proctoring / security event
  console.log('\nStep 6: Testing Proctoring & Security Event Ingestion...');
  const secEventRes = await request(`/api/student/assignments/${createdAssignment.id}/phase2/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      challengeId: challengeId,
      eventType: 'PROCTORING_INITIALIZED',
      severity: 'INFO',
      metadata: { cameraReady: true, testMode: true },
    }),
  });
  assert.strictEqual(secEventRes.status, 200, `Security event failed: ${JSON.stringify(secEventRes.data)}`);
  console.log('✔ Proctoring security event successfully recorded in audit log');

  // -------------------------------------------------------------
  // Step 7: Student Phase 2 Challenge Code Repair & Evaluation
  // -------------------------------------------------------------
  console.log('\nStep 7: Testing Phase 2 Code Repair & Deterministic Evaluation...');
  // The student submits their repaired code to pass all test cases
  const submitP2Res = await request(`/api/student/assignments/${createdAssignment.id}/phase2/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      challengeId: challengeId,
      finalCode: studentPhase1Code,
    }),
  });

  assert(submitP2Res.status === 200 || submitP2Res.status === 201, `Phase 2 submit failed: ${JSON.stringify(submitP2Res.data)}`);
  assert.strictEqual(submitP2Res.data.evaluationStatus, 'PASSED', 'Phase 2 evaluation should pass');
  console.log('✔ Phase 2 code evaluated. Tests passed:', submitP2Res.data.testsPassed, '/', submitP2Res.data.testsTotal);
  console.log('✔ Attempt state updated to:', submitP2Res.data.state || 'PHASE2_SUBMITTED');

  // -------------------------------------------------------------
  // Step 8: Verify Student Submissions, Status & Faculty Review
  // -------------------------------------------------------------
  console.log('\nStep 8: Verifying Student Results & Completion Status...');
  const studentStatusRes = await request(`/api/student/assignments/${createdAssignment.id}/phase2`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentStatusRes.status, 200, `Get phase 2 status failed: ${JSON.stringify(studentStatusRes.data)}`);
  assert(
    studentStatusRes.data.state === 'PHASE2_PASSED' ||
    studentStatusRes.data.state === 'PHASE2_SUBMITTED' ||
    studentStatusRes.data.status === 'PASSED',
    `Expected completed status, got: ${studentStatusRes.data.state}`
  );
  console.log('✔ Authoritative attempt status verified:', studentStatusRes.data.state || studentStatusRes.data.status);

  // Verify student assignments list reflects completion
  const refreshedAsgsRes = await request('/api/assignments', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const updatedAsg = refreshedAsgsRes.data.assignments.find((a: any) => a.id === createdAssignment.id);
  assert(updatedAsg, 'Assignment must exist in refreshed list');
  assert.strictEqual(updatedAsg.myAttemptState, 'PHASE2_PASSED', 'myAttemptState must be PHASE2_PASSED');
  assert.strictEqual(updatedAsg.myPhase2Status, 'PHASE2_PASSED', 'myPhase2Status must be PHASE2_PASSED');
  console.log('✔ Student assignments list confirms: myAttemptState = PHASE2_PASSED, myPhase2Status = PHASE2_PASSED');

  // Faculty Review Flow: Faculty retrieves assignments list and verifies submission count
  console.log('\nStep 9: Testing Faculty Submission Review Flow...');
  const facultyAsgsRes = await request('/api/assignments', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  assert.strictEqual(facultyAsgsRes.status, 200, `Faculty assignments failed: ${JSON.stringify(facultyAsgsRes.data)}`);
  const facultyAsg = facultyAsgsRes.data.assignments.find((a: any) => a.id === createdAssignment.id);
  assert(facultyAsg, 'Faculty must see created assignment in list');
  const count = Number(facultyAsg.submission_count ?? facultyAsg.submissionCount ?? 0);
  assert(count >= 1, `Submission count must be at least 1, got ${count}`);
  console.log(`✔ Faculty successfully confirmed student submission registered (Count: ${count})`);

  // -------------------------------------------------------------
  // Step 10: Faculty Release Session & Cleanup
  // -------------------------------------------------------------
  console.log('\nStep 10: Testing Faculty Session Release & Cleanup...');
  const releaseRes = await request('/api/auth/faculty/session/release', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  assert.strictEqual(releaseRes.status, 200, `Session release failed: ${JSON.stringify(releaseRes.data)}`);
  console.log('✔ Faculty division session released successfully');

  console.log('\n=============================================================');
  console.log('ALL PHASE 5 REAL USER FLOWS VERIFIED & PASSING SUCCESSFULLY!');
  console.log('=============================================================\n');
}

runPhase5RealUserFlows().catch((err) => {
  console.error('Phase 5 verification failed:', err);
  process.exit(1);
});
