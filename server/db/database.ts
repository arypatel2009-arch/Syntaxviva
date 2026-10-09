import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { UserRole } from '../../src/types/index.js';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'syntaxviva.sqlite');

import { INITIAL_105_MUTATIONS } from '../mutation/registry.js';

export const INITIAL_MUTATION_TYPES = INITIAL_105_MUTATIONS;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing SQLite file, initializing fresh:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  await initSchemaAndSeed(dbInstance);
  saveDatabaseToDisk(dbInstance);

  return dbInstance;
}

export function saveDatabaseToDisk(db?: Database): void {
  const target = db || dbInstance;
  if (!target) return;

  try {
    const data = target.export();
    const buffer = Buffer.from(data);
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

async function initSchemaAndSeed(db: Database): Promise<void> {
  // 1. Ensure basic tables exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('faculty', 'student', 'admin')),
      institution TEXT,
      roll_number TEXT,
      class_id TEXT,
      division_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('faculty', 'student', 'admin')),
      institution_id TEXT,
      roll_number TEXT,
      class_id TEXT,
      division_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      institution TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      inquiry_type TEXT NOT NULL,
      expected_usage TEXT NOT NULL,
      preferred_time TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'CONTACTED', 'CLOSED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Ensure academic columns exist on existing SQLite databases BEFORE creating indexes
  try {
    const usersTableInfo = db.exec("PRAGMA table_info(users)");
    if (usersTableInfo && usersTableInfo[0]) {
      const userCols = usersTableInfo[0].values.map((r) => r[1] as string);
      if (!userCols.includes('institution')) db.run('ALTER TABLE users ADD COLUMN institution TEXT');
      if (!userCols.includes('roll_number')) db.run('ALTER TABLE users ADD COLUMN roll_number TEXT');
      if (!userCols.includes('class_id')) db.run('ALTER TABLE users ADD COLUMN class_id TEXT');
      if (!userCols.includes('division_id')) db.run('ALTER TABLE users ADD COLUMN division_id TEXT');
    }

    const profilesTableInfo = db.exec("PRAGMA table_info(profiles)");
    if (profilesTableInfo && profilesTableInfo[0]) {
      const profCols = profilesTableInfo[0].values.map((r) => r[1] as string);
      if (!profCols.includes('institution_id')) db.run('ALTER TABLE profiles ADD COLUMN institution_id TEXT');
      if (!profCols.includes('roll_number')) db.run('ALTER TABLE profiles ADD COLUMN roll_number TEXT');
      if (!profCols.includes('class_id')) db.run('ALTER TABLE profiles ADD COLUMN class_id TEXT');
      if (!profCols.includes('division_id')) db.run('ALTER TABLE profiles ADD COLUMN division_id TEXT');
      if (!profCols.includes('status')) db.run("ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    }
  } catch (err) {
    console.warn('Migration note for academic columns:', err);
  }

  // 3. Execute remaining schema definitions and indexes
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_academic_unique ON profiles(institution_id, class_id, division_id, roll_number) WHERE role = 'student' AND roll_number IS NOT NULL;

    CREATE TABLE IF NOT EXISTS faculty_division_sessions (
      id TEXT PRIMARY KEY,
      faculty_id TEXT NOT NULL,
      faculty_name TEXT NOT NULL,
      faculty_email TEXT NOT NULL,
      institution TEXT NOT NULL,
      class_id TEXT NOT NULL,
      division_id TEXT NOT NULL,
      last_heartbeat TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (faculty_id) REFERENCES users(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_div_unique ON faculty_division_sessions(institution, class_id, division_id);
    CREATE INDEX IF NOT EXISTS idx_faculty_div_faculty ON faculty_division_sessions(faculty_id);

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      language TEXT NOT NULL,
      requirements TEXT NOT NULL,
      starter_code TEXT NOT NULL,
      test_cases_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      phase2_unlocked INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS student_attempts (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'CREATED',
      language TEXT,
      original_code TEXT,
      mutated_code TEXT,
      mutation_type TEXT,
      mutation_metadata_json TEXT,
      repaired_code TEXT,
      phase2_start_time TEXT,
      phase2_deadline TEXT,
      evaluation_result_json TEXT,
      failure_reason TEXT,
      original_code_hash TEXT,
      mutated_code_hash TEXT,
      mutation_seed TEXT,
      mutation_status TEXT,
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attempt_mutations (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      mutation_type TEXT NOT NULL,
      mutation_version TEXT NOT NULL DEFAULT '1.0.0',
      mutation_seed TEXT,
      original_code_hash TEXT NOT NULL,
      mutated_code TEXT,
      mutated_code_hash TEXT,
      mutation_metadata_json TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES student_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS mutation_registry (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proctoring_events (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
      phase TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES student_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
      phase TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES student_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS phase2_challenges (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL,
      mutation_id TEXT,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      deadline_at TEXT NOT NULL,
      submitted_at TEXT,
      final_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (attempt_id) REFERENCES student_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS phase2_evaluations (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      submitted_code_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('EVALUATING', 'PASSED', 'FAILED', 'ERROR')),
      tests_total INTEGER NOT NULL DEFAULT 0,
      tests_passed INTEGER NOT NULL DEFAULT 0,
      tests_failed INTEGER NOT NULL DEFAULT 0,
      failure_reason TEXT,
      execution_metadata_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (challenge_id) REFERENCES phase2_challenges(id),
      FOREIGN KEY (attempt_id) REFERENCES student_attempts(id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    );

    DROP TABLE IF EXISTS faculty_authorization_codes;

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
    CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON student_attempts(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_attempts_assignment ON student_attempts(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_student_attempts_assignment_student ON student_attempts(assignment_id, student_id);
    CREATE INDEX IF NOT EXISTS idx_mutation_registry_code ON mutation_registry(code);
    CREATE INDEX IF NOT EXISTS idx_phase2_challenges_attempt ON phase2_challenges(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_phase2_challenges_student_asg ON phase2_challenges(student_id, assignment_id);
    CREATE INDEX IF NOT EXISTS idx_phase2_evaluations_challenge ON phase2_evaluations(challenge_id);
    CREATE INDEX IF NOT EXISTS idx_phase2_evaluations_attempt ON phase2_evaluations(attempt_id);
  `);

  // Safe migration for existing student_attempts tables
  try {
    const tableInfo = db.exec("PRAGMA table_info(student_attempts)");
    if (tableInfo && tableInfo[0]) {
      const colNames = tableInfo[0].values.map((row) => row[1] as string);
      if (!colNames.includes('language')) {
        db.run('ALTER TABLE student_attempts ADD COLUMN language TEXT');
      }
      if (!colNames.includes('submitted_at')) {
        db.run('ALTER TABLE student_attempts ADD COLUMN submitted_at TEXT');
      }
      if (!colNames.includes('original_code_hash')) {
        db.run('ALTER TABLE student_attempts ADD COLUMN original_code_hash TEXT');
      }
      if (!colNames.includes('mutated_code_hash')) {
        db.run('ALTER TABLE student_attempts ADD COLUMN mutated_code_hash TEXT');
      }
      if (!colNames.includes('mutation_seed')) {
        db.run('ALTER TABLE student_attempts ADD COLUMN mutation_seed TEXT');
      }
      if (!colNames.includes('mutation_status')) {
        db.run('ALTER TABLE student_attempts ADD COLUMN mutation_status TEXT');
      }
    }
  } catch (err) {
    console.warn('Migration note for student_attempts:', err);
  }

  // Safe migration for existing assignments table (Faculty 1-click Phase 2 Unlock)
  try {
    const asgTableInfo = db.exec("PRAGMA table_info(assignments)");
    if (asgTableInfo && asgTableInfo[0]) {
      const asgCols = asgTableInfo[0].values.map((row) => row[1] as string);
      if (!asgCols.includes('phase2_unlocked')) {
        db.run('ALTER TABLE assignments ADD COLUMN phase2_unlocked INTEGER NOT NULL DEFAULT 0');
      }
    }
  } catch (err) {
    console.warn('Migration note for assignments:', err);
  }

  // Safe migration for academic identity columns on users and profiles
  try {
    const usersTableInfo = db.exec("PRAGMA table_info(users)");
    if (usersTableInfo && usersTableInfo[0]) {
      const userCols = usersTableInfo[0].values.map((r) => r[1] as string);
      if (!userCols.includes('roll_number')) db.run('ALTER TABLE users ADD COLUMN roll_number TEXT');
      if (!userCols.includes('class_id')) db.run('ALTER TABLE users ADD COLUMN class_id TEXT');
      if (!userCols.includes('division_id')) db.run('ALTER TABLE users ADD COLUMN division_id TEXT');
    }

    const profilesTableInfo = db.exec("PRAGMA table_info(profiles)");
    if (profilesTableInfo && profilesTableInfo[0]) {
      const profCols = profilesTableInfo[0].values.map((r) => r[1] as string);
      if (!profCols.includes('roll_number')) db.run('ALTER TABLE profiles ADD COLUMN roll_number TEXT');
      if (!profCols.includes('class_id')) db.run('ALTER TABLE profiles ADD COLUMN class_id TEXT');
      if (!profCols.includes('division_id')) db.run('ALTER TABLE profiles ADD COLUMN division_id TEXT');
    }
  } catch (err) {
    console.warn('Migration note for academic columns:', err);
  }

  // Safe migration for security_events table
  try {
    const secTableInfo = db.exec("PRAGMA table_info(security_events)");
    if (secTableInfo && secTableInfo[0]) {
      const colNames = secTableInfo[0].values.map((row) => row[1] as string);
      if (!colNames.includes('challenge_id')) {
        db.run('ALTER TABLE security_events ADD COLUMN challenge_id TEXT');
      }
      if (!colNames.includes('student_id')) {
        db.run('ALTER TABLE security_events ADD COLUMN student_id TEXT');
      }
      if (!colNames.includes('assignment_id')) {
        db.run('ALTER TABLE security_events ADD COLUMN assignment_id TEXT');
      }
      if (!colNames.includes('client_timestamp')) {
        db.run('ALTER TABLE security_events ADD COLUMN client_timestamp TEXT');
      }
      if (!colNames.includes('server_timestamp')) {
        db.run('ALTER TABLE security_events ADD COLUMN server_timestamp TEXT');
      }
    }
  } catch (err) {
    console.warn('Migration note for security_events:', err);
  }

  // Populate deterministic test cases for existing assignments that lack them
  try {
    const largestNumTests = JSON.stringify([
      { input: "5 10\n", expected: "10", description: "Second number is larger", is_hidden: false },
      { input: "20 7\n", expected: "20", description: "First number is larger", is_hidden: false },
      { input: "15 15\n", expected: "15", description: "Equal numbers", is_hidden: false },
      { input: "-4 -10\n", expected: "-4", description: "Both negative numbers", is_hidden: true },
      { input: "0 0\n", expected: "0", description: "Zeros", is_hidden: true },
      { input: "-50 50\n", expected: "50", description: "Negative and positive", is_hidden: true },
      { input: "1000000 999999\n", expected: "1000000", description: "Large integers", is_hidden: true },
    ]);

    const parkingFeeTests = JSON.stringify([
      { input: "1\n", expected: "Total Parking Fee: ₹ 20", description: "Tier 1: 1 hour (<= 2 hrs @ ₹20/hr)", is_hidden: false },
      { input: "2\n", expected: "Total Parking Fee: ₹ 40", description: "Tier 1 boundary: 2 hours", is_hidden: false },
      { input: "3\n", expected: "Total Parking Fee: ₹ 70", description: "Tier 2: 3 hours (2 hrs @ ₹20 + 1 hr @ ₹30)", is_hidden: false },
      { input: "4\n", expected: "Total Parking Fee: ₹ 100", description: "Tier 2: 4 hours", is_hidden: true },
      { input: "5\n", expected: "Total Parking Fee: ₹ 130", description: "Tier 2 boundary: 5 hours", is_hidden: true },
      { input: "6\n", expected: "Total Parking Fee: ₹ 180", description: "Tier 3: 6 hours (2@20 + 3@30 + 1@50)", is_hidden: true },
      { input: "8\n", expected: "Total Parking Fee: ₹ 280", description: "Tier 3: 8 hours", is_hidden: true },
    ]);

    db.run(
      `UPDATE assignments 
       SET test_cases_json = ? 
       WHERE (title LIKE '%parking%' OR title LIKE '%fee%')
         AND (test_cases_json IS NULL OR test_cases_json = '' OR test_cases_json = '[]')`,
      [parkingFeeTests]
    );

    db.run(
      `UPDATE assignments
       SET due_date = '2026-10-20'
       WHERE due_date IS NULL OR TRIM(due_date) = ''`
    );
  } catch (err) {
    console.warn('Migration note for deterministic test cases:', err);
  }

  // Seed default mutation types if incomplete
  const res = db.exec('SELECT COUNT(*) as count FROM mutation_registry');
  const count = (res[0]?.values[0]?.[0] as number) ?? 0;

  if (count < INITIAL_MUTATION_TYPES.length) {
    const now = new Date().toISOString();
    for (const item of INITIAL_MUTATION_TYPES) {
      db.run(
        `INSERT OR IGNORE INTO mutation_registry (id, code, name, category, description, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [`mut_${item.code.toLowerCase()}`, item.code, item.name, item.category, item.description, now]
      );
    }
  }

  // Zero Initial Data Policy:
  // No fake or demo users or assignments are seeded. Real users register or authenticate,
  // and real faculty create assignments dynamically.
}

// Database helper utilities with typed execution
export function dbQuery<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized. Call getDatabase() first.');

  const stmt = dbInstance.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function dbGet<T = any>(sql: string, params: any[] = []): T | null {
  const rows = dbQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function dbRun(sql: string, params: any[] = []): { changes: number } {
  if (!dbInstance) throw new Error('Database not initialized. Call getDatabase() first.');

  dbInstance.run(sql, params);
  const changes = dbInstance.getRowsModified();
  saveDatabaseToDisk(dbInstance);
  return { changes };
}

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'faculty' | 'admin';
  institution_id: string | null;
  roll_number: string | null;
  class_id: string | null;
  division_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FacultyDivisionSessionRow {
  id: string;
  faculty_id: string;
  faculty_name: string;
  faculty_email: string;
  institution: string;
  class_id: string;
  division_id: string;
  last_heartbeat: string;
  expires_at: string;
  created_at: string;
}

export function getProfileById(id: string): ProfileRow | null {
  return dbGet<ProfileRow>('SELECT * FROM profiles WHERE id = ?', [id]);
}

export function getProfileByEmail(email: string): ProfileRow | null {
  return dbGet<ProfileRow>('SELECT * FROM profiles WHERE lower(email) = lower(?)', [email.trim()]);
}

export function getStudentByAcademicRoll(
  institution: string,
  classId: string,
  divisionId: string,
  rollNumber: string
): ProfileRow | null {
  return dbGet<ProfileRow>(
    `SELECT * FROM profiles 
     WHERE role = 'student' 
       AND lower(institution_id) = lower(?) 
       AND lower(class_id) = lower(?) 
       AND lower(division_id) = lower(?) 
       AND lower(roll_number) = lower(?)`,
    [institution.trim(), classId.trim(), divisionId.trim(), rollNumber.trim()]
  );
}

export function upsertProfile(data: {
  id: string;
  email: string;
  full_name: string;
  role?: 'student' | 'faculty' | 'admin';
  institution_id?: string | null;
  roll_number?: string | null;
  class_id?: string | null;
  division_id?: string | null;
  status?: string;
}): ProfileRow {
  const existing = getProfileById(data.id) || getProfileByEmail(data.email);
  const now = new Date().toISOString();
  if (existing) {
    if (existing.id !== data.id) {
      // Migrate legacy ID to authenticated Supabase user ID (auth.users.id)
      dbRun(
        `UPDATE profiles SET 
          id = ?, 
          email = ?, 
          full_name = ?, 
          role = COALESCE(?, role),
          institution_id = COALESCE(?, institution_id),
          roll_number = COALESCE(?, roll_number),
          class_id = COALESCE(?, class_id),
          division_id = COALESCE(?, division_id),
          updated_at = ? 
        WHERE id = ?`,
        [
          data.id,
          data.email.toLowerCase(),
          data.full_name,
          data.role && ['faculty', 'admin', 'student'].includes(data.role) ? data.role : null,
          data.institution_id || null,
          data.roll_number || null,
          data.class_id || null,
          data.division_id || null,
          now,
          existing.id,
        ]
      );
      // Migrate foreign key references to maintain unbroken user history
      dbRun(`UPDATE student_attempts SET student_id = ? WHERE student_id = ?`, [data.id, existing.id]);
      dbRun(`UPDATE phase2_challenges SET student_id = ? WHERE student_id = ?`, [data.id, existing.id]);
      dbRun(`UPDATE assignments SET created_by = ? WHERE created_by = ?`, [data.id, existing.id]);
      dbRun(
        `UPDATE users SET 
          id = ?,
          role = COALESCE(?, role),
          roll_number = COALESCE(?, roll_number),
          class_id = COALESCE(?, class_id),
          division_id = COALESCE(?, division_id)
        WHERE id = ?`,
        [
          data.id,
          data.role && ['faculty', 'admin', 'student'].includes(data.role) ? data.role : null,
          data.roll_number || null,
          data.class_id || null,
          data.division_id || null,
          existing.id,
        ]
      );
      saveDatabaseToDisk();
      return getProfileById(data.id)!;
    } else {
      dbRun(
        `UPDATE profiles SET 
          email = ?, 
          full_name = ?, 
          role = COALESCE(?, role),
          institution_id = COALESCE(?, institution_id),
          roll_number = COALESCE(?, roll_number),
          class_id = COALESCE(?, class_id),
          division_id = COALESCE(?, division_id),
          updated_at = ? 
        WHERE id = ?`,
        [
          data.email.toLowerCase(),
          data.full_name,
          data.role && ['faculty', 'admin', 'student'].includes(data.role) ? data.role : null,
          data.institution_id || null,
          data.roll_number || null,
          data.class_id || null,
          data.division_id || null,
          now,
          existing.id,
        ]
      );
      dbRun(
        `UPDATE users SET 
          role = COALESCE(?, role),
          roll_number = COALESCE(?, roll_number),
          class_id = COALESCE(?, class_id),
          division_id = COALESCE(?, division_id),
          institution = COALESCE(?, institution)
        WHERE id = ?`,
        [
          data.role && ['faculty', 'admin', 'student'].includes(data.role) ? data.role : null,
          data.roll_number || null,
          data.class_id || null,
          data.division_id || null,
          data.institution_id || null,
          existing.id,
        ]
      );
      saveDatabaseToDisk();
      return getProfileById(existing.id)!;
    }
  } else {
    // Normal registration defaults strictly to 'student' unless specifically established
    const assignedRole = (data.role && ['faculty', 'admin', 'student'].includes(data.role)) ? data.role : 'student';
    dbRun(
      `INSERT INTO profiles (id, email, full_name, role, institution_id, roll_number, class_id, division_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.email.toLowerCase(),
        data.full_name,
        assignedRole,
        data.institution_id || null,
        data.roll_number || null,
        data.class_id || null,
        data.division_id || null,
        data.status || 'active',
        now,
        now,
      ]
    );
    // Ensure users table also has a matching record for relational integrity
    dbRun(
      `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, institution, roll_number, class_id, division_id, created_at, updated_at)
       VALUES (?, ?, ?, 'SUPABASE_AUTH_EXTERNAL', ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.full_name,
        data.email.toLowerCase(),
        assignedRole,
        data.institution_id || null,
        data.roll_number || null,
        data.class_id || null,
        data.division_id || null,
        now,
        now,
      ]
    );
    saveDatabaseToDisk();
    return getProfileById(data.id)!;
  }
}

export function updateProfile(
  id: string,
  updates: {
    full_name?: string;
    institution_id?: string | null;
    roll_number?: string | null;
    class_id?: string | null;
    division_id?: string | null;
    role?: UserRole;
  }
): ProfileRow | null {
  const existing = getProfileById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const newName = updates.full_name !== undefined ? updates.full_name.trim() : existing.full_name;
  const newInst = updates.institution_id !== undefined ? updates.institution_id : existing.institution_id;
  const newRoll = updates.roll_number !== undefined ? updates.roll_number : existing.roll_number;
  const newClass = updates.class_id !== undefined ? updates.class_id : existing.class_id;
  const newDiv = updates.division_id !== undefined ? updates.division_id : existing.division_id;
  const newRole = updates.role !== undefined ? updates.role : existing.role;

  dbRun(
    `UPDATE profiles SET 
      full_name = ?, 
      institution_id = ?, 
      roll_number = ?, 
      class_id = ?, 
      division_id = ?, 
      role = ?, 
      updated_at = ? 
    WHERE id = ?`,
    [newName, newInst, newRoll, newClass, newDiv, newRole, now, id]
  );
  return getProfileById(id);
}

// ----------------------------------------------------------------------------
// Faculty Division Session Management (Single Faculty Active per Institution/Class/Division)
// ----------------------------------------------------------------------------
const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes heartbeat lease

export function getFacultyDivisionSession(
  institution: string,
  classId: string,
  divisionId: string
): FacultyDivisionSessionRow | null {
  const session = dbGet<FacultyDivisionSessionRow>(
    `SELECT * FROM faculty_division_sessions 
     WHERE lower(institution) = lower(?) AND lower(class_id) = lower(?) AND lower(division_id) = lower(?)`,
    [institution.trim(), classId.trim(), divisionId.trim()]
  );

  if (!session) return null;

  // If expired, clean up and return null
  const expiresAtEpoch = new Date(session.expires_at).getTime();
  if (expiresAtEpoch <= Date.now()) {
    dbRun(`DELETE FROM faculty_division_sessions WHERE id = ?`, [session.id]);
    return null;
  }

  return session;
}

export function claimFacultyDivisionSession(params: {
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  institution: string;
  classId: string;
  divisionId: string;
}): {
  success: boolean;
  session?: FacultyDivisionSessionRow;
  error?: string;
  occupiedBy?: {
    facultyId: string;
    facultyName: string;
    facultyEmail: string;
    expiresAt: string;
  };
} {
  const cleanInst = params.institution.trim();
  const cleanClass = params.classId.trim();
  const cleanDiv = params.divisionId.trim();

  const existing = dbGet<FacultyDivisionSessionRow>(
    `SELECT * FROM faculty_division_sessions 
     WHERE lower(institution) = lower(?) AND lower(class_id) = lower(?) AND lower(division_id) = lower(?)`,
    [cleanInst, cleanClass, cleanDiv]
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS).toISOString();
  const nowIso = now.toISOString();

  if (existing) {
    const isExpired = new Date(existing.expires_at).getTime() <= now.getTime();
    if (!isExpired && existing.faculty_id !== params.facultyId) {
      // Division is currently active and occupied by another faculty
      return {
        success: false,
        error: `Division currently occupied by another faculty session (${existing.faculty_name || existing.faculty_email}).`,
        occupiedBy: {
          facultyId: existing.faculty_id,
          facultyName: existing.faculty_name,
          facultyEmail: existing.faculty_email,
          expiresAt: existing.expires_at,
        },
      };
    }

    // Renew or acquire expired lease
    dbRun(
      `UPDATE faculty_division_sessions 
       SET faculty_id = ?, faculty_name = ?, faculty_email = ?, last_heartbeat = ?, expires_at = ?
       WHERE id = ?`,
      [params.facultyId, params.facultyName, params.facultyEmail, nowIso, expiresAt, existing.id]
    );

    const updated = dbGet<FacultyDivisionSessionRow>(
      `SELECT * FROM faculty_division_sessions WHERE id = ?`,
      [existing.id]
    );
    return { success: true, session: updated! };
  }

  // Create new session claim
  const sessionId = `fds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  dbRun(
    `INSERT INTO faculty_division_sessions (
      id, faculty_id, faculty_name, faculty_email, institution, class_id, division_id, last_heartbeat, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, params.facultyId, params.facultyName, params.facultyEmail, cleanInst, cleanClass, cleanDiv, nowIso, expiresAt, nowIso]
  );

  const created = dbGet<FacultyDivisionSessionRow>(
    `SELECT * FROM faculty_division_sessions WHERE id = ?`,
    [sessionId]
  );
  return { success: true, session: created! };
}

export function heartbeatFacultyDivisionSession(
  facultyId: string,
  institution: string,
  classId: string,
  divisionId: string
): { success: boolean; session?: FacultyDivisionSessionRow; error?: string } {
  const cleanInst = institution.trim();
  const cleanClass = classId.trim();
  const cleanDiv = divisionId.trim();

  const existing = dbGet<FacultyDivisionSessionRow>(
    `SELECT * FROM faculty_division_sessions 
     WHERE lower(institution) = lower(?) AND lower(class_id) = lower(?) AND lower(division_id) = lower(?)`,
    [cleanInst, cleanClass, cleanDiv]
  );

  if (!existing) {
    return { success: false, error: 'No active session found to refresh.' };
  }

  if (existing.faculty_id !== facultyId) {
    return { success: false, error: 'Cannot heartbeat a session owned by another faculty.' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS).toISOString();
  dbRun(
    `UPDATE faculty_division_sessions SET last_heartbeat = ?, expires_at = ? WHERE id = ?`,
    [now.toISOString(), expiresAt, existing.id]
  );

  const refreshed = dbGet<FacultyDivisionSessionRow>(
    `SELECT * FROM faculty_division_sessions WHERE id = ?`,
    [existing.id]
  );
  return { success: true, session: refreshed! };
}

export function releaseFacultyDivisionSession(facultyId: string): { success: boolean } {
  dbRun(`DELETE FROM faculty_division_sessions WHERE faculty_id = ?`, [facultyId]);
  return { success: true };
}

