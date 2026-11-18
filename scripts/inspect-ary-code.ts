import { getDatabase } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';

async function main() {
  await getDatabase();
  const repo = getRepository();
  const att = await repo.getAttemptById('att_1792319231324_ujcsx');
  console.log('Original Code:\n', att?.original_code);
  console.log('\nMutated Code:\n', att?.mutated_code);
  console.log('\nMetadata:\n', att?.mutation_metadata_json);
}
main().catch(console.error);
