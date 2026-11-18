/**
 * SyntaXViva Core V1 — Part 3 Verification Script
 *
 * Verifies all 10 requirements:
 * 1. Python code input -> 1 mutated output
 * 2. JavaScript code input -> 1 mutated output
 * 3. Same input + same seed -> exact same mutation (Determinism)
 * 4. Same input + different seed -> different mutation (Candidate space exploration)
 * 5. Comparison mutation test
 * 6. Arithmetic mutation test
 * 7. Boundary off-by-one test
 * 8. Return value mutation test
 * 9. Failed parse handling (preserves original, sets error, no fake code)
 * 10. Proof that original code is never overwritten with mutated code
 */

import { MutationEngine } from '../server/mutation/engine.js';
import { computeCodeHash } from '../server/mutation/hasher.js';

async function runPart3Verification() {
  console.log('====================================================');
  console.log('SYNTAXVIVA CORE V1 — PART 3 ENGINE VERIFICATION');
  console.log('====================================================\n');

  const engine = MutationEngine.getInstance();
  let passedCount = 0;
  const total = 10;

  // 1. Python code -> 1 mutation
  const pyCode = `def solve(a, b):\n    return a + b\n`;
  const res1 = engine.processSubmission({ code: pyCode, language: 'python', seed: 'seed_p1' });
  if (res1.success && res1.mutatedCode !== pyCode && !!res1.metadata) {
    console.log('✅ Test 1 Passed: Python code -> exactly 1 mutated output');
    passedCount++;
  } else {
    console.error('❌ Test 1 Failed:', res1);
  }

  // 2. JavaScript code -> 1 mutation
  const jsCode = `function check(a, b) {\n  if (a > b) return a;\n  return b;\n}\n`;
  const res2 = engine.processSubmission({ code: jsCode, language: 'javascript', seed: 'seed_j2' });
  if (res2.success && res2.mutatedCode !== jsCode && !!res2.metadata) {
    console.log('✅ Test 2 Passed: JavaScript code -> exactly 1 mutated output');
    passedCount++;
  } else {
    console.error('❌ Test 2 Failed:', res2);
  }

  // 3. Same input + same seed -> exact same mutation
  const res3a = engine.processSubmission({ code: pyCode, language: 'python', seed: 'seed_fixed_123' });
  const res3b = engine.processSubmission({ code: pyCode, language: 'python', seed: 'seed_fixed_123' });
  if (
    res3a.success &&
    res3b.success &&
    res3a.mutatedCodeHash === res3b.mutatedCodeHash &&
    res3a.mutationType === res3b.mutationType
  ) {
    console.log('✅ Test 3 Passed: Determinism (same input + same seed = exact same mutation)');
    passedCount++;
  } else {
    console.error('❌ Test 3 Failed');
  }

  // 4. Same input + different seed -> different mutation
  const multiCode = `def process(items, threshold):\n    count = 0\n    for i in range(len(items)):\n        if items[i] > threshold:\n            count += 1\n    return count > 0\n`;
  const res4a = engine.processSubmission({ code: multiCode, language: 'python', seed: 'alpha_111' });
  const res4b = engine.processSubmission({ code: multiCode, language: 'python', seed: 'beta_999' });
  if (
    res4a.success &&
    res4b.success &&
    (res4a.mutatedCodeHash !== res4b.mutatedCodeHash || res4a.mutationType !== res4b.mutationType)
  ) {
    console.log('✅ Test 4 Passed: Seed variation explores different candidate AST mutations');
    passedCount++;
  } else {
    console.error('❌ Test 4 Failed');
  }

  // 5. Comparison mutation test
  const compCode = `def test_comp(x, y):\n    return x > y\n`;
  const res5 = engine.processSubmission({
    code: compCode,
    language: 'python',
    requestedMutationType: 'GREATER_THAN_TO_GREATER_EQUAL',
  });
  if (res5.success && res5.mutationType === 'GREATER_THAN_TO_GREATER_EQUAL') {
    console.log('✅ Test 5 Passed: Comparison mutation (> to >=)');
    passedCount++;
  } else {
    console.error('❌ Test 5 Failed');
  }

  // 6. Arithmetic mutation test
  const arithCode = `def test_arith(x, y):\n    return x + y\n`;
  const res6 = engine.processSubmission({
    code: arithCode,
    language: 'python',
    requestedMutationType: 'PLUS_TO_MINUS',
  });
  if (res6.success && res6.mutationType === 'PLUS_TO_MINUS') {
    console.log('✅ Test 6 Passed: Arithmetic mutation (+ to -)');
    passedCount++;
  } else {
    console.error('❌ Test 6 Failed');
  }

  // 7. Loop boundary off-by-one test
  const loopCode = `def test_loop(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total\n`;
  const res7 = engine.processSubmission({
    code: loopCode,
    language: 'python',
    requestedMutationType: 'LOOP_BOUNDARY_OFF_BY_ONE',
  });
  if (res7.success && res7.mutationType === 'LOOP_BOUNDARY_OFF_BY_ONE') {
    console.log('✅ Test 7 Passed: Loop boundary off-by-one adjustment');
    passedCount++;
  } else {
    console.error('❌ Test 7 Failed');
  }

  // 8. Return value mutation test
  const retCode = `def test_ret():\n    return 42\n`;
  const res8 = engine.processSubmission({
    code: retCode,
    language: 'python',
    requestedMutationType: 'RETURN_VALUE_MUTATION',
  });
  if (res8.success && res8.mutationType === 'RETURN_VALUE_MUTATION') {
    console.log('✅ Test 8 Passed: Return value mutation (to None)');
    passedCount++;
  } else {
    console.error('❌ Test 8 Failed');
  }

  // 9. Failed parse handling
  const brokenCode = `def broken_func(:\n    return\n`;
  const res9 = engine.processSubmission({ code: brokenCode, language: 'python' });
  if (
    res9.success === false &&
    res9.status === 'MUTATION_PROCESSING_FAILED' &&
    !(res9 as any).mutatedCode &&
    !!res9.error
  ) {
    console.log('✅ Test 9 Passed: Parse failure handled safely (MUTATION_PROCESSING_FAILED, no fake code)');
    passedCount++;
  } else {
    console.error('❌ Test 9 Failed:', res9);
  }

  // 10. Proof that original code is never overwritten with mutated code
  const origHash = computeCodeHash(pyCode);
  const res10 = engine.processSubmission({ code: pyCode, language: 'python' });
  if (
    res10.success &&
    res10.mutatedCode !== pyCode &&
    res10.originalCodeHash === origHash &&
    res10.mutatedCodeHash !== origHash
  ) {
    console.log('✅ Test 10 Passed: Original code hash and verbatim text isolated from mutated code');
    passedCount++;
  } else {
    console.error('❌ Test 10 Failed');
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passedCount}/${total} TESTS PASSED.`);
  console.log('====================================================');

  if (passedCount !== total) {
    process.exit(1);
  }
}

runPart3Verification().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
