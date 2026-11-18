import assert from 'assert';
import {
  evaluateSubmission,
  DEFAULT_PARKING_FEE_TEST_CASES,
  TestCase,
} from '../server/execution/evaluator.ts';

async function runRegressionSuite() {
  console.log('===========================================================');
  console.log('  RUNNING DETERMINISTIC EVALUATOR & DATA CONTRACT SUITE    ');
  console.log('===========================================================\n');

  // -------------------------------------------------------------------------
  // 1. DATA CONTRACT VERIFICATION
  // -------------------------------------------------------------------------
  console.log('1. DATA CONTRACT FLOW CHECK:');
  const facultyEnteredInput = '10';
  const facultyEnteredExpected = 'Even';

  const frontendTestCase = {
    input: facultyEnteredInput,
    expected: facultyEnteredExpected,
    description: 'Even number check',
  };

  const dbTestCasesJson = JSON.stringify([frontendTestCase]);
  const parsedFromDb: TestCase[] = JSON.parse(dbTestCasesJson);
  assert.strictEqual(parsedFromDb[0].input, '10', 'input must be plain "10"');
  assert.strictEqual(parsedFromDb[0].expected, 'Even', 'expected must be plain "Even"');
  assert.notStrictEqual(parsedFromDb[0].expected, '"Even"', 'expected must NOT be double-stringified');
  console.log('  ✔ Data contract verified: semantic values are input="10", expected="Even".\n');

  // -------------------------------------------------------------------------
  // 2. PARKING FEE WITH INPUT PROMPTS (CORE PROMPT REQUIREMENT)
  // -------------------------------------------------------------------------
  console.log('2. VERIFYING PARKING FEE WITH INPUT PROMPT:');
  const parkingFeeStudentCodePrompt = `hours = int(input("Enter parking hours: "))

if hours <= 2:
    fee = hours * 20
elif hours <= 5:
    fee = (2 * 20) + ((hours - 2) * 30)
else:
    fee = (2 * 20) + (3 * 30) + ((hours - 5) * 50)

print("Total Parking Fee: ₹", fee)
`;

  const evalParkingPrompt = await evaluateSubmission(
    parkingFeeStudentCodePrompt,
    'python',
    DEFAULT_PARKING_FEE_TEST_CASES
  );

  console.log(
    `  Parking Fee (with prompt): status=${evalParkingPrompt.status}, passed=${evalParkingPrompt.testsPassed}/${evalParkingPrompt.testsTotal}`
  );
  assert.strictEqual(
    evalParkingPrompt.status,
    'PASSED',
    'Student code with input("Enter parking hours: ") MUST PASS'
  );
  assert.strictEqual(evalParkingPrompt.testsPassed, 7, 'Must pass all 7 parking fee test cases');
  assert.strictEqual(evalParkingPrompt.testsFailed, 0, 'Must have 0 failed test cases');
  console.log('  ✔ Parking fee with input prompt passed 7/7 tests without prompt pollution!\n');

  // -------------------------------------------------------------------------
  // 3. PARKING FEE WITHOUT PROMPT (IDENTICAL BEHAVIOR)
  // -------------------------------------------------------------------------
  console.log('3. VERIFYING PARKING FEE WITHOUT PROMPT:');
  const parkingFeeNoPrompt = `hours = int(input())

if hours <= 2:
    fee = hours * 20
elif hours <= 5:
    fee = (2 * 20) + ((hours - 2) * 30)
else:
    fee = (2 * 20) + (3 * 30) + ((hours - 5) * 50)

print("Total Parking Fee: ₹", fee)
`;

  const evalParkingNoPrompt = await evaluateSubmission(
    parkingFeeNoPrompt,
    'python',
    DEFAULT_PARKING_FEE_TEST_CASES
  );
  assert.strictEqual(evalParkingNoPrompt.status, 'PASSED');
  assert.strictEqual(evalParkingNoPrompt.testsPassed, 7);
  console.log('  ✔ Parking fee without prompt also passed 7/7 tests identically!\n');

  // -------------------------------------------------------------------------
  // 4. MULTIPLE INPUT CALLS WITH PROMPTS (REQUIREMENT 8)
  // -------------------------------------------------------------------------
  console.log('4. VERIFYING MULTIPLE INPUT CALLS WITH PROMPTS:');
  const multiInputCode = `name = input("Enter name: ")
age = int(input("Enter age: "))

print(name)
print(age)
`;

  const multiInputTests: TestCase[] = [
    { input: 'Ary\n18\n', expected: 'Ary\n18', description: 'Name and age test' },
    { input: 'John Doe\n25\n', expected: 'John Doe\n25', description: 'Two-word name test' },
  ];

  const evalMultiInput = await evaluateSubmission(multiInputCode, 'python', multiInputTests);
  assert.strictEqual(evalMultiInput.status, 'PASSED');
  assert.strictEqual(evalMultiInput.testsPassed, 2);
  console.log('  ✔ Multiple inputs with prompts handled correctly without interference!\n');

  // -------------------------------------------------------------------------
  // 5. HARDCODED ANSWERS MUST FAIL HIDDEN TESTS (REQUIREMENT 12)
  // -------------------------------------------------------------------------
  console.log('5. VERIFYING REJECTION OF HARDCODED ANSWERS:');
  const hardcodedCode = `print("Total Parking Fee: ₹ 20")`;
  const evalHardcoded = await evaluateSubmission(hardcodedCode, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(evalHardcoded.status, 'FAILED', 'Hardcoded answer MUST FAIL overall');
  assert.strictEqual(evalHardcoded.testsPassed, 1, 'Only test 1 matches');
  assert.strictEqual(evalHardcoded.testsFailed, 6, 'All other tests must fail');
  console.log('  ✔ Hardcoded answers correctly rejected by hidden tests!\n');

  // -------------------------------------------------------------------------
  // 6. EVALUATOR LENIENCY BOUNDARIES (REQUIREMENT 9)
  // -------------------------------------------------------------------------
  console.log('6. VERIFYING EVALUATOR PRECISION (NOT TOO LENIENT):');
  const test1: TestCase[] = [{ input: '1\n', expected: 'Total Parking Fee: ₹ 20' }];

  // 6a: Formatting variance (no space after ₹) -> PASS
  const evalNoSpace = await evaluateSubmission(`print("Total Parking Fee: ₹20")`, 'python', test1);
  assert.strictEqual(evalNoSpace.status, 'PASSED', 'Harmless currency spacing should pass');

  // 6b: Wrong answer (500) -> MUST FAIL
  const evalWrong500 = await evaluateSubmission(`print("Total Parking Fee: ₹ 500")`, 'python', test1);
  assert.strictEqual(evalWrong500.status, 'FAILED', 'Wrong value ₹ 500 must fail');

  // 6c: Wrong string -> MUST FAIL
  const evalWrongStr = await evaluateSubmission(`print("Wrong answer")`, 'python', test1);
  assert.strictEqual(evalWrongStr.status, 'FAILED', '"Wrong answer" must fail');

  // 6d: Extra incorrect result line -> MUST FAIL
  const evalExtra = await evaluateSubmission(
    `print("Total Parking Fee: ₹ 20")\nprint("Extra incorrect result")`,
    'python',
    test1
  );
  assert.strictEqual(evalExtra.status, 'FAILED', 'Extra unexpected output line must fail');
  console.log('  ✔ Evaluator precision verified: allows formatting tolerance without false passes!\n');

  // -------------------------------------------------------------------------
  // 7. DIFFERENT VALID PROGRAM STRUCTURES (REQUIREMENT 10)
  // -------------------------------------------------------------------------
  console.log('7. VERIFYING DIFFERENT PROGRAM STRUCTURES:');
  // Function-based calculation
  const funcCode = `def calculate_fee(hours):
    if hours <= 2:
        return hours * 20
    elif hours <= 5:
        return 40 + (hours - 2) * 30
    return 130 + (hours - 5) * 50

h = int(input("Enter hours: "))
print("Total Parking Fee: ₹", calculate_fee(h))
`;
  const evalFunc = await evaluateSubmission(funcCode, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(evalFunc.status, 'PASSED');
  assert.strictEqual(evalFunc.testsPassed, 7);
  console.log('  ✔ Function-based structure passed 7/7 tests!\n');

  // -------------------------------------------------------------------------
  // 8. RUNTIME ERROR REPORTING (REQUIREMENT 13)
  // -------------------------------------------------------------------------
  console.log('8. VERIFYING RUNTIME ERROR REPORTING:');
  const divZero = await evaluateSubmission('x = 1 / 0', 'python', test1);
  assert.strictEqual(divZero.status, 'FAILED');
  assert(
    divZero.results[0].error?.includes('ZeroDivisionError'),
    'Error must identify ZeroDivisionError'
  );

  const valueErr = await evaluateSubmission('x = int("invalid")', 'python', test1);
  assert.strictEqual(valueErr.status, 'FAILED');
  assert(
    valueErr.results[0].error?.includes('ValueError'),
    'Error must identify ValueError'
  );
  console.log('  ✔ Runtime errors clearly differentiated from output mismatches!\n');

  // -------------------------------------------------------------------------
  // 9. TIMEOUT HANDLING (REQUIREMENT 14)
  // -------------------------------------------------------------------------
  console.log('9. VERIFYING TIMEOUT HANDLING:');
  const infiniteLoop = 'while True:\n    pass\n';
  const evalTimeout = await evaluateSubmission(infiniteLoop, 'python', test1);
  assert.strictEqual(evalTimeout.status, 'FAILED');
  assert.strictEqual(evalTimeout.results[0].timedOut, true);
  assert(
    evalTimeout.results[0].error?.includes('TIME LIMIT EXCEEDED'),
    'Must display TIME LIMIT EXCEEDED'
  );
  console.log('  ✔ Infinite loop safely terminated with TIME LIMIT EXCEEDED!\n');

  // -------------------------------------------------------------------------
  // 10. MULTI-TOKEN INPUTS (EVEN/ODD & LARGEST NUMBER)
  // -------------------------------------------------------------------------
  console.log('10. VERIFYING MULTI-TOKEN SPACE-SEPARATED INPUTS:');
  const largestTests: TestCase[] = [
    { input: '10 20\n', expected: '20' },
    { input: '50 5\n', expected: '50' },
  ];

  const mapSplitCode = `a, b = map(int, input().split())
print(max(a, b))
`;
  const evalMap = await evaluateSubmission(mapSplitCode, 'python', largestTests);
  assert.strictEqual(evalMap.status, 'PASSED');

  const twoInputsCode = `a = int(input())
b = int(input())
print(max(a, b))
`;
  const evalTwo = await evaluateSubmission(twoInputsCode, 'python', largestTests);
  assert.strictEqual(evalTwo.status, 'PASSED');
  console.log('  ✔ Both input().split() and sequential input() supported on space-separated data!\n');

  console.log('===========================================================');
  console.log('  ALL REGRESSION & ENGINE VERIFICATIONS PASSED (10/10)     ');
  console.log('===========================================================');
}

runRegressionSuite().catch((err) => {
  console.error('Regression suite failed:', err);
  process.exit(1);
});
