import http from 'http';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SYNTAXVIVA HOD & REGISTRATION VERIFICATION SUITE ---');

  const timestamp = Date.now();

  // Test 1: Student registration
  console.log('\n[1] Testing Student Registration...');
  const studentEmail = `student_${timestamp}@test.edu`;
  const studentRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      fullName: 'Test Student',
      email: studentEmail,
      password: 'Password@123',
      role: 'student',
      institution: 'Tech University',
      classId: 'CS 2026',
      divisionId: 'A',
      rollNumber: `ROLL-${timestamp}`,
    }
  );
  console.log('Student Registration Status:', studentRes.status, studentRes.data?.user?.email || studentRes.data);
  if (studentRes.status !== 201 && studentRes.status !== 200) {
    throw new Error('Student registration failed!');
  }

  // Test 2: Faculty Registration with Invalid Access Code
  console.log('\n[2] Testing Faculty Registration with INVALID Secret Code...');
  const badFacultyRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      fullName: 'Dr. Fake Faculty',
      email: `badfaculty_${timestamp}@test.edu`,
      password: 'Password@123',
      role: 'faculty',
      facultySecretCode: 'WRONG_SECRET_CODE',
      institution: 'Tech University',
      classId: 'CSE',
      divisionId: 'A',
    }
  );
  console.log('Bad Faculty Status (Expected 403):', badFacultyRes.status, badFacultyRes.data);
  if (badFacultyRes.status !== 403) {
    throw new Error('Faculty invalid code check failed!');
  }

  // Test 3: HOD Registration with INVALID Verification Code
  console.log('\n[3] Testing HOD Registration with INVALID Verification Code...');
  const badHodRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      fullName: 'Dr. Unverified HOD',
      email: `badhod_${timestamp}@test.edu`,
      password: 'Password@123',
      role: 'hod',
      hodVerificationCode: 'INVALID_INVITE_KEY',
      institution: 'Tech University',
      department: 'Computer Science & Engineering',
      employeeId: `HOD-FAKE-${timestamp}`,
    }
  );
  console.log('Bad HOD Status (Expected 403):', badHodRes.status, badHodRes.data);
  if (badHodRes.status !== 403) {
    throw new Error('HOD invalid verification code check failed!');
  }

  // Test 4: HOD Registration with VALID Verification Code (SYNTAX_HOD_CSE_2026)
  console.log('\n[4] Testing HOD Registration with VALID Verification Code...');
  const hodEmail = `hod_${timestamp}@test.edu`;
  const validHodRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      fullName: 'Dr. Rajesh Sharma',
      email: hodEmail,
      password: 'Password@123',
      role: 'hod',
      hodVerificationCode: 'SYNTAX_HOD_CSE_2026',
      institution: 'National Institute of Technology',
      department: 'Computer Science & Engineering',
      employeeId: `HOD-CSE-001`,
      mobileNumber: '+91 98765 43210',
      documentUrl: 'https://nit.edu/hod-appointment-2026.pdf',
    }
  );
  console.log('Valid HOD Registration Status:', validHodRes.status);
  console.log('HOD Role:', validHodRes.data?.user?.role);
  console.log('HOD Approval Status:', validHodRes.data?.profile?.approval_status || validHodRes.data?.user?.approval_status);
  if (validHodRes.status !== 201 && validHodRes.status !== 200) {
    throw new Error('HOD valid registration failed: ' + JSON.stringify(validHodRes.data));
  }
  const token = validHodRes.data?.token || validHodRes.data?.session?.access_token;

  // Test 5: Verify HOD dashboard overview BEFORE approval (must return 403 pending approval)
  console.log('\n[5] Testing HOD Overview Access BEFORE Admin Approval...');
  const preApprovalOverview = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/hod/overview',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Pre-approval Overview Status (Expected 403):', preApprovalOverview.status, preApprovalOverview.data);
  if (preApprovalOverview.status !== 403) {
    throw new Error('Security flaw: unapproved HOD was granted dashboard overview access!');
  }

  // Test 6: Approve HOD Account via Development Quick-Approve endpoint
  console.log('\n[6] Approving HOD Account via Admin/Dev Authorization...');
  const approveRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/hod/quick-approve-dev',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { hodId: validHodRes.data.user.id }
  );
  console.log('Approve Status:', approveRes.status, approveRes.data?.message);
  if (approveRes.status !== 200) {
    throw new Error('HOD approval failed!');
  }

  // Test 7: Verify HOD dashboard overview AFTER approval
  console.log('\n[7] Testing HOD Overview Access AFTER Admin Approval...');
  const postApprovalOverview = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/hod/overview',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Post-approval Overview Status (Expected 200):', postApprovalOverview.status);
  console.log('Overview Stats:', postApprovalOverview.data?.stats);
  console.log('Faculty Workload Count:', postApprovalOverview.data?.facultyWorkload?.length);
  if (postApprovalOverview.status !== 200) {
    throw new Error('Approved HOD overview failed!');
  }

  // Test 8: Verify Faculty, Students, Assignments, Audit endpoints
  console.log('\n[8] Testing HOD Sub-endpoints (Faculty, Students, Assignments, Audit Logs)...');
  const [facRes, studRes, asgRes, auditRes] = await Promise.all([
    request({ hostname: 'localhost', port: 5000, path: '/api/hod/faculty', method: 'GET', headers: { Authorization: `Bearer ${token}` } }),
    request({ hostname: 'localhost', port: 5000, path: '/api/hod/students', method: 'GET', headers: { Authorization: `Bearer ${token}` } }),
    request({ hostname: 'localhost', port: 5000, path: '/api/hod/assignments', method: 'GET', headers: { Authorization: `Bearer ${token}` } }),
    request({ hostname: 'localhost', port: 5000, path: '/api/hod/audit-logs', method: 'GET', headers: { Authorization: `Bearer ${token}` } }),
  ]);

  console.log('Faculty Endpoint Status:', facRes.status, `(${facRes.data?.faculty?.length} faculty members)`);
  console.log('Students Endpoint Status:', studRes.status, `(${studRes.data?.students?.length} students)`);
  console.log('Assignments Endpoint Status:', asgRes.status, `(${asgRes.data?.assignments?.length} assignments)`);
  console.log('Audit Logs Endpoint Status:', auditRes.status, `(${auditRes.data?.logs?.length} audit records)`);

  if (facRes.status !== 200 || studRes.status !== 200 || asgRes.status !== 200 || auditRes.status !== 200) {
    throw new Error('One or more HOD sub-endpoints failed!');
  }

  console.log('\n======================================================');
  console.log('SUCCESS: All 8 HOD and Authentication tests PASSED with 100% compliance!');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
