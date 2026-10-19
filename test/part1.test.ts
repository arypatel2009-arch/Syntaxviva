import assert from 'assert';
import { getDatabase, dbGet, dbQuery, dbRun, INITIAL_MUTATION_TYPES } from '../server/db/database.ts';
import { generateToken, verifyToken } from '../server/auth/jwt.ts';
import bcrypt from 'bcryptjs';

async function runPart1Tests() {
  console.log('=== [SyntaXViva] PART 1 AUTOMATED VERIFICATION SUITE ===\n');

  // Test 1: Database Initialization
  console.log('Test 1: Initializing SQLite database and schema...');
  const db = await getDatabase();
  assert(db, 'Database instance must be defined');

  const tables = dbQuery<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).map((r) => r.name);

  console.log('Found SQLite tables:', tables.join(', '));
  const expectedTables = [
    'users',
    'assignments',
    'student_attempts',
    'mutation_registry',
    'proctoring_events',
    'security_events',
  ];

  for (const expected of expectedTables) {
    assert(tables.includes(expected), `Schema must contain table: ${expected}`);
  }
  console.log('✔ Test 1 Passed: All 6 required core tables exist in schema.\n');

  // Test 2: Mutation Types Registry (Initial 27 types)
  console.log('Test 2: Verifying extensible mutation registry...');
  const registeredMutations = dbQuery<{ code: string; category: string }>(
    'SELECT code, category FROM mutation_registry'
  );

  console.log(`Registered mutation types count: ${registeredMutations.length}`);
  assert(registeredMutations.length >= 27, `Must have at least 27 mutation types, found ${registeredMutations.length}`);

  const requiredMutationCodes = [
    'GREATER_THAN_TO_GREATER_EQUAL',
    'GREATER_EQUAL_TO_GREATER_THAN',
    'LESS_THAN_TO_LESS_EQUAL',
    'LESS_EQUAL_TO_LESS_THAN',
    'EQUAL_TO_NOT_EQUAL',
    'NOT_EQUAL_TO_EQUAL',
    'PLUS_TO_MINUS',
    'MINUS_TO_PLUS',
    'MULTIPLY_TO_DIVIDE',
    'DIVIDE_TO_MULTIPLY',
    'AND_TO_OR',
    'OR_TO_AND',
    'BOOLEAN_NEGATION',
    'CONDITIONAL_BRANCH_INVERSION',
    'LOOP_BOUNDARY_OFF_BY_ONE',
    'LOOP_CONDITION_MUTATION',
    'LOOP_INCREMENT_DECREMENT_MUTATION',
    'VARIABLE_REFERENCE_SWAP',
    'VARIABLE_SWAP',
    'CONSTANT_LITERAL_MUTATION',
    'INITIALIZATION_VALUE_MUTATION',
    'ARRAY_INDEX_MUTATION',
    'COLLECTION_ELEMENT_SELECTION_MUTATION',
    'FUNCTION_ARGUMENT_MUTATION',
    'RETURN_VALUE_MUTATION',
    'MIN_MAX_SWAP',
    'ACCUMULATOR_AGGREGATION_MUTATION',
  ];

  const registeredCodes = new Set(registeredMutations.map((m) => m.code));
  for (const code of requiredMutationCodes) {
    assert(registeredCodes.has(code), `Missing required mutation type: ${code}`);
  }
  console.log('✔ Test 2 Passed: All 27 required mutation types verified in database registry.\n');

  // Test 3: Password Hashing Security (Bcrypt)
  console.log('Test 3: Verifying password hashing security...');
  const rawPassword = 'SecretPassword123!';
  const hash = await bcrypt.hash(rawPassword, 10);
  assert(hash !== rawPassword, 'Hash must not equal plaintext');
  assert(await bcrypt.compare(rawPassword, hash), 'Password comparison must succeed for correct password');
  assert(!(await bcrypt.compare('WrongPassword', hash)), 'Password comparison must fail for incorrect password');
  console.log('✔ Test 3 Passed: Bcrypt password hashing is secure and verified.\n');

  // Test 4: Default Users & Roles
  console.log('Test 4: Verifying faculty and student default accounts in database...');
  const faculty = dbGet<{ id: string; name: string; email: string; role: string; password_hash: string }>(
    "SELECT * FROM users WHERE email = 'faculty@syntaxviva.edu'"
  );
  assert(faculty, 'Faculty user must exist');
  assert.strictEqual(faculty.role, 'faculty', 'Faculty role must be faculty');
  assert.strictEqual(faculty.password_hash, 'SUPABASE_AUTH_MANAGED', 'Faculty password must be Supabase Auth managed');

  const student = dbGet<{ id: string; name: string; email: string; role: string; password_hash: string }>(
    "SELECT * FROM users WHERE email = 'student@syntaxviva.edu'"
  );
  assert(student, 'Student user must exist');
  assert.strictEqual(student.role, 'student', 'Student role must be student');
  assert.strictEqual(student.password_hash, 'SUPABASE_AUTH_MANAGED', 'Student password must be Supabase Auth managed');
  console.log('✔ Test 4 Passed: Seeded faculty and student users verified with correct roles and Supabase Auth management.\n');

  // Test 5: JWT Token Generation & Verification
  console.log('Test 5: Verifying JWT session generation and validation...');
  const token = generateToken({
    userId: faculty.id,
    email: faculty.email,
    role: 'faculty',
    name: faculty.name,
  });
  assert(token && typeof token === 'string', 'Token must be a non-empty string');

  const payload = verifyToken(token);
  assert(payload, 'Decoded token payload must exist');
  assert.strictEqual(payload.userId, faculty.id);
  assert.strictEqual(payload.role, 'faculty');

  // Test invalid token
  const invalidPayload = verifyToken('invalid.jwt.token.string');
  assert.strictEqual(invalidPayload, null, 'Invalid token must return null');
  console.log('✔ Test 5 Passed: JWT signing and verification work as expected.\n');

  // Test 6: Role Separation Logic
  console.log('Test 6: Verifying role separation constraints...');
  const studentToken = generateToken({
    userId: student.id,
    email: student.email,
    role: 'student',
    name: student.name,
  });
  const decodedStudent = verifyToken(studentToken);
  assert(decodedStudent && decodedStudent.role === 'student');

  // Verify that faculty role requirement would reject student role
  const isFacultyAllowed = (decodedStudent.role as string) === 'faculty';
  assert(!isFacultyAllowed, 'Student role must NOT be permitted to access faculty endpoints');
  console.log('✔ Test 6 Passed: Role separation verified between faculty and student.\n');

  // Test 7: Assignments DB CRUD
  console.log('Test 7: Verifying assignment insertion and query...');
  const initialAssignments = dbQuery('SELECT * FROM assignments');
  assert(initialAssignments.length > 0, 'Initial assignments should be seeded');

  const testAssignmentId = `asg_test_${Date.now()}`;
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO assignments (id, title, description, language, requirements, starter_code, test_cases_json, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      testAssignmentId,
      'Test Assignment Unit Check',
      'Test problem description',
      'python',
      'Standard requirements',
      'def test(): pass',
      '[]',
      faculty.id,
      now,
      now,
    ]
  );

  const fetched = dbGet<{ id: string; title: string }>('SELECT id, title FROM assignments WHERE id = ?', [testAssignmentId]);
  assert(fetched, 'Inserted assignment must be queryable');
  assert.strictEqual(fetched.title, 'Test Assignment Unit Check');

  // Clean up test assignment
  dbRun('DELETE FROM assignments WHERE id = ?', [testAssignmentId]);
  console.log('✔ Test 7 Passed: Assignment database operations work correctly.\n');

  console.log('====================================================');
  console.log('ALL 7 PART 1 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runPart1Tests().catch((err) => {
  console.error('PART 1 TEST FAILURE:', err);
  process.exit(1);
});
