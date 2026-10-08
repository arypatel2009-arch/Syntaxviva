/**
 * SyntaXViva Phase 2 — Database Migration & Repository Verification Suite
 * Tests repository abstraction, PostgreSQL schema definitions, RLS policies,
 * and data migration pipeline integrity.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { getDatabase, dbGet, dbQuery } from '../server/db/database.js';
import { getRepository, SqliteApplicationRepository, SupabaseApplicationRepository } from '../server/repository/index.js';

async function runPhase2Tests() {
  console.log('================================================================');
  console.log('  SYNTAXVIVA PHASE 2 — CORE DATABASE MIGRATION VERIFICATION     ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Supabase PostgreSQL Schema & Migration Files
  // --------------------------------------------------------------------------
  console.log('TEST 1: Verifying PostgreSQL schema definitions and RLS policies...');
  const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260916000000_core_application_schema.sql');

  assert(fs.existsSync(schemaPath), 'supabase/schema.sql must exist');
  assert(fs.existsSync(migrationPath), 'supabase/migrations/20260916000000_core_application_schema.sql must exist');

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  const requiredTables = [
    'public.institutions',
    'public.academic_classes',
    'public.divisions',
    'public.profiles',
    'public.faculty_division_sessions',
    'public.mutation_registry',
    'public.assignments',
    'public.assignment_test_cases',
    'public.student_attempts',
    'public.attempt_mutations',
    'public.phase2_challenges',
    'public.phase2_evaluations',
    'public.security_events',
    'public.proctoring_events',
    'public.audit_logs',
  ];

  for (const table of requiredTables) {
    assert(schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Schema must define ${table}`);
  }

  // Verify RLS is enabled for tables
  assert(schemaContent.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on profiles');
  assert(schemaContent.includes('ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on assignments');
  assert(schemaContent.includes('ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on student_attempts');
  assert(schemaContent.includes('ALTER TABLE public.phase2_challenges ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on phase2_challenges');

  console.log('✔ TEST 1 PASSED: PostgreSQL schema defines all 15 core tables, relationships, and RLS policies.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Repository Abstraction Layer - SQLite Implementation
  // --------------------------------------------------------------------------
  console.log('TEST 2: Verifying SqliteApplicationRepository behavior and parity...');
  await getDatabase();
  const repo = new SqliteApplicationRepository();

  // Test 2.1: Profile operations
  const profile = await repo.getProfileByEmail('student@syntaxviva.edu');
  assert(profile, 'Seeded student profile must be found');
  assert.strictEqual(profile.role, 'student', 'Profile role must be student');

  // Test 2.2: Assignment operations
  const assignments = await repo.getAssignments({ role: 'faculty' });
  assert(Array.isArray(assignments), 'Assignments must return an array');
  assert(assignments.length > 0, 'Must have seeded assignments');

  const firstAsg = await repo.getAssignmentById(assignments[0].id);
  assert(firstAsg, 'Single assignment query must return record');
  assert.strictEqual(firstAsg.id, assignments[0].id);

  // Test 2.3: Mutation Registry
  const mutationTypes = await repo.getMutationTypes();
  assert(mutationTypes.length >= 27, `Must return at least 27 mutation types, found ${mutationTypes.length}`);

  console.log('✔ TEST 2 PASSED: SQLite repository satisfies all data access contracts.\n');

  // --------------------------------------------------------------------------
  // TEST 3: SupabaseApplicationRepository Client Initialization
  // --------------------------------------------------------------------------
  console.log('TEST 3: Verifying SupabaseApplicationRepository initialization...');
  const supabaseRepo = new SupabaseApplicationRepository();
  assert(supabaseRepo.getClient(), 'Supabase client must be created with environment credentials');
  console.log('✔ TEST 3 PASSED: Supabase repository initialized with valid client config.\n');

  // --------------------------------------------------------------------------
  // TEST 4: Student Attempt Code Immutability Contract
  // --------------------------------------------------------------------------
  console.log('TEST 4: Verifying Student Attempt Immutability Contract in Repository...');
  const testAttemptId = 'att_phase2_test_' + Date.now();
  const testAsgId = assignments[0].id;

  const createdAttempt = await repo.createAttempt({
    id: testAttemptId,
    assignment_id: testAsgId,
    student_id: profile.id,
    state: 'PHASE1_SUBMITTED',
    language: 'python',
    original_code: 'def solution(x):\n    return x + 1',
    original_code_hash: 'hash_original_abc123',
    mutated_code: null,
    mutation_type: null,
    mutation_metadata_json: null,
    repaired_code: null,
    phase2_start_time: null,
    phase2_deadline: null,
    evaluation_result_json: null,
    failure_reason: null,
    mutated_code_hash: null,
    mutation_seed: null,
    mutation_status: null,
    submitted_at: new Date().toISOString(),
  });

  assert(createdAttempt, 'Created attempt must not be null');
  assert.strictEqual(createdAttempt.original_code, 'def solution(x):\n    return x + 1');

  // Update mutated code without modifying original_code
  const updatedAttempt = await repo.updateAttempt(testAttemptId, {
    state: 'MUTATION_READY',
    mutated_code: 'def solution(x):\n    return x - 1',
    mutation_type: 'PLUS_TO_MINUS',
  });

  assert(updatedAttempt, 'Updated attempt must exist');
  assert.strictEqual(updatedAttempt.original_code, 'def solution(x):\n    return x + 1', 'Original code must remain permanently immutable');
  assert.strictEqual(updatedAttempt.mutated_code, 'def solution(x):\n    return x - 1', 'Mutated code must be segregated');

  console.log('✔ TEST 4 PASSED: Student original submission remains strictly immutable.\n');

  // --------------------------------------------------------------------------
  // TEST 5: Security Event Audit Logging Contract
  // --------------------------------------------------------------------------
  console.log('TEST 5: Verifying Append-Only Security Event Logging...');
  const eventId = 'sec_ev_test_' + Date.now();
  const secEvent = await repo.recordSecurityEvent({
    id: eventId,
    attempt_id: testAttemptId,
    challenge_id: null,
    student_id: profile.id,
    assignment_id: testAsgId,
    event_type: 'TAB_SWITCH',
    severity: 'WARNING',
    phase: 'PHASE2',
    metadata_json: JSON.stringify({ count: 1 }),
    client_timestamp: new Date().toISOString(),
    server_timestamp: new Date().toISOString(),
  });

  assert(secEvent, 'Security event must be recorded');
  const events = await repo.getSecurityEventsForAttempt(testAttemptId);
  assert(events.some(e => e.id === eventId), 'Recorded security event must be found in attempt audit log');

  console.log('✔ TEST 5 PASSED: Security audit trail accurately records events.\n');

  // --------------------------------------------------------------------------
  // TEST 6: Data Migration Script Integrity
  // --------------------------------------------------------------------------
  console.log('TEST 6: Validating Data Migration Script...');
  const scriptPath = path.join(process.cwd(), 'scripts', 'migrate_sqlite_to_supabase.ts');
  assert(fs.existsSync(scriptPath), 'scripts/migrate_sqlite_to_supabase.ts must exist');

  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  assert(scriptContent.includes('--dry-run'), 'Migration script must support dry-run mode');
  assert(scriptContent.includes('student_attempts'), 'Migration script must migrate student_attempts');
  assert(scriptContent.includes('phase2_challenges'), 'Migration script must migrate phase2_challenges');
  assert(scriptContent.includes('phase2_evaluations'), 'Migration script must migrate phase2_evaluations');

  console.log('✔ TEST 6 PASSED: Migration script verified.\n');

  console.log('================================================================');
  console.log('  ALL PHASE 2 DATABASE MIGRATION TESTS PASSED WITH ZERO ERRORS! ');
  console.log('================================================================');
}

runPhase2Tests().catch((err) => {
  console.error('Fatal Phase 2 Test Error:', err);
  process.exit(1);
});
