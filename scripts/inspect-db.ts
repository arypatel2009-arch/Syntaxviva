import { getDatabase } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';

async function main() {
  await getDatabase();
  const repo = getRepository();
  const assignments = await repo.getAssignments();
  console.log('Assignments count:', assignments.length);
  for (const a of assignments) {
    console.log(`- [${a.id}] ${a.title} (phase2_unlocked: ${a.phase2_unlocked || a.phase2Unlocked})`);
  }

  const submissions = await repo.getSubmissions();
  console.log('\nSubmissions / attempts count:', submissions.length);
  for (const sub of submissions) {
    const attempt = await repo.getAttemptById(sub.id || sub.attempt_id);
    let meta: any = null;
    try { meta = JSON.parse(attempt?.mutation_metadata_json || '{}'); } catch {}
    const chg = await repo.getPhase2ChallengeByAttempt(attempt!.id);
    console.log(`Attempt: ${attempt?.id} | student: ${attempt?.student_id} | asg: ${attempt?.assignment_id} | state: ${attempt?.state} | mut_status: ${attempt?.mutation_status} | bugs: ${meta?.bugs?.length || 0} | challenge: ${chg ? chg.status : 'NONE'}`);
  }
}

main().catch(console.error);
