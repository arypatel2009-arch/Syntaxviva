/**
 * SyntaXViva — Multi-Tenancy & Data Isolation Verification Suite
 * 
 * Verifies the strict 3-tier boundary: College -> Classroom -> Assignment
 * 
 * Tests:
 * 1. College tenant scoping and user college association
 * 2. Faculty creates Classroom with auto-generated 6-char alphanumeric join code
 * 3. Cross-college enrollment attempt blocked with HTTP 403 Forbidden (code: 'cross_college_forbidden')
 * 4. Duplicate enrollment attempt rejected with HTTP 409 Conflict (code: 'already_enrolled')
 * 5. Student Assignment Feed strictly scoped (un-enrolled student sees 0 assignments; enrolled student sees assignment)
 * 6. Direct Assignment Access Protection (un-enrolled student receives HTTP 403 on GET /api/assignments/:id)
 * 7. Student Endpoints Protection (un-enrolled student receives HTTP 403 on phase1, phase1/submit, phase2, phase2/start, run)
 */

import assert from 'assert';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { getDatabase, getOrCreateCollege } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';
import { classroomsRouter } from '../server/routes/classrooms.ts';
import { assignmentsRouter } from '../server/routes/assignments.ts';
import { studentRouter } from '../server/routes/student.ts';
import { generateToken } from '../server/auth/jwt.ts';

function makeRequest(
  port: number,
  path: string,
  method: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const jsonBody = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = { ...headers };
    if (jsonBody) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(jsonBody).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, data: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (jsonBody) {
      req.write(jsonBody);
    }
    req.end();
  });
}

