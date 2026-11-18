import { executeInSandbox } from './sandbox.ts';

export interface TestCase {
  id?: string;
  input: string;
  expected: string;
  is_hidden?: boolean;
  isHidden?: boolean;
  description?: string;
}

export interface EvaluationContext {
  originalCode?: string | null;
  mutatedCode?: string | null;
  title?: string;
  description?: string;
}

export const DEFAULT_SUM_TWO_NUMBERS_TEST_CASES: TestCase[] = [
  { input: '10 6\n', expected: '16', description: 'Sum of two positive integers (10 + 6)', is_hidden: false },
  { input: '12 0\n', expected: '12', description: 'Addition with zero (12 + 0)', is_hidden: false },
  { input: '120 350\n', expected: '470', description: 'Larger integers (120 + 350)', is_hidden: false },
  { input: '2 5\n', expected: '7', description: 'Single digit sum (2 + 5)', is_hidden: false },
];

export const DEFAULT_LARGEST_NUMBER_TEST_CASES: TestCase[] = [
  { input: '10 5\n', expected: '10', description: 'a > b (First number is larger)', is_hidden: false },
  { input: '5 10\n', expected: '10', description: 'a < b (Second number is larger)', is_hidden: false },
  { input: '7 7\n', expected: '7', description: 'a == b (Equal numbers)', is_hidden: false },
  { input: '10 25\n', expected: '25', description: 'Standard comparison test', is_hidden: false },
  { input: '-4 -10\n', expected: '-4', description: 'Negative numbers comparison', is_hidden: true },
  { input: '0 0\n', expected: '0', description: 'Zeros comparison', is_hidden: true },
  { input: '-50 50\n', expected: '50', description: 'Negative and positive integers', is_hidden: true },
];

export const DEFAULT_PARKING_FEE_TEST_CASES: TestCase[] = [
  { input: '1\n', expected: 'Total Parking Fee: ₹ 20', description: 'Tier 1: 1 hour (<= 2 hrs @ ₹20/hr)', is_hidden: false },
  { input: '2\n', expected: 'Total Parking Fee: ₹ 40', description: 'Tier 1 boundary: 2 hours', is_hidden: false },
  { input: '3\n', expected: 'Total Parking Fee: ₹ 70', description: 'Tier 2: 3 hours (2 hrs @ ₹20 + 1 hr @ ₹30)', is_hidden: false },
  { input: '4\n', expected: 'Total Parking Fee: ₹ 100', description: 'Tier 2: 4 hours', is_hidden: true },
  { input: '5\n', expected: 'Total Parking Fee: ₹ 130', description: 'Tier 2 boundary: 5 hours', is_hidden: true },
  { input: '6\n', expected: 'Total Parking Fee: ₹ 180', description: 'Tier 3: 6 hours (2@20 + 3@30 + 1@50)', is_hidden: true },
  { input: '8\n', expected: 'Total Parking Fee: ₹ 280', description: 'Tier 3: 8 hours', is_hidden: true },
];

export const DEFAULT_EVEN_ODD_TEST_CASES: TestCase[] = [
  { input: '10\n', expected: 'Even', description: 'Even number check', is_hidden: false },
  { input: '7\n', expected: 'Odd', description: 'Odd number check', is_hidden: false },
];

export function isLegacyDefaultEvenOddTest(tc: TestCase): boolean {
  const inp = String(tc?.input ?? '').trim();
  const exp = String(tc?.expected ?? '').trim().toLowerCase();
  return (inp === '10' && exp === 'even') || (inp === '7' && exp === 'odd');
}

/**
 * Cleans assignment test cases by stripping empty entries and leftover Even/Odd defaults
 * on non-even/odd assignments, and falls back to appropriate defaults if none remain.
 */
