import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/syntaxviva.sqlite');
console.log('Connecting to SQLite at:', dbPath);
const db = new Database(dbPath);

const password = 'Password@123';
const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync(password, salt);

// 1. Seed or update HOD account: hod@syntaxviva.com / rajesh.patel@syntaxviva.com
const hodAccounts = [
  {
    id: 'hod_demo_001',
    email: 'hod@syntaxviva.com',
    name: 'Dr. Rajesh Patel',
    role: 'hod',
    department: 'Computer Science & Engineering',
    employeeId: 'HOD-CSE-001',
  },
  {
    id: 'hod_demo_002',
    email: 'rajesh.patel@syntaxviva.com',
    name: 'Dr. Rajesh Patel',
    role: 'hod',
    department: 'Computer Science & Engineering',
    employeeId: 'HOD-CSE-001',
  },
];

for (const hod of hodAccounts) {
  // Check if user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(hod.email);
  const now = new Date().toISOString();

  if (existingUser) {
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, role = 'hod', department = ?, employee_id = ?, approval_status = 'APPROVED', updated_at = ?
      WHERE email = ?
    `).run(passwordHash, hod.department, hod.employeeId, now, hod.email);

    db.prepare(`
      UPDATE profiles
      SET full_name = ?, role = 'hod', department = ?, employee_id = ?, approval_status = 'APPROVED', updated_at = ?
      WHERE email = ?
    `).run(hod.name, hod.department, hod.employeeId, now, hod.email);

    console.log(`Updated HOD account: ${hod.email} (Password: ${password})`);
  } else {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, department, employee_id, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, 'hod', ?, ?, 'APPROVED', ?, ?)
    `).run(hod.id, hod.email, passwordHash, hod.department, hod.employeeId, now, now);

    db.prepare(`
      INSERT INTO profiles (id, email, full_name, role, department, employee_id, approval_status, institution_id, created_at, updated_at)
      VALUES (?, ?, ?, 'hod', ?, ?, 'APPROVED', 'SyntaxViva Engineering College', ?, ?)
    `).run(hod.id, hod.email, hod.name, hod.department, hod.employeeId, now, now);

    console.log(`Created HOD account: ${hod.email} (Password: ${password})`);
  }
}

// Check registered faculty
const facultyRows = db.prepare("SELECT id, email, full_name, department, employee_id FROM profiles WHERE role = 'faculty'").all();
console.log(`\nExisting Faculty accounts in database (${facultyRows.length}):`);
console.table(facultyRows);

// Check registered students
const studentRows = db.prepare("SELECT id, email, full_name, roll_number, class_id, department FROM profiles WHERE role = 'student' LIMIT 10").all();
console.log(`\nExisting Student accounts sample in database (${studentRows.length}):`);
console.table(studentRows);

// Check assignments
const assignments = db.prepare("SELECT id, title, created_by, created_at FROM assignments LIMIT 5").all();
console.log(`\nAssignments in database (${assignments.length}):`);
console.table(assignments);

// Check student attempts
const attempts = db.prepare("SELECT id, student_id, assignment_id, state, score FROM student_attempts LIMIT 5").all();
console.log(`\nStudent attempts in database (${attempts.length}):`);
console.table(attempts);

db.close();
console.log('\nHOD Demo setup completed successfully!');
