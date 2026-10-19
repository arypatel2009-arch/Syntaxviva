import { isProfileComplete, getAuthRedirectUrl } from '../src/context/AuthContext.js';
import { getRepository, initRepository } from '../server/repository/index.js';
import { getDatabase } from '../server/db/database.js';

async function runAuthProfileVerificationSuite() {
  console.log('=== [SyntaXViva] AUTHENTICATION & PROFILE VERIFICATION SUITE ===\n');

  // Test 1: Verify getAuthRedirectUrl dynamic URL construction
  console.log('Test 1: Testing getAuthRedirectUrl callback path formatting...');
  const redirectUrl = getAuthRedirectUrl('/email-verified');
  console.log('Generated redirect URL:', redirectUrl);
  if (!redirectUrl || !redirectUrl.includes('/email-verified')) {
    throw new Error('Test 1 Failed: Invalid redirect URL generated.');
  }
  console.log('✔ Test 1 Passed: Redirect URL construction verified.\n');

  // Test 2: Verify isProfileComplete helper logic for Student
  console.log('Test 2: Testing student profile completeness criteria...');
  const incompleteStudentUser: any = {
    id: 'test-student-1',
    name: 'Test Student',
    email: 'student@example.com',
    role: 'student',
    institution: 'Tech Institute',
    rollNumber: '', // missing roll number
    classId: 'Batch 2025',
    divisionId: 'Div A',
  };

  const isIncomplete = isProfileComplete(incompleteStudentUser, null, 'student');
  if (isIncomplete !== false) {
    throw new Error('Test 2 Failed: Student profile without roll number should be reported as incomplete.');
  }

  const completeStudentUser: any = {
    ...incompleteStudentUser,
    rollNumber: '101',
  };

  const isComplete = isProfileComplete(completeStudentUser, null, 'student');
  if (isComplete !== true) {
    throw new Error('Test 2 Failed: Student profile with all required fields should be reported as complete.');
  }
  console.log('✔ Test 2 Passed: Student profile completeness criteria verified.\n');

  // Test 3: Verify isProfileComplete helper logic for Faculty
  console.log('Test 3: Testing faculty profile completeness criteria...');
  const incompleteFaculty: any = {
    id: 'test-faculty-1',
    name: '', // missing name
    email: 'faculty@example.com',
    role: 'faculty',
    institution: 'Tech Institute',
  };

  if (isProfileComplete(incompleteFaculty, null, 'faculty') !== false) {
    throw new Error('Test 3 Failed: Faculty profile without name should be reported as incomplete.');
  }

  const completeFaculty: any = {
    ...incompleteFaculty,
    name: 'Dr. Smith',
  };

  if (isProfileComplete(completeFaculty, null, 'faculty') !== true) {
    throw new Error('Test 3 Failed: Faculty profile with name and institution should be reported as complete.');
  }
  console.log('✔ Test 3 Passed: Faculty profile completeness criteria verified.\n');

  // Test 4: Repository Profile Persistence & Photo Update
  console.log('Test 4: Testing Repository profile persistence and avatar photo update...');
  await getDatabase();
  await initRepository();
  const repo = getRepository();

  const testProfileId = 'test-profile-verification-uuid';
  await repo.upsertProfile({
    id: testProfileId,
    email: 'verify@syntaxviva.com',
    full_name: 'Verification User',
    role: 'student',
    institution_id: 'SyntaXViva University',
    roll_number: 'CS-99',
    class_id: '2026',
    division_id: 'Sec-A',
    avatar_url: null,
    status: 'active',
  });

  let fetchedProfile = await repo.getProfileById(testProfileId);
  if (!fetchedProfile || fetchedProfile.avatar_url !== null) {
    throw new Error('Test 4 Failed: Initial profile setup failed.');
  }

  // Update profile photo
  const newPhotoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await repo.updateProfile(testProfileId, {
    avatar_url: newPhotoUrl,
  });

  fetchedProfile = await repo.getProfileById(testProfileId);
  if (!fetchedProfile || fetchedProfile.avatar_url !== newPhotoUrl) {
    throw new Error('Test 4 Failed: Profile photo was not persisted in database.');
  }
  console.log('✔ Test 4 Passed: Profile persistence and photo update verified in database.\n');

  console.log('====================================================');
  console.log('ALL AUTHENTICATION & PROFILE TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runAuthProfileVerificationSuite().catch((err) => {
  console.error('\n✖ Suite Failed:', err);
  process.exit(1);
});
