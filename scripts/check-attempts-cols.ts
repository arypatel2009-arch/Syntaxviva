import { getDatabase, dbQuery } from '../server/db/database.ts';

async function checkCols() {
  await getDatabase();
  const info = dbQuery('PRAGMA table_info(student_attempts)');
  console.log('student_attempts columns:');
  console.table(info.map((c: any) => ({ cid: c.cid, name: c.name, type: c.type })));

  const attempts = dbQuery('SELECT * FROM student_attempts LIMIT 5');
  console.log('Sample attempts:', attempts);
}

checkCols().catch(console.error);
