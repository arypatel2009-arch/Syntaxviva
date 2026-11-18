import { getDatabase, saveDatabaseToDisk, dbQuery } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';
import { MutationService } from '../server/mutation/service.ts';

async function main() {
  const db = await getDatabase();
  const repo = getRepository();

  console.log('=== Reprocessing All Attempts With Updated 3-Bug Engine ===');

  const attempts = dbQuery('SELECT * FROM student_attempts');
  console.log(`Found ${attempts.length} attempts in SQLite.`);

  const mutationService = MutationService.getInstance();

  for (const row of attempts) {
    if (!row.original_code) continue;

    console.log(`\nProcessing Attempt ${row.id} (${row.student_id}) on Assignment ${row.assignment_id}...`);
    console.log(`Original code:\n${row.original_code}`);

    // Delete existing phase2 challenge & evaluation for this attempt so it can be re-run freshly
    db.run('DELETE FROM phase2_evaluations WHERE attempt_id = ?', [row.id]);
    db.run('DELETE FROM phase2_challenges WHERE attempt_id = ?', [row.id]);

    // Reset attempt to MUTATION_READY
    await repo.updateAttempt(row.id, {
      state: 'MUTATION_READY',
      mutation_status: 'MUTATION_READY',
      repaired_code: null,
      failure_reason: null,
    });

    // Run mutation with new engine
    const mutResult = await mutationService.processAttemptMutation(row.id, {
      seed: `seed_fresh_${Date.now()}_${row.id}`,
    });

    const updated = await repo.getAttemptById(row.id);
    const isIdentical = updated?.original_code === updated?.mutated_code;
    console.log(`Result: success=${mutResult.success}, isIdentical=${isIdentical}`);
    console.log(`Mutated code:\n${updated?.mutated_code}`);

    let meta: any = null;
    try { meta = JSON.parse(updated?.mutation_metadata_json || '{}'); } catch {}
    if (meta?.bugs) {
      console.log(`Injected Bugs (${meta.bugs.length}):`);
      for (const b of meta.bugs) {
        console.log(`  - Line ${b.location?.line}: ${b.name} (${b.mutationType})`);
        console.log(`    Orig: "${b.originalFragment}"`);
        console.log(`    Mut:  "${b.mutatedFragment}"`);
      }
    }
  }

  saveDatabaseToDisk(db);
  console.log('\n=== All attempts successfully updated and saved to disk. ===');
}

main().catch(console.error);