(async () => {
  console.log('\n================================================================');
  console.log(' SyntaXViva Multi-Tenancy & Data Isolation Integration Suite');
  console.log('================================================================\n');

  // Initialize DB and Repository
  await getDatabase();
  const repo = getRepository();

  // Create Express App
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/classrooms', classroomsRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/student', studentRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  console.log(`[TEST] Temporary test server listening on port ${port}`);

  try {
    const runId = Date.now().toString(36);

    // 1. Setup Two Distinct Colleges
    const collegeA = await repo.getOrCreateCollege(`Test MIT College ${runId}`, `MIT_${runId}`);
    const collegeB = await repo.getOrCreateCollege(`Test Stanford College ${runId}`, `STA_${runId}`);
    console.log(`[TEST] College A created: ${collegeA.name} (${collegeA.id})`);
    console.log(`[TEST] College B created: ${collegeB.name} (${collegeB.id})`);

    // 2. Setup Users in Colleges
    // Faculty A (College A)
    const facultyAId = `fac_a_${runId}`;
    await repo.upsertProfile({
      id: facultyAId,
      email: `faculty_a_${runId}@college-a.edu`,
      full_name: 'Professor Ada Lovelace',
      role: 'faculty',
      institution_id: collegeA.name,
      college_id: collegeA.id,
    });
    const facultyAToken = generateToken({
      userId: facultyAId,
      email: `faculty_a_${runId}@college-a.edu`,
      role: 'faculty',
      name: 'Professor Ada Lovelace',
    });

    // Student A (College A, will enroll in Classroom A)
    const studentAId = `std_a_${runId}`;
    await repo.upsertProfile({
      id: studentAId,
      email: `student_a_${runId}@college-a.edu`,
      full_name: 'Alice Turing',
      role: 'student',
      institution_id: collegeA.name,
      college_id: collegeA.id,
      roll_number: 'MIT-001',
      class_id: 'CS',
      division_id: 'A',
    });
    const studentAToken = generateToken({
      userId: studentAId,
      email: `student_a_${runId}@college-a.edu`,
      role: 'student',
      name: 'Alice Turing',
    });

    // Student A2 (College A, will NOT enroll)
    const studentA2Id = `std_a2_${runId}`;
    await repo.upsertProfile({
      id: studentA2Id,
      email: `student_a2_${runId}@college-a.edu`,
      full_name: 'Arthur Pendelton',
      role: 'student',
      institution_id: collegeA.name,
      college_id: collegeA.id,
      roll_number: 'MIT-002',
      class_id: 'CS',
      division_id: 'B',
    });
    const studentA2Token = generateToken({
      userId: studentA2Id,
      email: `student_a2_${runId}@college-a.edu`,
      role: 'student',
      name: 'Arthur Pendelton',
    });

    // Student B (College B, cross-college attacker)
    const studentBId = `std_b_${runId}`;
    await repo.upsertProfile({
      id: studentBId,
      email: `student_b_${runId}@college-b.edu`,
      full_name: 'Bob Stanford',
      role: 'student',
      institution_id: collegeB.name,
      college_id: collegeB.id,
      roll_number: 'STA-999',
      class_id: 'EE',
      division_id: 'A',
    });
    const studentBToken = generateToken({
      userId: studentBId,
      email: `student_b_${runId}@college-b.edu`,
      role: 'student',
      name: 'Bob Stanford',
    });

    console.log('[TEST] Users registered with scoped college identities.');

    // -------------------------------------------------------------------------
    // TEST 1: Faculty creates Classroom A
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] Faculty A creates Classroom A...');
    const createClassroomRes = await makeRequest(
      port,
      '/api/classrooms',
      'POST',
      {
        name: `Data Structures CS101 ${runId}`,
        description: 'Advanced Algorithms Cohort',
      },
      { Authorization: `Bearer ${facultyAToken}` }
    );

    assert.strictEqual(createClassroomRes.status, 201, 'Classroom creation should return 201');
    assert.ok(createClassroomRes.data.classroom, 'Classroom data should be returned');
    assert.strictEqual(createClassroomRes.data.classroom.college_id, collegeA.id, 'Classroom must belong to College A');
    assert.strictEqual(typeof createClassroomRes.data.joinCode, 'string', 'Join code must be returned');
    assert.strictEqual(createClassroomRes.data.joinCode.length, 6, 'Join code must be exactly 6 characters');
    const classroomA = createClassroomRes.data.classroom;
    const joinCodeA = createClassroomRes.data.joinCode;
    console.log(`[PASS] Classroom A created with join code "${joinCodeA}" in College A.`);

    // -------------------------------------------------------------------------
    // TEST 2: Cross-College Enrollment Attempt Blocked (403 Forbidden)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Cross-College Student B attempts to join Classroom A...');
    const crossCollegeJoinRes = await makeRequest(
      port,
      '/api/classrooms/join',
      'POST',
      { joinCode: joinCodeA },
      { Authorization: `Bearer ${studentBToken}` }
    );

    assert.strictEqual(
      crossCollegeJoinRes.status,
      403,
      'Cross-college enrollment must be rejected with HTTP 403 Forbidden'
    );
    assert.strictEqual(
      crossCollegeJoinRes.data.code,
      'cross_college_forbidden',
      'Error code must be "cross_college_forbidden"'
    );
    console.log('[PASS] Cross-college enrollment correctly blocked with 403 Forbidden (cross_college_forbidden).');

    // -------------------------------------------------------------------------
    // TEST 3: Legitimate Same-College Student A Joins Classroom A
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Same-college Student A joins Classroom A...');
    const studentAJoinRes = await makeRequest(
      port,
      '/api/classrooms/join',
      'POST',
      { joinCode: joinCodeA },
      { Authorization: `Bearer ${studentAToken}` }
    );

    assert.strictEqual(studentAJoinRes.status, 200, 'Same-college student enrollment should succeed with 200 OK');
    assert.ok(studentAJoinRes.data.enrollment, 'Enrollment record must be returned');
    assert.strictEqual(studentAJoinRes.data.enrollment.classroom_id, classroomA.id);
    assert.strictEqual(studentAJoinRes.data.enrollment.student_id, studentAId);
    console.log('[PASS] Student A successfully enrolled in Classroom A.');

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate Enrollment Attempt Blocked (409 Conflict)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Student A attempts duplicate enrollment in Classroom A...');
    const duplicateJoinRes = await makeRequest(
      port,
      '/api/classrooms/join',
      'POST',
      { joinCode: joinCodeA },
      { Authorization: `Bearer ${studentAToken}` }
    );

    assert.strictEqual(
      duplicateJoinRes.status,
      409,
      'Duplicate enrollment must be rejected with HTTP 409 Conflict'
    );
    assert.strictEqual(
      duplicateJoinRes.data.code,
      'already_enrolled',
      'Error code must be "already_enrolled"'
    );
    console.log('[PASS] Duplicate enrollment correctly rejected with 409 Conflict (already_enrolled).');

    // -------------------------------------------------------------------------
    // TEST 5: Faculty Creates Scoped Assignment in Classroom A
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Faculty A creates Assignment A in Classroom A...');
    const createAssignmentRes = await makeRequest(
      port,
      '/api/assignments',
      'POST',
      {
        title: `Binary Search Viva Lab ${runId}`,
        description: 'Implement binary search with O(log n) complexity.',
        language: 'python',
        requirements: 'def search(arr, target): ...',
        starterCode: 'def search(arr, target):\n    pass\n',
        classroomId: classroomA.id,
        testCases: [
          { input: '[1, 2, 3, 4, 5], 3', expected: '2', description: 'Middle element' },
          { input: '[1, 2, 3, 4, 5], 6', expected: '-1', description: 'Element not found' },
        ],
      },
      { Authorization: `Bearer ${facultyAToken}` }
    );

    assert.strictEqual(createAssignmentRes.status, 201, 'Assignment creation should return 201');
    assert.ok(createAssignmentRes.data.assignment, 'Assignment data should be returned');
    const assignmentA = createAssignmentRes.data.assignment;
    assert.strictEqual(assignmentA.classroom_id, classroomA.id, 'Assignment must belong to Classroom A');
    console.log(`[PASS] Assignment A created (${assignmentA.id}) in Classroom A.`);

    // -------------------------------------------------------------------------
    // TEST 6: Student Assignment Feed Strict Scoping (GET /api/assignments)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Verifying Student Assignment Feed Scoping...');

    // 6a: Un-enrolled Student A2 (College A, not in Classroom A)
    const feedA2Res = await makeRequest(
      port,
      '/api/assignments',
      'GET',
      undefined,
      { Authorization: `Bearer ${studentA2Token}` }
    );
    assert.strictEqual(feedA2Res.status, 200);
    const feedA2Assignments = feedA2Res.data.assignments || [];
    const seesAssignmentA2 = feedA2Assignments.some((a: any) => a.id === assignmentA.id);
    assert.strictEqual(
      seesAssignmentA2,
      false,
      'Un-enrolled Student A2 must NEVER see assignments from classrooms they did not join'
    );
    console.log('[PASS] Un-enrolled Student A2 feed is strictly empty for unjoined classrooms.');

    // 6b: Enrolled Student A (College A, enrolled in Classroom A)
    const feedARes = await makeRequest(
      port,
      '/api/assignments',
      'GET',
      undefined,
      { Authorization: `Bearer ${studentAToken}` }
    );
    assert.strictEqual(feedARes.status, 200);
    const feedAAssignments = feedARes.data.assignments || [];
    const seesAssignmentA = feedAAssignments.some((a: any) => a.id === assignmentA.id);
    assert.strictEqual(
      seesAssignmentA,
      true,
      'Enrolled Student A MUST see Assignment A in their feed'
    );
    console.log('[PASS] Enrolled Student A successfully sees Assignment A in their feed.');

    // 6c: Cross-College Student B (College B)
    const feedBRes = await makeRequest(
      port,
      '/api/assignments',
      'GET',
      undefined,
      { Authorization: `Bearer ${studentBToken}` }
    );
    assert.strictEqual(feedBRes.status, 200);
    const feedBAssignments = feedBRes.data.assignments || [];
    const seesAssignmentB = feedBAssignments.some((a: any) => a.id === assignmentA.id);
    assert.strictEqual(
      seesAssignmentB,
      false,
      'Cross-college Student B must NEVER see Assignment A'
    );
    console.log('[PASS] Cross-college Student B cannot see Assignment A in their feed.');

    // -------------------------------------------------------------------------
    // TEST 7: Direct Access Protection (GET /api/assignments/:id)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Verifying Direct Assignment Fetch Protection (GET /api/assignments/:id)...');

    // 7a: Un-enrolled Student A2 attempts direct fetch
    const directFetchA2Res = await makeRequest(
      port,
      `/api/assignments/${assignmentA.id}`,
      'GET',
      undefined,
      { Authorization: `Bearer ${studentA2Token}` }
    );
    assert.strictEqual(
      directFetchA2Res.status,
      403,
      'Un-enrolled student direct assignment access must return 403 Forbidden'
    );
    assert.strictEqual(
      directFetchA2Res.data.code,
      'not_enrolled',
      'Direct fetch error code must be "not_enrolled"'
    );
    console.log('[PASS] Un-enrolled Student A2 direct fetch blocked with 403 (not_enrolled).');

    // 7b: Enrolled Student A direct fetch
    const directFetchARes = await makeRequest(
      port,
      `/api/assignments/${assignmentA.id}`,
      'GET',
      undefined,
      { Authorization: `Bearer ${studentAToken}` }
    );
    assert.strictEqual(directFetchARes.status, 200, 'Enrolled student direct fetch must succeed with 200 OK');
    assert.strictEqual(directFetchARes.data.assignment.id, assignmentA.id);
    console.log('[PASS] Enrolled Student A direct fetch succeeded with 200 OK.');

    // -------------------------------------------------------------------------
    // TEST 8: Student Phase 1 / Phase 2 Endpoints Direct Access Protection
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Verifying Student Sub-Endpoints Direct Access Protection (/api/student/*)...');

    // 8a: GET /api/student/assignments/:id/phase1
    const phase1A2Res = await makeRequest(
      port,
      `/api/student/assignments/${assignmentA.id}/phase1`,
      'GET',
      undefined,
      { Authorization: `Bearer ${studentA2Token}` }
    );
    assert.strictEqual(phase1A2Res.status, 403, 'Un-enrolled student phase1 intake must be blocked with 403');
    assert.strictEqual(phase1A2Res.data.code, 'not_enrolled');
    console.log('[PASS] Phase 1 intake blocked for un-enrolled student (403 not_enrolled).');

    // 8b: POST /api/student/assignments/:id/phase1/submit
    const phase1SubmitA2Res = await makeRequest(
      port,
      `/api/student/assignments/${assignmentA.id}/phase1/submit`,
      'POST',
      {
        code: 'def search(arr, t): return -1',
        language: 'python',
      },
      { Authorization: `Bearer ${studentA2Token}` }
    );
    assert.strictEqual(phase1SubmitA2Res.status, 403, 'Un-enrolled student phase1 submit must be blocked with 403');
    assert.strictEqual(phase1SubmitA2Res.data.code, 'not_enrolled');
    console.log('[PASS] Phase 1 submit blocked for un-enrolled student (403 not_enrolled).');

    // 8c: GET /api/student/assignments/:id/phase2
    const phase2A2Res = await makeRequest(
      port,
      `/api/student/assignments/${assignmentA.id}/phase2`,
      'GET',
      undefined,
      { Authorization: `Bearer ${studentA2Token}` }
    );
    assert.strictEqual(phase2A2Res.status, 403, 'Un-enrolled student phase2 get must be blocked with 403');
    assert.strictEqual(phase2A2Res.data.code, 'not_enrolled');
    console.log('[PASS] Phase 2 get blocked for un-enrolled student (403 not_enrolled).');

    // 8d: POST /api/student/assignments/:id/phase2/start
    const phase2StartA2Res = await makeRequest(
      port,
      `/api/student/assignments/${assignmentA.id}/phase2/start`,
      'POST',
      {},
      { Authorization: `Bearer ${studentA2Token}` }
    );
    assert.strictEqual(phase2StartA2Res.status, 403, 'Un-enrolled student phase2 start must be blocked with 403');
    assert.strictEqual(phase2StartA2Res.data.code, 'not_enrolled');
    console.log('[PASS] Phase 2 start blocked for un-enrolled student (403 not_enrolled).');

    // 8e: POST /api/student/assignments/:id/run
    const runA2Res = await makeRequest(
      port,
      `/api/student/assignments/${assignmentA.id}/run`,
      'POST',
      { code: 'print("hello")', language: 'python' },
      { Authorization: `Bearer ${studentA2Token}` }
    );
    assert.strictEqual(runA2Res.status, 403, 'Un-enrolled student code run must be blocked with 403');
    assert.strictEqual(runA2Res.data.code, 'not_enrolled');
    console.log('[PASS] Code run blocked for un-enrolled student (403 not_enrolled).');

    // 8f: Enrolled Student A accesses Phase 1
    const phase1ARes = await makeRequest(
      port,
      `/api/student/assignments/${assignmentA.id}/phase1`,
      'GET',
      undefined,
      { Authorization: `Bearer ${studentAToken}` }
    );
    assert.strictEqual(phase1ARes.status, 200, 'Enrolled student phase1 intake must succeed with 200');
    assert.strictEqual(phase1ARes.data.assignment.id, assignmentA.id);
    console.log('[PASS] Enrolled Student A phase 1 intake verified with 200 OK.');

    console.log('\n================================================================');
    console.log(' ALL MULTI-TENANCY & DATA ISOLATION TESTS PASSED PERFECTLY!');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
})();