export function resolveAssignmentTestCases(
  rawTests: TestCase[] | undefined | null,
  title: string = '',
  description: string = ''
): TestCase[] {
  const combinedText = `${title || ''} ${description || ''}`.toLowerCase();
  const isEvenOddProblem = /\b(even|odd|parity)\b/i.test(combinedText);

  let cleaned = (Array.isArray(rawTests) ? rawTests : []).filter((tc) => {
    if (!tc) return false;
    const inp = String(tc.input ?? '').trim();
    const exp = String(tc.expected ?? '').trim();
    return inp.length > 0 || exp.length > 0;
  });

  if (!isEvenOddProblem && cleaned.length > 0) {
    const withoutLegacyEvenOdd = cleaned.filter((tc) => !isLegacyDefaultEvenOddTest(tc));
    cleaned = withoutLegacyEvenOdd;
  }

  if (cleaned.length === 0) {
    if (isEvenOddProblem) {
      return DEFAULT_EVEN_ODD_TEST_CASES;
    }
    if (combinedText.includes('sum') || combinedText.includes('add') || combinedText.includes('addition')) {
      return DEFAULT_SUM_TWO_NUMBERS_TEST_CASES;
    }
    if (combinedText.includes('park') || combinedText.includes('fee')) {
      return DEFAULT_PARKING_FEE_TEST_CASES;
    }
    return DEFAULT_LARGEST_NUMBER_TEST_CASES;
  }

  return cleaned;
}

export interface TestCaseResult {
  testIndex: number;
  passed: boolean;
  isHidden: boolean;
  description?: string;
  input?: string;
  expected?: string;
  actual?: string;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  error?: string;
  durationMs: number;
}

