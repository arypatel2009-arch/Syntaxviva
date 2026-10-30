import assert from 'assert';
import { getDatabase, dbRun, dbGet, saveDatabaseToDisk } from '../server/db/database.ts';
import { evaluateSubmission, TestCase } from '../server/execution/evaluator.ts';

async function testApiAssignmentFlow() {
  console.log('Testing assignment creation and evaluation flow against real database...');
  await getDatabase();

  const title = 'Even or Odd Deterministic Test';
  const description = 'Reads an integer from stdin and prints Even or Odd';
  const language = 'python';
  const testCases = [
    { input: '10', expected: 'Even', description: 'Test 1: Input 10 -> Even', is_hidden: false },
    { input: '7', expected: 'Odd', description: 'Test 2: Input 7 -> Odd', is_hidden: false },
    { input: '0', expected: 'Even', description: 'Test 3: Input 0 -> Even', is_hidden: false },
    { input: '-4', expected: 'Even', description: 'Test 4: Input -4 -> Even', is_hidden: true },
    { input: '-7', expected: 'Odd', description: 'Test 5: Input -7 -> Odd', is_hidden: true },
    { input: '1', expected: 'Odd', description: 'Test 6: Input 1 -> Odd', is_hidden: true },
    { input: '100', expected: 'Even', description: 'Test 7: Input 100 -> Even', is_hidden: true },
  ];

  // Emulate POST /api/assignments
  const sanitizedTestCases = testCases.map((tc: any) => ({
    input: typeof tc.input === 'string' ? tc.input : String(tc.input ?? ''),
    expected: typeof tc.expected === 'string' ? tc.expected : String(tc.expected ?? ''),
    description: tc.description || '',
    is_hidden: Boolean(tc.is_hidden || tc.isHidden),
  }));

  const assignmentId = `asg_even_odd_${Date.now()}`;
  const now = new Date().toISOString();
  const testCasesJson = JSON.stringify(sanitizedTestCases);

  dbRun(
    `INSERT INTO assignments (
      id, title, description, language, requirements, starter_code, 
      test_cases_json, status, created_by, due_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'faculty_test', ?, ?, ?)`,
    [
      assignmentId,
      title,
      description,
      language,
      'Determine parity',
      'n = int(input())\n',
      testCasesJson,
      '2026-12-31',
      now,
      now,
    ]
  );
  saveDatabaseToDisk();

  // Query back from DB as student endpoint would
  const row = dbGet<{ id: string; title: string; test_cases_json: string }>(
    `SELECT id, title, test_cases_json FROM assignments WHERE id = ?`,
    [assignmentId]
  );
  assert(row, 'Assignment must exist in database');
  const fetchedJson = row.test_cases_json;
  console.log('Stored and retrieved test_cases_json:', fetchedJson);

  const parsedTestCases: TestCase[] = JSON.parse(fetchedJson);
  assert.strictEqual(parsedTestCases.length, 7);
  assert.strictEqual(parsedTestCases[0].input, '10');
  assert.strictEqual(parsedTestCases[0].expected, 'Even');
  assert.notStrictEqual(parsedTestCases[0].expected, '"Even"');

  // Evaluate correct student code
  const studentCode = `n = int(input())

if n % 2 == 0:
    print("Even")
else:
    print("Odd")
`;

  const evalResult = await evaluateSubmission(studentCode, language, parsedTestCases);
  console.log(`Evaluation status: ${evalResult.status}, passed: ${evalResult.testsPassed}/${evalResult.testsTotal}`);
  assert.strictEqual(evalResult.status, 'PASSED');
  assert.strictEqual(evalResult.testsPassed, 7);
  assert.strictEqual(evalResult.testsFailed, 0);
  console.log('✔ End-to-end assignment test passed!');
}

testApiAssignmentFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
