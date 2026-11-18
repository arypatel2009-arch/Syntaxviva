import { getDatabase, dbQuery, dbGet } from '../server/db/database.ts';

async function inspect() {
  await getDatabase();
  console.log('=== INSPECTING CURRENT DATABASE ASSETS ===');

  // 1. Departments in DB (from profiles, users, classrooms, colleges)
  const departmentsInProfiles = dbQuery<{ dept: string }>(
    `SELECT DISTINCT department as dept FROM profiles WHERE department IS NOT NULL AND TRIM(department) != ''`
  );
  const departmentsInUsers = dbQuery<{ dept: string }>(
    `SELECT DISTINCT department as dept FROM users WHERE department IS NOT NULL AND TRIM(department) != ''`
  );
  const classesInProfiles = dbQuery<{ class_id: string }>(
    `SELECT DISTINCT class_id FROM profiles WHERE class_id IS NOT NULL AND TRIM(class_id) != ''`
  );
  console.log('Departments in profiles:', departmentsInProfiles);
  console.log('Departments in users:', departmentsInUsers);
  console.log('Class IDs in profiles:', classesInProfiles);

  // 2. Count of users by role
  const roleCounts = dbQuery<{ role: string; count: number }>(
    `SELECT role, COUNT(*) as count FROM profiles GROUP BY role`
  );
  console.log('\nRole counts in profiles:', roleCounts);

  // 3. Assignments
  const assignments = dbQuery<any>(
    `SELECT a.id, a.title, a.language, a.created_by, a.due_date, p.full_name as creator_name
     FROM assignments a
     LEFT JOIN profiles p ON p.id = a.created_by`
  );
  console.log(`\nTotal Assignments (${assignments.length}):`);
  console.table(assignments.slice(0, 10));

  // 4. Student Attempts
  const attempts = dbQuery<any>(
    `SELECT sa.id, sa.student_id, sa.assignment_id, sa.state, sa.score, sa.submitted_at, sa.created_at
     FROM student_attempts sa`
  );
  console.log(`\nTotal Student Attempts (${attempts.length}):`);
  console.table(attempts.slice(0, 10));

  // 5. Check if attempts have dates
  const attemptDates = dbQuery<any>(
    `SELECT substr(created_at, 1, 7) as month, count(*) as count FROM student_attempts GROUP BY month`
  );
  console.log('\nAttempts by month:', attemptDates);
}

inspect().catch(console.error);
