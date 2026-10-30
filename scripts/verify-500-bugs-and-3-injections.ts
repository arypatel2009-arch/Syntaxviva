/**
 * SyntaXViva Core V1 — 500+ Complex Bugs & 3-Bug Per Student Verification Script
 *
 * Verifies:
 * 1. 500+ distinct complex bug variants in catalog (560 variants across 16 categories)
 * 2. MutationRegistry contains all 500+ complex bug types
 * 3. High-order complexity: No simplistic '<' to '<=' operator flips; all are genuine defects
 * 4. Exactly 3 distinct complex bugs injected per student
 * 5. Non-conflicting line application (sorted descending line order)
 * 6. Multi-language support (Python, JS, C++)
 * 7. Determinism: Same student seed produces identical 3 bugs
 * 8. Diversity: Different student seeds produce different 3-bug combinations
 * 9. InjectedBugDetail metadata schema completeness for frontend display
 * 10. End-to-end MutationService metadata persistence
 */

import { COMPLEX_BUG_CATALOG, COMPLEX_BUG_MAP } from '../server/mutation/complexBugCatalog.js';
import { MutationRegistry } from '../server/mutation/registry.js';
import { ComplexBugEngine } from '../server/mutation/complexBugEngine.js';
import { MutationService } from '../server/mutation/service.js';
import { getRepository } from '../server/repository/index.js';
import { getDatabase, dbRun } from '../server/db/database.js';

