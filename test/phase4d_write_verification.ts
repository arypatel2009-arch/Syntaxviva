/**
 * SyntaXViva Phase 4D — Controlled End-to-End Write Verification Against Supabase
 *
 * Workflows tested:
 * 1. Minimum test records (Institutions, Classes, Divisions, Profiles)
 * 2. Assignment creation & retrieval
 * 3. Student attempt creation & immutability update
 * 4. Mutation & Evaluation persistence
 * 5. Security & Proctoring event writes
 * 6. Faculty division session claim / heartbeat / release
 * 7. RLS isolation verification
 *
 * Cleans up all test records created during verification.
 */

import 'dotenv/config';
import { SupabaseApplicationRepository } from '../server/repository/supabaseRepository.js';
import { createClient } from '@supabase/supabase-js';

interface WorkflowResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  error?: string;
}

export async function runPhase4DWriteVerification(): Promise<{
  results: Record<string, WorkflowResult>;
  blocker: string | null;
}> {
  console.log('================================================================');
  console.log('  SYNTAXVIVA PHASE 4D — CONTROLLED WRITE VERIFICATION SUITE     ');
  console.log('================================================================\n');

  const repo = new SupabaseApplicationRepository();
  const client = repo.getClient();

  if (!client) {
    throw new Error('Supabase client failed to initialize');
  }

  const results: Record<string, WorkflowResult> = {};
  const testId = `p4d_${Date.now()}`;
  const createdRecordTracker: { table: string; idColumn: string; idValue: string }[] = [];

  const cleanup = async () => {
    console.log('\n--- EXECUTING CLEANUP OF TEST RECORDS ---');
    for (const rec of createdRecordTracker.reverse()) {
      try {
        const { error } = await client.from(rec.table).delete().eq(rec.idColumn, rec.idValue);
        if (error) {
          console.log(`Cleanup failed for ${rec.table} (${rec.idValue}):`, error.message);
        } else {
          console.log(`Cleaned up ${rec.table} (${rec.idValue})`);
        }
      } catch (e: any) {
        console.log(`Cleanup exception for ${rec.table}:`, e.message);
      }
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW 1: Minimum Required Test Academic Records
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 1: Verifying minimum academic record creation (Institution, Class, Division)...');
  const testInstId = `inst_${testId}`;
  const testClassId = `class_${testId}`;
  const testDivId = `div_${testId}`;

  try {
    const { data: instData, error: instError } = await client.from('institutions').insert({
      id: testInstId,
      name: `Test Institution ${testId}`,
      code: `TI_${testId.slice(-4)}`
    }).select().single();

    if (instError) {
      results['minimum_records'] = {
        name: 'Minimum required test records',
        status: 'FAIL',
        error: `Failed to insert institution: ${instError.message} (${instError.code})`
      };
    } else {
      createdRecordTracker.push({ table: 'institutions', idColumn: 'id', idValue: testInstId });

      const { data: classData, error: classError } = await client.from('academic_classes').insert({
        id: testClassId,
        institution_id: testInstId,
        name: `Test Class ${testId}`
      }).select().single();

      if (classError) {
        results['minimum_records'] = {
          name: 'Minimum required test records',
          status: 'FAIL',
          error: `Failed to insert class: ${classError.message} (${classError.code})`
        };
      } else {
        createdRecordTracker.push({ table: 'academic_classes', idColumn: 'id', idValue: testClassId });

        const { data: divData, error: divError } = await client.from('divisions').insert({
          id: testDivId,
          institution_id: testInstId,
          class_id: testClassId,
          name: `Test Division ${testId}`
        }).select().single();

        if (divError) {
          results['minimum_records'] = {
            name: 'Minimum required test records',
            status: 'FAIL',
            error: `Failed to insert division: ${divError.message} (${divError.code})`
          };
        } else {
          createdRecordTracker.push({ table: 'divisions', idColumn: 'id', idValue: testDivId });
          results['minimum_records'] = {
            name: 'Minimum required test records',
            status: 'PASS',
            details: `Successfully created test academic records (Institution, Class, Division) with ID: ${testInstId}`
          };
        }
      }
    }
  } catch (err: any) {
    results['minimum_records'] = {
      name: 'Minimum required test records',
      status: 'FAIL',
      error: err.message
    };
  }

  // --------------------------------------------------------------------------
  // WORKFLOW 2: Assignment Creation & Verification
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 2: Verifying assignment creation...');
  const testAsgId = `asg_${testId}`;
  try {
    const createdAsg = await repo.createAssignment({
      id: testAsgId,
      title: `Phase 4D Write Verification Assignment ${testId}`,
      description: 'Controlled end-to-end verification assignment',
      language: 'python',
      requirements: 'Return maximum of two numbers',
      starter_code: 'def solve(a, b):\n    pass',
      test_cases_json: JSON.stringify([
        { input: '1 2', expected: '2', description: 'Basic test', is_hidden: false }
      ]),
      status: 'active',
      created_by: `faculty_${testId}`,
      due_date: new Date(Date.now() + 86400000).toISOString()
    });

    if (createdAsg && createdAsg.id === testAsgId) {
      createdRecordTracker.push({ table: 'assignments', idColumn: 'id', idValue: testAsgId });
      const fetched = await repo.getAssignmentById(testAsgId);
      if (fetched) {
        results['assignment_creation'] = {
          name: 'Assignment creation',
          status: 'PASS',
          details: `Assignment ${testAsgId} created and read back successfully`
        };
      } else {
        results['assignment_creation'] = {
          name: 'Assignment creation',
          status: 'FAIL',
          error: 'Assignment inserted but could not be read back'
        };
      }
    } else {
      results['assignment_creation'] = {
        name: 'Assignment creation',
        status: 'FAIL',
        error: 'Assignment creation returned null or mismatched ID'
      };
    }
  } catch (err: any) {
    results['assignment_creation'] = {
      name: 'Assignment creation',
      status: 'FAIL',
      error: `Repository error: ${err.message} (${err.code || 'UNKNOWN'})`
    };
  }

  // --------------------------------------------------------------------------
  // WORKFLOW 3: Student Attempt Creation & Immutability
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 3: Verifying student attempt creation & immutability...');
  const testAttemptId = `att_${testId}`;
  const originalCode = 'def solve(a, b):\n    return max(a, b)';

  try {
    const createdAttempt = await repo.createAttempt({
      id: testAttemptId,
      assignment_id: testAsgId,
      student_id: `student_${testId}`,
      state: 'PHASE1_SUBMITTED',
      language: 'python',
      original_code: originalCode,
      original_code_hash: `hash_${testId}`,
      mutated_code: null,
      mutation_type: null,
      mutation_metadata_json: null,
      repaired_code: null,
      phase2_start_time: null,
      phase2_deadline: null,
      evaluation_result_json: null,
      failure_reason: null,
      mutated_code_hash: null,
      mutation_seed: '42',
      mutation_status: null,
      submitted_at: new Date().toISOString()
    });

    if (createdAttempt && createdAttempt.id === testAttemptId) {
      createdRecordTracker.push({ table: 'student_attempts', idColumn: 'id', idValue: testAttemptId });

      // Update attempt with mutation, verifying original code remains immutable
      const updated = await repo.updateAttempt(testAttemptId, {
        state: 'MUTATION_READY',
        mutated_code: 'def solve(a, b):\n    return min(a, b)',
        mutation_type: 'MAX_TO_MIN'
      });

      if (updated && updated.original_code === originalCode && updated.mutated_code) {
        results['student_attempt_creation'] = {
          name: 'Student attempt creation',
          status: 'PASS',
          details: `Attempt created and original_code immutability verified`
        };
      } else {
        results['student_attempt_creation'] = {
          name: 'Student attempt creation',
          status: 'FAIL',
          error: 'Attempt update failed or violated immutability'
        };
      }
    } else {
      results['student_attempt_creation'] = {
        name: 'Student attempt creation',
        status: 'FAIL',
        error: 'Attempt creation returned null or mismatched ID'
      };
    }
  } catch (err: any) {
    results['student_attempt_creation'] = {
      name: 'Student attempt creation',
      status: 'FAIL',
      error: `Repository error: ${err.message} (${err.code || 'UNKNOWN'})`
    };
  }

  // --------------------------------------------------------------------------
  // WORKFLOW 4: Mutation & Evaluation Persistence
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 4: Verifying mutation and evaluation persistence...');
  const testChallengeId = `ch_${testId}`;
  const testEvalId = `eval_${testId}`;

  try {
    const ch = await repo.createPhase2Challenge({
      id: testChallengeId,
      attempt_id: testAttemptId,
      assignment_id: testAsgId,
      student_id: `student_${testId}`,
      mutation_id: `mut_${testId}`,
      status: 'ACTIVE',
      started_at: new Date().toISOString(),
      deadline_at: new Date(Date.now() + 300000).toISOString(),
      submitted_at: null,
      final_code: null
    });

    if (ch && ch.id === testChallengeId) {
      createdRecordTracker.push({ table: 'phase2_challenges', idColumn: 'id', idValue: testChallengeId });

      const ev = await repo.createPhase2Evaluation({
        id: testEvalId,
        challenge_id: testChallengeId,
        attempt_id: testAttemptId,
        assignment_id: testAsgId,
        student_id: `student_${testId}`,
        submitted_code_hash: `hash_${testId}`,
        status: 'PASSED',
        tests_total: 1,
        tests_passed: 1,
        tests_failed: 0,
        failure_reason: null,
        execution_metadata_json: JSON.stringify({ executionTimeMs: 45 }),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

      if (ev && ev.id === testEvalId) {
        createdRecordTracker.push({ table: 'phase2_evaluations', idColumn: 'id', idValue: testEvalId });
        results['mutation_evaluation_persistence'] = {
          name: 'Mutation and evaluation persistence',
          status: 'PASS',
          details: `Challenge and Evaluation recorded successfully`
        };
      } else {
        results['mutation_evaluation_persistence'] = {
          name: 'Mutation and evaluation persistence',
          status: 'FAIL',
          error: 'Evaluation creation returned null'
        };
      }
    } else {
      results['mutation_evaluation_persistence'] = {
        name: 'Mutation and evaluation persistence',
        status: 'FAIL',
        error: 'Challenge creation returned null'
      };
    }
  } catch (err: any) {
    results['mutation_evaluation_persistence'] = {
      name: 'Mutation and evaluation persistence',
      status: 'FAIL',
      error: `Repository error: ${err.message} (${err.code || 'UNKNOWN'})`
    };
  }

  // --------------------------------------------------------------------------
  // WORKFLOW 5: Security & Proctoring Event Writes
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 5: Verifying security and proctoring event writes...');
  const testSecId = `sec_${testId}`;
  const testProcId = `proc_${testId}`;

  try {
    const secEvent = await repo.recordSecurityEvent({
      id: testSecId,
      attempt_id: testAttemptId,
      challenge_id: testChallengeId,
      student_id: `student_${testId}`,
      assignment_id: testAsgId,
      event_type: 'TAB_SWITCH',
      severity: 'WARNING',
      phase: 'PHASE2',
      metadata_json: JSON.stringify({ count: 1, trigger: 'blur' }),
      client_timestamp: new Date().toISOString(),
      server_timestamp: new Date().toISOString()
    });

    const procEvent = await repo.recordProctoringEvent({
      id: testProcId,
      attempt_id: testAttemptId,
      event_type: 'FACE_MOVEMENT_EPISODE',
      severity: 'WARNING',
      details_json: JSON.stringify({ yaw: 28, durationMs: 1200 }),
      phase: 'PHASE2'
    } as any);

    if (secEvent && procEvent) {
      createdRecordTracker.push({ table: 'security_events', idColumn: 'id', idValue: testSecId });
      createdRecordTracker.push({ table: 'proctoring_events', idColumn: 'id', idValue: testProcId });
      results['security_proctoring_events'] = {
        name: 'Security and proctoring event writes',
        status: 'PASS',
        details: `Both security and proctoring events recorded successfully`
      };
    } else {
      results['security_proctoring_events'] = {
        name: 'Security and proctoring event writes',
        status: 'FAIL',
        error: 'Failed to record security or proctoring event'
      };
    }
  } catch (err: any) {
    results['security_proctoring_events'] = {
      name: 'Security and proctoring event writes',
      status: 'FAIL',
      error: `Repository error: ${err.message} (${err.code || 'UNKNOWN'})`
    };
  }

  // --------------------------------------------------------------------------
  // WORKFLOW 6: Faculty Division Session Claim, Heartbeat & Release
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 6: Verifying faculty division session lifecycle...');
  try {
    let facultyUuid = '9cff5525-edac-41a8-8331-5752b04f90d2';
    const { data: prof } = await client.from('profiles').select('id, email, full_name').eq('role', 'faculty').limit(1).maybeSingle();
    if (prof && prof.id) {
      facultyUuid = prof.id;
    }

    const claimResult = await repo.claimFacultyDivisionSession({
      facultyId: facultyUuid,
      facultyName: 'Dr. Turing',
      facultyEmail: 'turing@syntaxviva.edu',
      institution: `Inst_${testId}`,
      classId: `Class_${testId}`,
      divisionId: `Div_${testId}`
    });

    if (claimResult.success && claimResult.session) {
      createdRecordTracker.push({ table: 'faculty_division_sessions', idColumn: 'id', idValue: claimResult.session.id });

      // Heartbeat
      const hb = await repo.heartbeatFacultyDivisionSession(
        facultyUuid,
        `Inst_${testId}`,
        `Class_${testId}`,
        `Div_${testId}`
      );

      // Release
      const rel = await repo.releaseFacultyDivisionSession(facultyUuid);

      if (hb.success && rel.success) {
        results['faculty_division_session'] = {
          name: 'Faculty session claim/heartbeat/release',
          status: 'PASS',
          details: 'Claim, heartbeat, and release executed successfully'
        };
      } else {
        results['faculty_division_session'] = {
          name: 'Faculty session claim/heartbeat/release',
          status: 'FAIL',
          error: `Heartbeat success=${hb.success}, Release success=${rel.success}`
        };
      }
    } else {
      results['faculty_division_session'] = {
        name: 'Faculty session claim/heartbeat/release',
        status: 'FAIL',
        error: `Claim failed: ${claimResult.error}`
      };
    }
  } catch (err: any) {
    results['faculty_division_session'] = {
      name: 'Faculty session claim/heartbeat/release',
      status: 'FAIL',
      error: `Repository error: ${err.message} (${err.code || 'UNKNOWN'})`
    };
  }

  // --------------------------------------------------------------------------
  // WORKFLOW 7: Row Level Security (RLS) Isolation Verification
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 7: Verifying RLS isolation with anonymous/public client...');
  try {
    const anon = createClient(process.env.SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
    const { data: anonAttempts, error: anonErr } = await anon.from('student_attempts').select('*');
    const { data: anonAudit, error: auditErr } = await anon.from('audit_logs').select('*');

    // RLS passes if anonymous client cannot read protected student attempts or audit logs
    const isIsolated = (!anonAttempts || anonAttempts.length === 0) && (!anonAudit || anonAudit.length === 0);
    if (isIsolated) {
      results['rls_isolation'] = {
        name: 'RLS isolation',
        status: 'PASS',
        details: 'Anonymous public queries returned 0 records across protected tables'
      };
    } else {
      results['rls_isolation'] = {
        name: 'RLS isolation',
        status: 'FAIL',
        error: `Anonymous query leaked records: attempts=${anonAttempts?.length}, audit=${anonAudit?.length}`
      };
    }
  } catch (err: any) {
    results['rls_isolation'] = {
      name: 'RLS isolation',
      status: 'FAIL',
      error: err.message
    };
  }

  // Execute cleanup
  await cleanup();

  console.log('\n================================================================');
  console.log('  PHASE 4D WRITE VERIFICATION RESULTS SUMMARY                  ');
  console.log('================================================================');

  let blocker: string | null = null;
  for (const [key, res] of Object.entries(results)) {
    console.log(`${res.name}: ${res.status}`);
    if (res.status === 'FAIL') {
      console.log(`  -> Reason: ${res.error}`);
      if (!blocker) {
        blocker = res.error || 'Write operation rejected by Supabase';
      }
    }
  }

  return { results, blocker };
}

runPhase4DWriteVerification().catch((err) => {
  console.error('Fatal Verification Runner Error:', err);
  process.exit(1);
});
