import { getDatabase, saveDatabaseToDisk } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';

async function main() {
  const db = await getDatabase();
  const repo = getRepository();

  await repo.updateAttempt('att_1792319231324_ujcsx', {
    state: 'MUTATION_READY',
    mutation_status: 'MUTATION_READY',
    repaired_code: null,
    failure_reason: null,
  });

  db.run('DELETE FROM phase2_evaluations WHERE challenge_id LIKE ?', ['%1792319231324%']);
  db.run('DELETE FROM phase2_challenges WHERE attempt_id = ?', ['att_1792319231324_ujcsx']);
  saveDatabaseToDisk(db);
  console.log('Reset att_1792319231324_ujcsx to fresh MUTATION_READY state.');
}

main().catch(console.error);
