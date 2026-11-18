/**
 * SyntaXViva Core V1 — Part 3 End-to-End Submission & Mutation Flow Test
 */

import { getDatabase, dbGet, dbQuery, dbRun, saveDatabaseToDisk } from '../server/db/database.js';
import { MutationService } from '../server/mutation/service.js';
import { computeCodeHash } from '../server/mutation/hasher.js';

async function testPhase1MutationE2E() {
  console.log('Testing End-to-End Phase 1 Submission -> Mutation Flow...\n');
  await getDatabase();

  const now = new Date().toISOString();
  const testAssignmentId = `asg_test_${Date.now()}`;
  const testStudentId = `usr_stud_${Date.now()}`;

  // 1. Create student and assignment
  dbRun(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
     VALUES (?, 'Test Student', ?, 'hash123', 'student', ?, ?)`,
    [testStudentId, `student_${Date.now()}@syntaxviva.edu`, now, now]
  );

  dbRun(
    `INSERT INTO assignments (
       id, title, description, language, requirements, starter_code,
       test_cases_json, status, created_by, created_at, updated_at
     ) VALUES (?, 'Two Sum Problem', 'Find indices that sum to target', 'python', 'O(n) or O(n^2)', 'def two_sum(nums, target): pass', '[]', 'active', 'usr_faculty_1', ?, ?)`,
    [testAssignmentId, now, now]
  );

  // 2. Insert initial Phase 1 submission
  const attemptId = `att_test_${Date.now()}`;
  const samplePyCode = `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
`;

  const origHash = computeCodeHash(samplePyCode);

  dbRun(
    `INSERT INTO student_attempts (
       id, assignment_id, student_id, state, language, original_code,
       original_code_hash, mutated_code, mutation_type, mutation_metadata_json,
       mutation_status, repaired_code, submitted_at, created_at, updated_at
     ) VALUES (?, ?, ?, 'PHASE1_SUBMITTED', 'python', ?, ?, NULL, NULL, NULL, 'PROCESSING', NULL, ?, ?, ?)`,
    [attemptId, testAssignmentId, testStudentId, samplePyCode, origHash, now, now, now]
  );
  saveDatabaseToDisk();

  // 3. Run MutationService
  const mutationService = MutationService.getInstance();
  const mutRes = await mutationService.processAttemptMutation(attemptId, { seed: 'audit_seed_456' });

  console.log('Mutation result success:', mutRes.success);
  console.log('Mutation type:', mutRes.mutationType);

  // 4. Verify student_attempts in SQLite
  const row = dbGet<any>(
    `SELECT id, state, language, original_code, original_code_hash, mutated_code, 
            mutated_code_hash, mutation_type, mutation_status, failure_reason 
     FROM student_attempts WHERE id = ?`,
    [attemptId]
  );

  if (!row) throw new Error('Attempt not found in DB');

  console.log('Attempt state:', row.state);
  console.log('Mutation status:', row.mutation_status);
  console.log('Original code preserved?', row.original_code === samplePyCode);
  console.log('Original hash matches?', row.original_code_hash === origHash);
  console.log('Mutated code distinct?', row.mutated_code !== samplePyCode && row.mutated_code.length > 0);
  console.log('Mutated hash distinct?', row.mutated_code_hash !== origHash);

  // 5. Verify attempt_mutations audit table
  const auditRows = dbQuery<any>(
    `SELECT id, attempt_id, mutation_type, status, original_code_hash, mutated_code_hash 
     FROM attempt_mutations WHERE attempt_id = ?`,
    [attemptId]
  );
  console.log('Audit records count:', auditRows.length);
  console.log('Audit record status:', auditRows[0]?.status);

  // 6. Test broken code handling
  const brokenAttemptId = `att_broken_${Date.now()}`;
  const brokenCode = `def bad_syntax(:\n   return\n`;
  const brokenHash = computeCodeHash(brokenCode);

  dbRun(
    `INSERT INTO student_attempts (
       id, assignment_id, student_id, state, language, original_code,
       original_code_hash, mutated_code, mutation_type, mutation_metadata_json,
       mutation_status, repaired_code, submitted_at, created_at, updated_at
     ) VALUES (?, ?, ?, 'PHASE1_SUBMITTED', 'python', ?, ?, NULL, NULL, NULL, 'PROCESSING', NULL, ?, ?, ?)`,
    [brokenAttemptId, testAssignmentId, testStudentId, brokenCode, brokenHash, now, now, now]
  );

  const brokenRes = await mutationService.processAttemptMutation(brokenAttemptId);
  console.log('Broken submission success:', brokenRes.success);
  console.log('Broken submission status:', brokenRes.status);

  const brokenRow = dbGet<any>(
    `SELECT state, mutation_status, mutated_code, failure_reason 
     FROM student_attempts WHERE id = ?`,
    [brokenAttemptId]
  );
  console.log('Broken attempt state:', brokenRow.state);
  console.log('Broken attempt mutated_code is NULL?', brokenRow.mutated_code === null);
  console.log('Broken failure reason:', brokenRow.failure_reason);

  if (
    row.state === 'MUTATION_READY' &&
    row.original_code === samplePyCode &&
    row.mutated_code !== samplePyCode &&
    auditRows.length > 0 &&
    brokenRow.state === 'MUTATION_PROCESSING_FAILED' &&
    brokenRow.mutated_code === null
  ) {
    console.log('\n🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n❌ End-to-end verification failed.');
    process.exit(1);
  }
}

testPhase1MutationE2E().catch((err) => {
  console.error(err);
  process.exit(1);
});
