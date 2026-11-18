import { getDatabase, saveDatabaseToDisk, dbQuery, dbRun, dbGet } from '../server/db/database.ts';
import bcrypt from 'bcryptjs';

async function main() {
  await getDatabase();
  console.log('--- Initializing & Seeding HOD Demo Account ---');

  const password = 'Password@123';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  const hodAccounts = [
    {
      id: 'usr_hod_rajesh_patel',
      email: 'hod@syntaxviva.com',
      name: 'Dr. Rajesh Patel',
      role: 'hod',
      department: 'Computer Science & Engineering',
      employeeId: 'HOD-CSE-001',
    },
    {
      id: 'usr_hod_rajesh_patel_personal',
      email: 'rajesh.patel@syntaxviva.com',
      name: 'Dr. Rajesh Patel',
      role: 'hod',
      department: 'Computer Science & Engineering',
      employeeId: 'HOD-CSE-001',
    },
  ];

  for (const hod of hodAccounts) {
    const existing = dbGet<any>('SELECT id FROM users WHERE email = ?', [hod.email]);

    if (existing) {
      dbRun(
        `UPDATE users 
         SET password_hash = ?, role = 'hod', name = ?, department = ?, employee_id = ?, approval_status = 'APPROVED', updated_at = ?
         WHERE email = ?`,
        [passwordHash, hod.name, hod.department, hod.employeeId, now, hod.email]
      );

      dbRun(
        `UPDATE profiles
         SET full_name = ?, role = 'hod', department = ?, employee_id = ?, approval_status = 'APPROVED', institution_id = 'SyntaxViva Engineering College', updated_at = ?
         WHERE email = ?`,
        [hod.name, hod.department, hod.employeeId, now, hod.email]
      );
      console.log(`Updated HOD: ${hod.email} (Password: ${password})`);
    } else {
      dbRun(
        `INSERT INTO users (id, email, password_hash, role, name, department, employee_id, approval_status, created_at, updated_at)
         VALUES (?, ?, ?, 'hod', ?, ?, ?, 'APPROVED', ?, ?)`,
        [hod.id, hod.email, passwordHash, hod.name, hod.department, hod.employeeId, now, now]
      );

      dbRun(
        `INSERT INTO profiles (id, email, full_name, role, department, employee_id, approval_status, institution_id, created_at, updated_at)
         VALUES (?, ?, ?, 'hod', ?, ?, 'APPROVED', 'SyntaxViva Engineering College', ?, ?)`,
        [hod.id, hod.email, hod.name, hod.department, hod.employeeId, now, now]
      );
      console.log(`Created HOD: ${hod.email} (Password: ${password})`);
    }
  }

  saveDatabaseToDisk();

  // Inspect faculty
  const faculty = dbQuery<any>("SELECT id, email, full_name, department, employee_id FROM profiles WHERE role = 'faculty'");
  console.log(`\nExisting Faculty accounts in database: ${faculty.length}`);
  console.table(faculty.map(f => ({ email: f.email, name: f.full_name, dept: f.department })));

  // Inspect students
  const students = dbQuery<any>("SELECT id, email, full_name, roll_number, class_id FROM profiles WHERE role = 'student'");
  console.log(`\nExisting Student accounts in database: ${students.length}`);
  console.table(students.slice(0, 10).map(s => ({ email: s.email, name: s.full_name, roll: s.roll_number, class: s.class_id })));

  console.log('\n--- HOD Demo Account Seed Completed Successfully ---');
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
