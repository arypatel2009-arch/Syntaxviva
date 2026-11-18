import assert from 'node:assert';
import { normalizeInstitution } from '../server/routes/classrooms.js';
import { getDatabase } from '../server/db/database.js';
import { getRepository } from '../server/repository/index.js';
import express from 'express';
import http from 'node:http';
import cookieParser from 'cookie-parser';
import { classroomsRouter } from '../server/routes/classrooms.js';
import { generateToken } from '../server/auth/jwt.js';

async function makeRequest(
  port: number,
  path: string,
  method: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode || 0, data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('=== [TEST] INSTITUTION NORMALIZATION & CLASSROOM ENROLLMENT ===\n');

  // Test 1: Unit normalization tests
  assert.strictEqual(normalizeInstitution('  Silver Oak University - Ahmedabad '), 'silveroakuniversityahmedabad');
  assert.strictEqual(normalizeInstitution('I.I.T. Bombay'), 'iitbombay');
  assert.strictEqual(normalizeInstitution('IIT-Bombay'), 'iitbombay');
  assert.strictEqual(normalizeInstitution('IIT Bombay'), 'iitbombay');
  assert.strictEqual(normalizeInstitution(null), '');
  assert.strictEqual(normalizeInstitution(undefined), '');
  console.log('✔ Test 1: normalizeInstitution unit tests passed.');

  await getDatabase();
  const repo = getRepository();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/classrooms', classroomsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  try {
    const runId = Date.now().toString(36);

    // Faculty creates classroom with "IIT Bombay"
    const facId = `fac_norm_${runId}`;
    const college = await repo.getOrCreateCollege(`IIT Bombay ${runId}`);
    await repo.upsertProfile({
      id: facId,
      email: `faculty_${runId}@iitb.ac.in`,
      full_name: 'Prof. Sharma',
      role: 'faculty',
      institution_id: `IIT Bombay ${runId}`,
      college_id: college.id,
    });
    const facToken = generateToken({
      userId: facId,
      email: `faculty_${runId}@iitb.ac.in`,
      role: 'faculty',
      name: 'Prof. Sharma',
    });

    const createRes = await makeRequest(
      port,
      '/api/classrooms',
      'POST',
      { name: `Algorithms Lab ${runId}` },
      { Authorization: `Bearer ${facToken}` }
    );
    assert.strictEqual(createRes.status, 201);
    const joinCode = createRes.data.joinCode;
    console.log(`✔ Faculty created classroom with join code: ${joinCode}`);

    // Student 1 has punctuation/case variation: "i.i.t.-bombay <runId>"
    const std1Id = `std_norm_1_${runId}`;
    await repo.upsertProfile({
      id: std1Id,
      email: `student1_${runId}@iitb.ac.in`,
      full_name: 'Rahul Patel',
      role: 'student',
      institution_id: `I.I.T.-Bombay ${runId}`, // punctuation + dash
    });
    const std1Token = generateToken({
      userId: std1Id,
      email: `student1_${runId}@iitb.ac.in`,
      role: 'student',
      name: 'Rahul Patel',
    });

    const joinRes1 = await makeRequest(
      port,
      '/api/classrooms/join',
      'POST',
      { joinCode },
      { Authorization: `Bearer ${std1Token}` }
    );
    assert.strictEqual(joinRes1.status, 200, 'Student with punctuation/dash variation should enroll successfully');
    console.log('✔ Test 2: Student with punctuation/dash variation enrolled successfully without cross-college error.');

    // Student 2 has empty institution: should auto-adopt and succeed
    const std2Id = `std_norm_2_${runId}`;
    await repo.upsertProfile({
      id: std2Id,
      email: `student2_${runId}@iitb.ac.in`,
      full_name: 'Kavita Roy',
      role: 'student',
      institution_id: null,
    });
    const std2Token = generateToken({
      userId: std2Id,
      email: `student2_${runId}@iitb.ac.in`,
      role: 'student',
      name: 'Kavita Roy',
    });

    const joinRes2 = await makeRequest(
      port,
      '/api/classrooms/join',
      'POST',
      { joinCode },
      { Authorization: `Bearer ${std2Token}` }
    );
    assert.strictEqual(joinRes2.status, 200, 'Student with empty institution should auto-adopt and succeed');
    console.log('✔ Test 3: Student with empty institution enrolled and auto-adopted college.');

    // Student 3 has genuinely different institution: "Stanford"
    const std3Id = `std_norm_3_${runId}`;
    await repo.upsertProfile({
      id: std3Id,
      email: `student3_${runId}@stanford.edu`,
      full_name: 'Bob Stanford',
      role: 'student',
      institution_id: `Stanford University ${runId}`,
    });
    const std3Token = generateToken({
      userId: std3Id,
      email: `student3_${runId}@stanford.edu`,
      role: 'student',
      name: 'Bob Stanford',
    });

    const joinRes3 = await makeRequest(
      port,
      '/api/classrooms/join',
      'POST',
      { joinCode },
      { Authorization: `Bearer ${std3Token}` }
    );
    assert.strictEqual(joinRes3.status, 403, 'Cross-college student should be blocked with 403');
    assert.strictEqual(joinRes3.data.code, 'cross_college_forbidden');
    console.log('✔ Test 4: Cross-college student was correctly rejected with 403 cross_college_forbidden.');

    console.log('\n======================================================');
    console.log('ALL INSTITUTION NORMALIZATION TESTS PASSED PERFECTLY!');
    console.log('======================================================');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
