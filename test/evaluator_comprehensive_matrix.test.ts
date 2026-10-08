import assert from 'assert';
import {
  evaluateSubmission,
  executeTestCases,
  DEFAULT_PARKING_FEE_TEST_CASES,
  DEFAULT_LARGEST_NUMBER_TEST_CASES,
  TestCase,
} from '../server/execution/evaluator.ts';

async function runEvaluatorComprehensiveMatrix() {
  console.log('================================================================');
  console.log('  SYNTAXVIVA PYTHON CODE EXECUTION & EVALUATION ENGINE AUDIT    ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. INPUT PROMPT TOLERANCE: PARKING FEE
  // ---------------------------------------------------------------------------
  console.log('TEST 1: Input Prompt Tolerance on Parking Fee Calculator');

  const studentWithPrompt = `hours = int(input("Enter parking hours: "))

if hours <= 2:
    fee = hours * 20
elif hours <= 5:
    fee = (2 * 20) + ((hours - 2) * 30)
else:
    fee = (2 * 20) + (3 * 30) + ((hours - 5) * 50)

print("Total Parking Fee: ₹", fee)
`;

  const studentWithoutPrompt = `hours = int(input())

if hours <= 2:
    fee = hours * 20
elif hours <= 5:
    fee = (2 * 20) + ((hours - 2) * 30)
else:
    fee = (2 * 20) + (3 * 30) + ((hours - 5) * 50)

print("Total Parking Fee: ₹", fee)
`;

  const resPrompt = await evaluateSubmission(studentWithPrompt, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(resPrompt.status, 'PASSED', 'Code with input prompt MUST pass');
  assert.strictEqual(resPrompt.testsPassed, 7, 'Must pass all 7 parking fee tests');
  console.log('  ✔ student with input("Enter parking hours: ") passed all 7/7 tests.');

  const resNoPrompt = await evaluateSubmission(studentWithoutPrompt, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(resNoPrompt.status, 'PASSED', 'Code without prompt MUST pass');
  assert.strictEqual(resNoPrompt.testsPassed, 7, 'Must pass all 7 parking fee tests');
  console.log('  ✔ student with input() passed all 7/7 tests.');

  // ---------------------------------------------------------------------------
  // 2. MULTIPLE INPUTS & MULTIPLE PROMPTS
  // ---------------------------------------------------------------------------
  console.log('\nTEST 2: Multiple input() calls with prompts & newlines');

  const multiInputCode = `name = input("Enter name: ")
age = int(input("Enter age: "))

print(name)
print(age)
`;

  const multiInputTests: TestCase[] = [
    { input: 'Ary\n18\n', expected: 'Ary\n18', description: 'Student Ary, age 18' },
    { input: 'Viva\n25\n', expected: 'Viva\n25', description: 'Student Viva, age 25' },
  ];

  const resMulti = await evaluateSubmission(multiInputCode, 'python', multiInputTests);
  assert.strictEqual(resMulti.status, 'PASSED');
  assert.strictEqual(resMulti.testsPassed, 2);
  console.log('  ✔ Multiple inputs with prompts handled cleanly without stdout corruption.');

  // ---------------------------------------------------------------------------
  // 3. VARIATIONS IN PROGRAM STRUCTURE & CODING STYLE
  // ---------------------------------------------------------------------------
  console.log('\nTEST 3: Behavior-based evaluation across valid structural styles');

  // 3a. Functions + f-strings + different variable names
  const funcStyleCode = `def calculate_parking_fee(h):
    if h <= 2:
        return h * 20
    elif h <= 5:
        return 40 + (h - 2) * 30
    else:
        return 130 + (h - 5) * 50

parked_duration = int(input("How many hours? "))
total = calculate_parking_fee(parked_duration)
print(f"Total Parking Fee: ₹{total}")
`;

  const resFunc = await evaluateSubmission(funcStyleCode, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(resFunc.status, 'PASSED');
  assert.strictEqual(resFunc.testsPassed, 7);
  console.log('  ✔ Style 3a (Function + f-string + custom var names): PASS (7/7)');

  // 3b. String concatenation + different arithmetic formulation
  const concatStyleCode = `p = int(input("h: "))
rate = 0
if p <= 2:
    rate = 20 * p
elif p <= 5:
    rate = 40 + 30 * (p - 2)
else:
    rate = 40 + 90 + 50 * (p - 5)
print("Total Parking Fee: ₹ " + str(rate))
`;

  const resConcat = await evaluateSubmission(concatStyleCode, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(resConcat.status, 'PASSED');
  assert.strictEqual(resConcat.testsPassed, 7);
  console.log('  ✔ Style 3b (Arithmetic grouping + string concatenation): PASS (7/7)');

  // ---------------------------------------------------------------------------
  // 4. PREVENT HARDCODED ANSWERS (HIDDEN TESTS ENFORCEMENT)
  // ---------------------------------------------------------------------------
  console.log('\nTEST 4: Hardcoded answer prevention via hidden tests');

  const hardcodedCode = `print("Total Parking Fee: ₹ 20")`;
  const resHardcoded = await evaluateSubmission(hardcodedCode, 'python', DEFAULT_PARKING_FEE_TEST_CASES);

  assert.strictEqual(resHardcoded.status, 'FAILED', 'Hardcoded code must FAIL overall');
  assert.strictEqual(resHardcoded.testsPassed, 1, 'Only test 1 (input 1) may match');
  assert.strictEqual(resHardcoded.testsFailed, 6, 'Must fail remaining 6 test cases');
  console.log('  ✔ Hardcoded print("Total Parking Fee: ₹ 20") correctly failed 6/7 tests.');

  // ---------------------------------------------------------------------------
  // 5. EVALUATOR STRICTNESS (INCORRECT LOGIC MUST FAIL)
  // ---------------------------------------------------------------------------
  console.log('\nTEST 5: Strictness verification (incorrect answers must fail)');

  const wrongAnswerCode = `hours = int(input("Enter hours: "))
print("Total Parking Fee: ₹", hours * 500)
`;

  const resWrong = await evaluateSubmission(wrongAnswerCode, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(resWrong.status, 'FAILED');
  assert.strictEqual(resWrong.testsPassed, 0);
  console.log('  ✔ Incorrect output (₹ 500/hr) failed 7/7 tests.');

  const randomOutputCode = `print("Something completely unrelated")`;
  const resRandom = await evaluateSubmission(randomOutputCode, 'python', DEFAULT_PARKING_FEE_TEST_CASES);
  assert.strictEqual(resRandom.status, 'FAILED');
  console.log('  ✔ Arbitrary text output correctly failed.');

  // ---------------------------------------------------------------------------
  // 6. RUNTIME ERROR HANDLING (NO MISCLASSIFICATION AS OUTPUT MISMATCH)
  // ---------------------------------------------------------------------------
  console.log('\nTEST 6: Runtime error classification & error diagnostics');

  const zeroDivCode = `hours = int(input("Enter hours: "))
print("Starting calculation...")
x = 10 / (hours - 1)
print(x)
`;

  const resDivZero = await evaluateSubmission(zeroDivCode, 'python', [
    { input: '1\n', expected: 'Total Parking Fee: ₹ 20', description: 'Zero division trigger' },
  ]);

  assert.strictEqual(resDivZero.status, 'FAILED');
  assert.strictEqual(resDivZero.testsFailed, 1);
  const test1 = resDivZero.results[0];
  assert(test1.error?.includes('ZeroDivisionError'), 'Must report ZeroDivisionError in error field');
  console.log('  ✔ ZeroDivisionError correctly captured and classified as runtime error.');

  const typeErrorCode = `hours = input("Enter hours: ")
fee = hours + 20
print(fee)
`;
  const resTypeError = await evaluateSubmission(typeErrorCode, 'python', [
    { input: '2\n', expected: 'Total Parking Fee: ₹ 40', description: 'TypeError trigger' },
  ]);
  assert.strictEqual(resTypeError.status, 'FAILED');
  assert(resTypeError.results[0].error?.includes('TypeError'), 'Must report TypeError');
  console.log('  ✔ TypeError correctly reported without misclassifying as mismatch.');

  // ---------------------------------------------------------------------------
  // 7. TIMEOUT HANDLING (TIME LIMIT EXCEEDED)
  // ---------------------------------------------------------------------------
  console.log('\nTEST 7: Infinite loop timeout handling');

  const infiniteLoopCode = `hours = int(input())
while True:
    pass
`;

  const startTime = Date.now();
  const resTimeout = await evaluateSubmission(infiniteLoopCode, 'python', [
    { input: '1\n', expected: 'Total Parking Fee: ₹ 20', description: 'Infinite loop test' },
  ]);
  const duration = Date.now() - startTime;

  assert.strictEqual(resTimeout.status, 'FAILED');
  assert.strictEqual(resTimeout.results[0].timedOut, true);
  assert(resTimeout.results[0].error?.includes('TIME LIMIT EXCEEDED'));
  console.log(`  ✔ Infinite loop safely terminated after ${duration}ms with TIME LIMIT EXCEEDED.`);

  // ---------------------------------------------------------------------------
  // 8. NON-FINALIZING TEST RUNNER (RUN CODE)
  // ---------------------------------------------------------------------------
  console.log('\nTEST 8: Non-finalizing test runner (executeTestCases)');

  const testRunResults = await executeTestCases(
    studentWithPrompt,
    'python',
    DEFAULT_PARKING_FEE_TEST_CASES.slice(0, 3)
  );

  assert.strictEqual(testRunResults.testsTotal, 3);
  assert.strictEqual(testRunResults.testsPassed, 3);
  assert.strictEqual(testRunResults.testsFailed, 0);
  assert.strictEqual(testRunResults.results[0].passed, true);
  assert.strictEqual(testRunResults.results[0].actual, 'Total Parking Fee: ₹ 20');
  console.log('  ✔ executeTestCases ran 3 visible tests and returned detailed outputs.');

  // ---------------------------------------------------------------------------
  // 9. MULTI-TOKEN INPUT REGRESSION (Largest number & sum)
  // ---------------------------------------------------------------------------
  console.log('\nTEST 9: Multi-token regression');

  const largestCodeSplit = `a, b = map(int, input().split())
if a > b:
    print(a)
else:
    print(b)
`;

  const resLargestSplit = await evaluateSubmission(largestCodeSplit, 'python', DEFAULT_LARGEST_NUMBER_TEST_CASES);
  assert.strictEqual(resLargestSplit.status, 'PASSED');
  assert.strictEqual(resLargestSplit.testsPassed, 7);
  console.log('  ✔ Largest number with map(int, input().split()): PASS (7/7)');

  const largestCodeInputs = `a = int(input("Enter first: "))
b = int(input("Enter second: "))
print(max(a, b))
`;
  const resLargestInputs = await evaluateSubmission(largestCodeInputs, 'python', DEFAULT_LARGEST_NUMBER_TEST_CASES);
  assert.strictEqual(resLargestInputs.status, 'PASSED');
  assert.strictEqual(resLargestInputs.testsPassed, 7);
  console.log('  ✔ Largest number with two input() calls on space-separated tokens: PASS (7/7)');

  console.log('\n================================================================');
  console.log('  ALL 9 COMPREHENSIVE EVALUATION MATRIX TESTS PASSED!           ');
  console.log('================================================================');
}

runEvaluatorComprehensiveMatrix().catch((err) => {
  console.error('\n❌ Matrix test failed:', err);
  process.exit(1);
});