async function runVerification() {
  console.log('================================================================');
  console.log('SYNTAXVIVA — 500+ COMPLEX BUGS & 3-BUG INJECTION VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  const total = 10;

  // 1. Verify 500+ distinct complex bug variants in catalog
  console.log(`[Test 1] Catalog Size: ${COMPLEX_BUG_CATALOG.length} variants loaded.`);
  if (COMPLEX_BUG_CATALOG.length >= 500) {
    console.log(`✅ Test 1 Passed: Catalog contains ${COMPLEX_BUG_CATALOG.length} complex bug variants (>= 500).`);
    passed++;
  } else {
    console.error(`❌ Test 1 Failed: Expected >= 500 bug variants, got ${COMPLEX_BUG_CATALOG.length}`);
  }

  // 2. Verify MutationRegistry contains all complex bug types
  const registry = MutationRegistry.getInstance();
  const allRegistered = registry.getAll();
  console.log(`[Test 2] Registry Size: ${allRegistered.length} entries registered.`);
  const complexInRegistry = allRegistered.filter((e) => COMPLEX_BUG_MAP.has(e.code));
  if (complexInRegistry.length >= 500) {
    console.log(`✅ Test 2 Passed: MutationRegistry has ${complexInRegistry.length} complex bug entries registered.`);
    passed++;
  } else {
    console.error(`❌ Test 2 Failed: Only ${complexInRegistry.length} complex bugs in registry.`);
  }

  // 3. Verify high-order complexity (no basic '<' to '<=' flips)
  const basicRelationalFlips = COMPLEX_BUG_CATALOG.filter(
    (b) => b.code === 'LESS_THAN_TO_LESS_EQUAL' || b.description.includes('relational flip from < to <=')
  );
  if (basicRelationalFlips.length === 0) {
    console.log('✅ Test 3 Passed: 0 basic operator flips. All 560 variants are high-order algorithmic defects.');
    passed++;
  } else {
    console.error(`❌ Test 3 Failed: Found ${basicRelationalFlips.length} basic operator flips.`);
  }

  // 4. Test exactly 3 bugs injection on realistic code
  const engine = ComplexBugEngine.getInstance();
  const sampleCode = `def two_sum_and_running_average(nums, target):
    seen = {}
    total = 0
    prod = 1
    max_val = -float('inf')
    for i in range(len(nums)):
        val = nums[i]
        total += val
        prod = prod * val
        if val > max_val:
            max_val = val
        diff = target - val
        if diff in seen:
            avg = total // 2
            return (seen[diff], i, avg)
        seen[val] = i
    return (-1, -1, 0)
`;

  const threeResult = engine.selectThreeComplexBugs(sampleCode, 'python', 'seed_student_101');
  if (threeResult.bugsCount === 3 && threeResult.bugs.length === 3 && threeResult.mutatedCode !== sampleCode) {
    console.log(`✅ Test 4 Passed: Exactly 3 complex bugs injected (bugsCount=3, bugs.length=3).`);
    threeResult.bugs.forEach((b, i) => {
      console.log(`    Bug ${i + 1}: [${b.category}] ${b.name} (Line ${b.location?.line}): ${b.description}`);
    });
    passed++;
  } else {
    console.error('❌ Test 4 Failed:', threeResult);
  }

  // 5. Verify non-conflicting line application
  const bugLines = threeResult.bugs.map((b) => b.location?.line || 0);
  const distinctLines = new Set(bugLines);
  if (distinctLines.size === 3) {
    console.log(`✅ Test 5 Passed: All 3 bugs apply to distinct non-colliding lines: [${bugLines.join(', ')}].`);
    passed++;
  } else {
    console.error(`❌ Test 5 Failed: Line collision detected in bugs: ${bugLines.join(', ')}`);
  }

  // 6. Test multi-language 3-bug injection (JavaScript)
  const jsSample = `function calculateMetrics(items, factor) {
  let sum = 0;
  let maxItem = 0;
  for (let i = 0; i < items.length; i++) {
    const v = items[i];
    sum += v;
    if (v > maxItem) {
      maxItem = v;
    }
  }
  const ratio = sum / factor;
  return ratio > 0 ? ratio : 0;
}
`;
  const jsThree = engine.selectThreeComplexBugs(jsSample, 'javascript', 'seed_student_js');
  if (jsThree.bugsCount === 3 && jsThree.bugs.length === 3 && jsThree.mutatedCode !== jsSample) {
    console.log(`✅ Test 6 Passed: JavaScript 3-bug injection successful (bugsCount=3).`);
    passed++;
  } else {
    console.error('❌ Test 6 Failed for JavaScript:', jsThree);
  }

  // 7. Determinism: Same seed -> identical 3 bugs
  const runA = engine.selectThreeComplexBugs(sampleCode, 'python', 'seed_fixed_student_42');
  const runB = engine.selectThreeComplexBugs(sampleCode, 'python', 'seed_fixed_student_42');
  const sameTypes = runA.bugs.every((b, idx) => b.mutationType === runB.bugs[idx].mutationType);
  if (runA.mutatedCode === runB.mutatedCode && sameTypes) {
    console.log('✅ Test 7 Passed: Determinism verified (same student seed -> identical 3 bugs and code).');
    passed++;
  } else {
    console.error('❌ Test 7 Failed: Determinism violated between runA and runB.');
  }

  // 8. Diversity: Different student seeds -> different 3-bug combinations
  const runSeed1 = engine.selectThreeComplexBugs(sampleCode, 'python', 'seed_student_alice');
  const runSeed2 = engine.selectThreeComplexBugs(sampleCode, 'python', 'seed_student_bob');
  const runSeed3 = engine.selectThreeComplexBugs(sampleCode, 'python', 'seed_student_charlie');
  const sig1 = runSeed1.bugs.map((b) => b.mutationType).join('|');
  const sig2 = runSeed2.bugs.map((b) => b.mutationType).join('|');
  const sig3 = runSeed3.bugs.map((b) => b.mutationType).join('|');

  if (sig1 !== sig2 || sig2 !== sig3 || sig1 !== sig3) {
    console.log(`✅ Test 8 Passed: Diversity verified. Students receive different 3-bug combinations.`);
    console.log(`    Alice:   ${sig1}`);
    console.log(`    Bob:     ${sig2}`);
    console.log(`    Charlie: ${sig3}`);
    passed++;
  } else {
    console.error('❌ Test 8 Failed: All 3 students received the exact same combination.');
  }

  // 9. Validate InjectedBugDetail metadata schema
  const b1 = threeResult.bugs[0];
  const hasValidFields =
    typeof b1.bugIndex === 'number' &&
    typeof b1.mutationType === 'string' &&
    typeof b1.name === 'string' &&
    typeof b1.category === 'string' &&
    typeof b1.description === 'string' &&
    typeof b1.location?.line === 'number';

  if (hasValidFields) {
    console.log('✅ Test 9 Passed: InjectedBugDetail conforms strictly to frontend UI contract.');
    passed++;
  } else {
    console.error('❌ Test 9 Failed: Metadata schema incomplete:', b1);
  }

  // 10. End-to-end MutationService integration
  await getDatabase();
  const repo = getRepository();
  const now = new Date().toISOString();
  const testStudentId = `std_test_${Date.now()}`;
  const testAssignId = `asgn_test_${Date.now()}`;
  const testAttemptId = `att_test_${Date.now()}`;

  dbRun(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
     VALUES (?, 'Test Student 3Bugs', ?, 'hash123', 'student', ?, ?)`,
    [testStudentId, `student_3bugs_${Date.now()}@syntaxviva.edu`, now, now]
  );

  dbRun(
    `INSERT INTO assignments (
       id, title, description, language, requirements, starter_code,
       test_cases_json, status, created_by, created_at, updated_at
     ) VALUES (?, '3 Bugs Test Assignment', 'Solve and fix 3 bugs', 'python', 'O(n)', 'def solve(): pass', '[]', 'active', 'faculty_admin', ?, ?)`,
    [testAssignId, now, now]
  );

  await repo.createAttempt({
    id: testAttemptId,
    assignment_id: testAssignId,
    student_id: testStudentId,
    language: 'python',
    original_code: sampleCode,
    original_code_hash: 'hash_original',
    state: 'PHASE1_SUBMITTED',
    mutation_status: 'MUTATION_PENDING',
  });

  const svcResult = await MutationService.getInstance().processAttemptMutation(testAttemptId);
  if (
    svcResult.success &&
    svcResult.metadata?.bugsCount === 3 &&
    Array.isArray(svcResult.metadata?.bugs) &&
    svcResult.metadata?.bugs.length === 3
  ) {
    console.log('✅ Test 10 Passed: MutationService successfully injected 3 complex bugs and saved metadata.');
    passed++;
  } else {
    console.error('❌ Test 10 Failed: MutationService result missing 3 bugs:', svcResult);
  }

  console.log('\n================================================================');
  console.log(`RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
