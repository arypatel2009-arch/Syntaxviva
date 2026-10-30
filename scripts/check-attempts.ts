import { getDatabase, dbQuery } from '../server/db/database.js';

async function check() {
  await getDatabase();
  const tables = ['assignments', 'student_attempts', 'attempt_mutations'];
  for (const t of tables) {
    const r = dbQuery('SELECT * FROM ' + t);
    const str = JSON.stringify(r);
    if (str.includes('Enter marks for')) {
      console.log('FOUND IN TABLE:', t);
      for (const row of r) {
        if (JSON.stringify(row).includes('Enter marks for')) {
          console.log('Matched row:', row.id, row.state || row.title || row.mutation_type);
          if (row.original_code) console.log('Original code snippet:', row.original_code.slice(0, 200));
          if (row.mutated_code) console.log('Mutated code snippet:', row.mutated_code.slice(0, 200));
        }
      }
    }
  }
}

check().catch(console.error);
