import { getDatabase, saveDatabaseToDisk } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';
import { MutationService } from '../server/mutation/service.ts';

async function main() {
  const db = await getDatabase();
  const repo = getRepository();

  console.log('--- Migrating Database Attempts to 3 Complex Bugs ---');

  const submissions = await repo.getSubmissions();
  console.log(`Found ${submissions.length} submissions/attempts to check.`);

  const mutationService = MutationService.getInstance();

  for (const sub of submissions) {
    const attemptId = sub.id || sub.attempt_id;
    if (!attemptId) continue;

    const attempt = await repo.getAttemptById(attemptId);
    if (!attempt || !attempt.original_code) continue;

    let meta: any = null;
    try { meta = JSON.parse(attempt.mutation_metadata_json || '{}'); } catch {}

    const hasThreeBugs = meta && Array.isArray(meta.bugs) && meta.bugs.length >= 3;
    console.log(`Checking attempt ${attempt.id} (student: ${attempt.student_id}, asg: ${attempt.assignment_id}): current bugs = ${meta?.bugs?.length || 0}`);

    // If student is Ary Patel (or has fewer than 3 bugs), force upgrade & reset Phase 2 challenge!
    if (!hasThreeBugs || attempt.student_id === 'usr_ary_patel_student') {
      console.log(`  -> Upgrading attempt ${attempt.id} to 3 complex bugs...`);

      // Reset state so Phase 2 is fresh and ready
      await repo.updateAttempt(attempt.id, {
        state: 'MUTATION_READY',
        mutation_status: 'MUTATION_READY',
        repaired_code: null,
        failure_reason: null,
      });

      // Clear or reset existing Phase 2 challenge
      const existingChg = await repo.getPhase2ChallengeByAttempt(attempt.id);
      if (existingChg) {
        console.log(`  -> Resetting existing challenge ${existingChg.id} from status ${existingChg.status} to ACTIVE...`);
        // In sqlite, delete the old challenge record or reset it so a fresh 180s challenge can be created
        db.run('DELETE FROM phase2_evaluations WHERE challenge_id = ?', [existingChg.id]);
        db.run('DELETE FROM phase2_challenges WHERE id = ?', [existingChg.id]);
      }

      // Generate 3 complex bugs
      const mutRes = await mutationService.processAttemptMutation(attempt.id, {
        seed: `seed_3bugs_${Date.now()}_${attempt.student_id}`,
      });

      console.log(`  -> Mutation result: status=${mutRes.status}, bugsCount=${mutRes.metadata?.bugsCount}`);
      if (mutRes.metadata?.bugs) {
        for (const [idx, b] of mutRes.metadata.bugs.entries()) {
          console.log(`     Bug #${idx + 1} (${b.category}): ${b.name} (Line ${b.line})`);
        }
      }
    }
  }

  saveDatabaseToDisk(db);
  console.log('\n--- Migration complete. All database attempts upgraded to 3 complex bugs. ---');
}

main().catch(console.error);
