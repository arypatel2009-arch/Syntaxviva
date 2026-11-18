/**
 * SYNTAXVIVA MANDATORY EVALUATION TEST MATRIX (TESTS A - F)
 *
 * Validates deterministic evaluation at the root level for the Python assignment:
 * "Write a Python program that reads two integers from standard input and prints the larger number."
 *
 * Tests:
 * - TEST A: ORIGINAL CORRECT CODE -> Must PASS (10 25 -> 25)
 * - TEST B: MUTATED BUGGY CODE -> Evaluated deterministically against test cases; fails on behavioral divergence
 * - TEST C: CORRECTED MUTATED CODE -> Restoring intentional mutation must PASS
 * - TEST D: DIFFERENT CORRECT IMPLEMENTATION -> print(max(a, b)) must PASS (behavioral equivalence)
 * - TEST E: INCORRECT IMPLEMENTATION -> print(a + b) must FAIL
 * - TEST F: UNCHANGED MUTATED CODE -> Submitting without fix fails via deterministic test execution
 */

import assert from 'assert';
import { evaluateSubmission, DEFAULT_LARGEST_NUMBER_TEST_CASES, TestCase } from '../server/execution/evaluator.ts';
import { MutationEngine } from '../server/mutation/engine.ts';

async function runDeterministicEvaluationMatrix() {
  console.log('===========================================================');
  console.log('  SYNTAXVIVA DETERMINISTIC EVALUATION TEST MATRIX (A - F)  ');
  console.log('===========================================================\n');

  const testCases: TestCase[] = [
    { input: '10 5\n', expected: '10', description: 'a > b (First is larger)', is_hidden: false },
    { input: '5 10\n', expected: '10', description: 'a < b (Second is larger)', is_hidden: false },
    { input: '7 7\n', expected: '7', description: 'a == b (Equal numbers)', is_hidden: false },
    { input: '10 25\n', expected: '25', description: 'Standard comparison test', is_hidden: false },
    { input: '-4 -10\n', expected: '-4', description: 'Negative numbers', is_hidden: true },
    { input: '0 0\n', expected: '0', description: 'Zeros comparison', is_hidden: true },
    { input: '-50 50\n', expected: '50', description: 'Negative and positive', is_hidden: true },
  ];

  // -------------------------------------------------------------------------
  // TEST A: ORIGINAL CORRECT CODE
  // -------------------------------------------------------------------------
  console.log('TEST A: ORIGINAL CORRECT CODE');
  const originalCode = `a, b = map(int, input().split())

if a > b:
    print(a)
else:
    print(b)
`;

  const evalA = await evaluateSubmission(originalCode, 'python', testCases);
  console.log(`  Result: status=${evalA.status}, passed=${evalA.testsPassed}/${evalA.testsTotal}`);
  if (evalA.failureReason) console.log(`  Failure reason: ${evalA.failureReason}`);
  assert.strictEqual(evalA.status, 'PASSED', 'TEST A: Original correct code MUST PASS');
  assert.strictEqual(evalA.testsPassed, testCases.length, 'TEST A: All tests must pass');
  assert.strictEqual(evalA.testsFailed, 0);
  console.log('  ✔ TEST A PASSED: Original correct code evaluated successfully.\n');

  // -------------------------------------------------------------------------
  // TEST B & C: INTENTIONAL MUTATED BUGGY CODE & REPAIR
  // -------------------------------------------------------------------------
  console.log('TEST B: INTENTIONAL MUTATED BUGGY CODE (Observable Bug)');
  const mutationEngine = MutationEngine.getInstance();
  
  // Test with CONDITIONAL_BRANCH_INVERSION (observable bug: inverted condition)
  const invertedMutation = mutationEngine.processSubmission({
    code: originalCode,
    language: 'python',
    requestedMutationType: 'CONDITIONAL_BRANCH_INVERSION',
  });

  console.log(`  Mutation Type: ${invertedMutation.mutationType}`);
  console.log(`  Intentional Bug Description: ${invertedMutation.metadata?.description}`);
  console.log('  Mutated Code:');
  console.log('  ' + (invertedMutation.mutatedCode || '').trim().split('\n').join('\n  '));

  const evalB = await evaluateSubmission(invertedMutation.mutatedCode!, 'python', testCases);
  console.log(`  Result: status=${evalB.status}, passed=${evalB.testsPassed}/${evalB.testsTotal}, failed=${evalB.testsFailed}`);
  assert.strictEqual(evalB.status, 'FAILED', 'TEST B: Inverted condition must fail deterministic tests');
  assert(evalB.testsFailed > 0, 'TEST B: Observable tests must fail');
  console.log('  ✔ TEST B PASSED: Mutated code deterministically failed observable test cases.\n');

  // -------------------------------------------------------------------------
  // TEST C: CORRECTED MUTATED CODE (Restoring the intentional bug)
  // -------------------------------------------------------------------------
  console.log('TEST C: CORRECTED MUTATED CODE');
  // Student identifies intentional bug in mutatedCode and restores correct condition (if a > b:)
  const correctedCode = invertedMutation.mutatedCode!
    .replace('not (a > b)', 'a > b')
    .replace('a >= b', 'a > b');

  console.log('  Corrected Code:');
  console.log('  ' + correctedCode.trim().split('\n').join('\n  '));

  const evalC = await evaluateSubmission(correctedCode, 'python', testCases);
  console.log(`  Result: status=${evalC.status}, passed=${evalC.testsPassed}/${evalC.testsTotal}`);
  if (evalC.failureReason) console.log(`  Failure reason: ${evalC.failureReason}`);
  assert.strictEqual(evalC.status, 'PASSED', 'TEST C: Corrected code MUST PASS deterministic evaluation');
  assert.strictEqual(evalC.testsPassed, testCases.length, 'TEST C: All test cases must pass');
  assert.strictEqual(evalC.testsFailed, 0);
  console.log('  ✔ TEST C PASSED: Corrected code passed all deterministic tests.\n');

  // -------------------------------------------------------------------------
  // TEST D: DIFFERENT CORRECT IMPLEMENTATION (Behavioral Equivalence)
  // -------------------------------------------------------------------------
  console.log('TEST D: DIFFERENT CORRECT IMPLEMENTATION (Behavioral Equivalence)');
  const differentCorrectCode = `a, b = map(int, input().split())
print(max(a, b))
`;

  const evalD = await evaluateSubmission(differentCorrectCode, 'python', testCases);
  console.log(`  Result: status=${evalD.status}, passed=${evalD.testsPassed}/${evalD.testsTotal}`);
  if (evalD.failureReason) console.log(`  Failure reason: ${evalD.failureReason}`);
  assert.strictEqual(evalD.status, 'PASSED', 'TEST D: print(max(a, b)) MUST PASS based on behavior');
  assert.strictEqual(evalD.testsPassed, testCases.length);
  assert.strictEqual(evalD.testsFailed, 0);
  console.log('  ✔ TEST D PASSED: Alternative implementation passed based on behavioral truth.\n');

  // -------------------------------------------------------------------------
  // TEST E: INCORRECT IMPLEMENTATION
  // -------------------------------------------------------------------------
  console.log('TEST E: INCORRECT IMPLEMENTATION');
  const incorrectCode = `a, b = map(int, input().split())
print(a + b)
`;

  const evalE = await evaluateSubmission(incorrectCode, 'python', testCases);
  console.log(`  Result: status=${evalE.status}, passed=${evalE.testsPassed}/${evalE.testsTotal}, failed=${evalE.testsFailed}`);
  assert.strictEqual(evalE.status, 'FAILED', 'TEST E: print(a + b) MUST FAIL');
  assert(evalE.testsFailed > 0);
  console.log('  ✔ TEST E PASSED: Incorrect implementation failed as expected.\n');

  // -------------------------------------------------------------------------
  // TEST F: UNCHANGED MUTATED CODE
  // -------------------------------------------------------------------------
  console.log('TEST F: UNCHANGED MUTATED CODE');
  // Submitting the mutated code without fixing it.
  // Evaluation MUST run deterministic tests and fail on behavioral mismatch (not source string checks).
  const evalF = await evaluateSubmission(invertedMutation.mutatedCode!, 'python', testCases);
  console.log(`  Result: status=${evalF.status}, passed=${evalF.testsPassed}/${evalF.testsTotal}, failed=${evalF.testsFailed}`);
  assert.strictEqual(evalF.status, 'FAILED', 'TEST F: Unchanged mutated code must fail on test behavior');
  assert(evalF.testsFailed > 0);
  console.log('  ✔ TEST F PASSED: Unchanged mutated code failed deterministically on test assertions.\n');

  console.log('===========================================================');
  console.log('  ALL MANDATORY TEST MATRIX CASES (A - F) PASSED!         ');
  console.log('===========================================================');
}

runDeterministicEvaluationMatrix().catch((err) => {
  console.error('Test matrix failure:', err);
  process.exit(1);
});