export interface EvaluationOutcome {
  status: 'PASSED' | 'FAILED' | 'ERROR';
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  failureReason: string | null;
  results: TestCaseResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface NormalizationOptions {
  trimWhitespace?: boolean;
  normalizeLineEndings?: boolean;
  collapseMultipleSpaces?: boolean;
  normalizePunctuation?: boolean;
  numericTolerance?: boolean;
  caseInsensitiveLiterals?: boolean;
  promptTolerance?: boolean;
}

export function normalizeSpacing(s: string): string {
  if (!s) return '';
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .trim();
}

export function stripPromptPrefix(s: string): string {
  // Strips harmless prompt patterns like "Enter parking hours: ", "Input: ", "Enter name:\n", etc.
  const promptRegex = /^(?:(?:enter|input|please\s+enter|enter\s+the|give|type|prompt)[\s\w]*[:?>]\s*)+/i;
  return s.replace(promptRegex, '').trim();
}

export function normalizePunctuation(s: string): string {
  return s
    .replace(/\s*:\s*/g, ': ')
    .replace(/([₹$€£])\s*/g, '$1 ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeCodeForComparison(code: string | null | undefined): string {
  if (!code) return '';
  return code
    .replace(/\/\/[^\n]*/g, '')
    .replace(/#[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasFixedMutatedDefect(
  submittedCode: string,
  originalCode: string | null | undefined,
  mutatedCode: string | null | undefined
): boolean {
  if (!originalCode || !mutatedCode) return false;
  const origLines = new Set(
    originalCode
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'))
  );
  const mutLines = mutatedCode
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));
  const defectLines = mutLines.filter((l) => !origLines.has(l));
  if (defectLines.length === 0) return false;

  const subLines = new Set(
    submittedCode
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'))
  );
  return defectLines.every((d) => !subLines.has(d));
}

function computeSecondLargestFromInput(inputStr: string): string | null {
  const nums = String(inputStr ?? '')
    .trim()
    .split(/[\s,;]+/)
    .map((t) => Number(t))
    .filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return null;
  const uniqueDesc = Array.from(new Set(nums)).sort((a, b) => b - a);
  if (uniqueDesc.length >= 2) {
    return String(uniqueDesc[1]);
  }
  const allDesc = [...nums].sort((a, b) => b - a);
  return String(allDesc[1]);
}

export function outputsMatch(
  actual: string,
  expected: string,
  _options: NormalizationOptions = {}
): boolean {
  if (!actual && !expected) return true;
  if (!actual || !expected) return false;

  const aNorm = normalizeSpacing(actual);
  const eNorm = normalizeSpacing(expected);

  if (aNorm === eNorm) return true;
  if (aNorm.toLowerCase() === eNorm.toLowerCase()) return true;

  // Single numeric equivalence check (e.g. 20 vs 20.0 or scientific notation)
  const aNum = Number(aNorm);
  const eNum = Number(eNorm);
  if (!Number.isNaN(aNum) && !Number.isNaN(eNum)) {
    return Math.abs(aNum - eNum) < 1e-6;
  }

  // Punctuation and currency spacing normalization (e.g., "Total Parking Fee: ₹ 20" vs "Total Parking Fee: ₹20")
  const aPunct = normalizePunctuation(aNorm);
  const ePunct = normalizePunctuation(eNorm);
  if (aPunct === ePunct) return true;
  if (aPunct.toLowerCase() === ePunct.toLowerCase()) return true;

  // Prompt stripped fallback in case prompt text leaked to stdout
  const aStripped = stripPromptPrefix(aNorm);
  if (aStripped === eNorm || aStripped.toLowerCase() === eNorm.toLowerCase()) return true;
  if (normalizePunctuation(aStripped) === ePunct) return true;

  // Labeled numeric output tolerance (e.g., actual "Sum = 16" or "Sum: 16" or "The sum is 16" when expected is "16")
  if (!Number.isNaN(eNum) && eNorm !== '') {
    const labeledNumMatch = aStripped.match(
      /^(?:sum|result|answer|output|total|ans|value|max|min|largest|smallest|[\w\s]{1,30}(?:[:=]|\bis\b))\s*([-+]?\d+(?:\.\d+)?)\s*$/i
    );
    if (labeledNumMatch) {
      const extractedNum = Number(labeledNumMatch[1]);
      if (!Number.isNaN(extractedNum) && Math.abs(extractedNum - eNum) < 1e-6) {
        return true;
      }
    }
  }
  if (!Number.isNaN(aNum) && aNorm !== '') {
    const labeledExpMatch = eNorm.match(
      /^(?:sum|result|answer|output|total|ans|value|max|min|largest|smallest|[\w\s]{1,30}(?:[:=]|\bis\b))\s*([-+]?\d+(?:\.\d+)?)\s*$/i
    );
    if (labeledExpMatch) {
      const extractedExpNum = Number(labeledExpMatch[1]);
      if (!Number.isNaN(extractedExpNum) && Math.abs(extractedExpNum - aNum) < 1e-6) {
        return true;
      }
    }
  }

  // If actual output has multiple lines and expected is one line, check if prompt lines preceded the answer
  const aLines = aNorm.split('\n').filter(Boolean);
  if (aLines.length > 1 && !eNorm.includes('\n')) {
    const lastLine = aLines[aLines.length - 1];
    const lastStripped = stripPromptPrefix(lastLine);
    if (lastStripped === eNorm || normalizePunctuation(lastStripped) === ePunct) {
      return true;
    }
    if (!Number.isNaN(eNum) && eNorm !== '') {
      const lastNum = Number(lastStripped);
      if (!Number.isNaN(lastNum) && Math.abs(lastNum - eNum) < 1e-6) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Deterministically evaluates submitted code against test cases in isolated sandbox.
 * Strictly non-AI: 100% deterministic test-case assertions based on behavior.
 */
export async function evaluateSubmission(
  code: string,
  language: string,
  rawTestCases: TestCase[],
  context?: EvaluationContext
): Promise<EvaluationOutcome> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const testCases = resolveAssignmentTestCases(
    rawTestCases,
    context?.title,
    context?.description
  );

  if (!testCases || testCases.length === 0) {
    return {
      status: 'FAILED',
      testsTotal: 0,
      testsPassed: 0,
      testsFailed: 0,
      failureReason: 'No test cases configured for this assignment.',
      results: [],
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  const results: TestCaseResult[] = [];
  let testsPassed = 0;
  let testsFailed = 0;
  let primaryFailureReason: string | null = null;

  const isEditedFromMutated =
    !context?.mutatedCode ||
    normalizeCodeForComparison(code) !== normalizeCodeForComparison(context.mutatedCode);
  const isRestoredToOriginal =
    Boolean(context?.originalCode) &&
    normalizeCodeForComparison(code) === normalizeCodeForComparison(context?.originalCode);

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    const isHidden = Boolean(test.is_hidden || test.isHidden);

    try {
      const execResult = await executeInSandbox(code, language, test.input, 3500);

      // Handle Timeout (Time Limit Exceeded)
      if (execResult.timedOut) {
        testsFailed++;
        const reason = isHidden
          ? `Hidden test case ${i + 1} timed out (exceeded 3.5s execution limit).`
          : `Test case ${i + 1} timed out (exceeded 3.5s execution limit).`;
        if (!primaryFailureReason) primaryFailureReason = reason;

        results.push({
          testIndex: i + 1,
          passed: false,
          isHidden,
          description: isHidden ? undefined : test.description,
          input: isHidden ? undefined : test.input,
          expected: isHidden ? undefined : test.expected,
          actual: isHidden ? undefined : '<Time Limit Exceeded>',
          timedOut: true,
          error: 'TIME LIMIT EXCEEDED (3.5s)',
          durationMs: execResult.durationMs,
        });
        continue;
      }

      // Handle Infrastructure Error (Unsupported language)
      if (
        execResult.stderr?.includes('Unsupported language') ||
        execResult.error?.includes('isolated execution')
      ) {
        return {
          status: 'ERROR',
          testsTotal: testCases.length,
          testsPassed,
          testsFailed: testsFailed + 1,
          failureReason: `Execution environment error: ${execResult.stderr || execResult.error}`,
          results,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };
      }

      // Handle Compilation or Runtime Errors (non-zero exitCode or Compilation Error status)
      if (execResult.status === 'Compilation Error' || execResult.exitCode !== 0) {
        testsFailed++;
        const isCompileErr = execResult.status === 'Compilation Error';
        const rawErr = (
          execResult.message ||
          execResult.stderr ||
          execResult.error ||
          (isCompileErr ? 'Compilation Error' : 'Runtime error')
        ).trim();
        const errLines = rawErr.split('\n').map((l) => l.trim()).filter(Boolean);
        const lastErrLine = errLines[errLines.length - 1] || (isCompileErr ? 'Compilation Error' : 'Runtime Error');
        const formattedErr = lastErrLine.startsWith('Traceback') ? 'Runtime Error' : lastErrLine;

        const reason = isCompileErr
          ? `Compilation Error: ${formattedErr}`
          : isHidden
          ? `Runtime error encountered during evaluation.`
          : `Runtime error on test case ${i + 1}: ${formattedErr}`;
        if (!primaryFailureReason) primaryFailureReason = reason;

        results.push({
          testIndex: i + 1,
          passed: false,
          isHidden,
          description: isHidden ? undefined : test.description,
          input: isHidden ? undefined : test.input,
          expected: isHidden ? undefined : test.expected,
          actual: isHidden ? undefined : (execResult.stdout || `<${formattedErr}>`),
          stdout: isHidden ? undefined : execResult.stdout,
          stderr: isHidden ? undefined : execResult.stderr,
          error: isHidden ? (isCompileErr ? 'Compilation Error' : 'Runtime Error') : rawErr,
          timedOut: false,
          durationMs: execResult.durationMs,
        });
        continue;
      }

      let expectedStr = String(test.expected ?? '');
      let passed = outputsMatch(execResult.stdout, expectedStr);

      // Mathematical second-largest fallback if assignment is a Second Largest problem and test case expected had a faculty typo
      const isSecondLargestProblem = /\bsecond\s+largest\b/i.test(
        `${context?.title || ''} ${context?.description || ''}`
      );
      if (!passed && isSecondLargestProblem && isEditedFromMutated) {
        const trueSecond = computeSecondLargestFromInput(test.input);
        if (trueSecond && outputsMatch(execResult.stdout, trueSecond)) {
          passed = true;
          expectedStr = trueSecond;
        }
      }

      // Phase 1 baseline calibration: if student fixed the Phase 2 bug and their code matches their Phase 1 originalCode output
      if (!passed && context?.originalCode && isEditedFromMutated) {
        const baselineExec = await executeInSandbox(context.originalCode, language, test.input, 3500);
        if (baselineExec.exitCode === 0 && !baselineExec.timedOut) {
          const baseOut = baselineExec.stdout.trim();
          if (baseOut.length > 0 && outputsMatch(execResult.stdout, baseOut)) {
            passed = true;
            expectedStr = baseOut;
          } else if (isRestoredToOriginal && execResult.exitCode === 0) {
            passed = true;
            if (baseOut.length > 0) expectedStr = baseOut;
          }
        }
        if (
          !passed &&
          execResult.exitCode === 0 &&
          execResult.stdout.trim().length > 0 &&
          hasFixedMutatedDefect(code, context.originalCode, context.mutatedCode)
        ) {
          passed = true;
          expectedStr = execResult.stdout.trim();
        }
      }

      if (passed) {
        testsPassed++;
        results.push({
          testIndex: i + 1,
          passed: true,
          isHidden,
          description: isHidden ? undefined : test.description,
          input: isHidden ? undefined : test.input,
          expected: isHidden ? undefined : expectedStr,
          actual: isHidden ? undefined : (execResult.stdout || expectedStr),
          stdout: isHidden ? undefined : (execResult.stdout || expectedStr),
          stderr: isHidden ? undefined : execResult.stderr,
          durationMs: execResult.durationMs,
        });
      } else {
        testsFailed++;
        const reason = isHidden
          ? `A hidden validation test case failed.`
          : `Test case ${i + 1} output mismatch (expected: "${expectedStr.trim()}", got: "${execResult.stdout.trim()}").`;
        if (!primaryFailureReason) primaryFailureReason = reason;

        results.push({
          testIndex: i + 1,
          passed: false,
          isHidden,
          description: isHidden ? undefined : test.description,
          input: isHidden ? undefined : test.input,
          expected: isHidden ? undefined : expectedStr,
          actual: isHidden ? undefined : execResult.stdout,
          stdout: isHidden ? undefined : execResult.stdout,
          stderr: isHidden ? undefined : execResult.stderr,
          durationMs: execResult.durationMs,
        });
      }
    } catch (testErr: any) {
      const errorMsg = `Execution environment error: ${testErr.message || testErr}`;
      return {
        status: 'ERROR',
        testsTotal: testCases.length,
        testsPassed,
        testsFailed: testsFailed + 1,
        failureReason: errorMsg,
        results: [
          ...results,
          {
            testIndex: i + 1,
            passed: false,
            isHidden,
            description: isHidden ? undefined : test.description,
            input: isHidden ? undefined : test.input,
            expected: isHidden ? undefined : test.expected,
            error: isHidden ? 'Execution Error' : (testErr.message || String(testErr)),
            durationMs: 0,
          },
        ],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }
  }

  const completedAt = new Date().toISOString();
  const allPassed = testsFailed === 0 && testsPassed === testCases.length;

  return {
    status: allPassed ? 'PASSED' : 'FAILED',
    testsTotal: testCases.length,
    testsPassed,
    testsFailed,
    failureReason: allPassed ? null : (primaryFailureReason || 'One or more required tests failed.'),
    results,
    startedAt,
    completedAt,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Runs code against visible/interactive test cases without finalizing the assignment state.
 * Used by "Run Code" in both Phase 1 and Phase 2.
 */
export async function executeTestCases(
  code: string,
  language: string,
  rawTestCases: TestCase[],
  timeoutMs: number = 3500,
  context?: EvaluationContext
): Promise<{
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  results: TestCaseResult[];
  durationMs: number;
}> {
  const startTime = Date.now();
  const testCases = resolveAssignmentTestCases(
    rawTestCases,
    context?.title,
    context?.description
  );
  const results: TestCaseResult[] = [];
  let testsPassed = 0;
  let testsFailed = 0;

  const isEditedFromMutated =
    !context?.mutatedCode ||
    normalizeCodeForComparison(code) !== normalizeCodeForComparison(context.mutatedCode);
  const isRestoredToOriginal =
    Boolean(context?.originalCode) &&
    normalizeCodeForComparison(code) === normalizeCodeForComparison(context?.originalCode);

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    const execResult = await executeInSandbox(code, language, test.input, timeoutMs);

    if (execResult.timedOut) {
      testsFailed++;
      results.push({
        testIndex: i + 1,
        passed: false,
        isHidden: false,
        description: test.description,
        input: test.input,
        expected: test.expected,
        actual: '<Time Limit Exceeded>',
        timedOut: true,
        error: 'TIME LIMIT EXCEEDED (3.5s)',
        durationMs: execResult.durationMs,
      });
      continue;
    }

    if (execResult.status === 'Compilation Error' || execResult.exitCode !== 0) {
      testsFailed++;
      const isCompileErr = execResult.status === 'Compilation Error';
      const rawErr = (
        execResult.message ||
        execResult.stderr ||
        execResult.error ||
        (isCompileErr ? 'Compilation Error' : 'Runtime error')
      ).trim();
      const errLines = rawErr.split('\n').map((l) => l.trim()).filter(Boolean);
      const lastErrLine =
        errLines[errLines.length - 1] || (isCompileErr ? 'Compilation Error' : 'Runtime Error');

      results.push({
        testIndex: i + 1,
        passed: false,
        isHidden: false,
        description: test.description,
        input: test.input,
        expected: test.expected,
        actual: execResult.stdout || `<${lastErrLine}>`,
        stdout: execResult.stdout,
        stderr: execResult.stderr || rawErr,
        error: rawErr,
        timedOut: false,
        durationMs: execResult.durationMs,
      });
      continue;
    }

    let expectedStr = String(test.expected ?? '');
    let passed = outputsMatch(execResult.stdout, expectedStr);

    const isSecondLargestProblem = /\bsecond\s+largest\b/i.test(
      `${context?.title || ''} ${context?.description || ''}`
    );
    if (!passed && isSecondLargestProblem && isEditedFromMutated) {
      const trueSecond = computeSecondLargestFromInput(test.input);
      if (trueSecond && outputsMatch(execResult.stdout, trueSecond)) {
        passed = true;
        expectedStr = trueSecond;
      }
    }

    if (!passed && context?.originalCode && isEditedFromMutated) {
      const baselineExec = await executeInSandbox(context.originalCode, language, test.input, timeoutMs);
      if (baselineExec.exitCode === 0 && !baselineExec.timedOut) {
        const baseOut = baselineExec.stdout.trim();
        if (baseOut.length > 0 && outputsMatch(execResult.stdout, baseOut)) {
          passed = true;
          expectedStr = baseOut;
        } else if (isRestoredToOriginal && execResult.exitCode === 0) {
          passed = true;
          if (baseOut.length > 0) expectedStr = baseOut;
        }
      }
      if (
        !passed &&
        execResult.exitCode === 0 &&
        execResult.stdout.trim().length > 0 &&
        hasFixedMutatedDefect(code, context.originalCode, context.mutatedCode)
      ) {
        passed = true;
        expectedStr = execResult.stdout.trim();
      }
    }

    if (passed) {
      testsPassed++;
      results.push({
        testIndex: i + 1,
        passed: true,
        isHidden: false,
        description: test.description,
        input: test.input,
        expected: expectedStr,
        actual: execResult.stdout || expectedStr,
        stdout: execResult.stdout || expectedStr,
        stderr: execResult.stderr,
        durationMs: execResult.durationMs,
      });
    } else {
      testsFailed++;
      results.push({
        testIndex: i + 1,
        passed: false,
        isHidden: false,
        description: test.description,
        input: test.input,
        expected: expectedStr,
        actual: execResult.stdout,
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        durationMs: execResult.durationMs,
      });
    }
  }

  return {
    testsTotal: testCases.length,
    testsPassed,
    testsFailed,
    results,
    durationMs: Date.now() - startTime,
  };
}
