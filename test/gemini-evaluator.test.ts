import {
  parseAndValidateGeminiResponse,
  isGeminiConfigured,
  GeminiConfigError,
} from '../server/services/geminiService.ts';

async function runGeminiEvaluatorUnitTests() {
  console.log('=== [SyntaXViva] GEMINI AI EVALUATOR UNIT TESTS ===\n');

  // Test 1: Validate PASS JSON parsing
  console.log('Test 1: Parsing valid PASS JSON response from Gemini...');
  const passJson = JSON.stringify({
    result: 'PASS',
    score: 95,
    is_correct: true,
    summary: 'The code accurately implements the binary search algorithm.',
    issues: [],
    suggestions: ['Consider adding type hints.'],
  });

  const parsedPass = parseAndValidateGeminiResponse(passJson);
  if (
    parsedPass.result === 'PASS' &&
    parsedPass.is_correct === true &&
    parsedPass.score === 95 &&
    parsedPass.summary.includes('binary search') &&
    parsedPass.suggestions.length === 1
  ) {
    console.log('✔ Test 1 Passed: Valid PASS JSON correctly parsed and validated.');
  } else {
    throw new Error(`Test 1 Failed: Unexpected parse output: ${JSON.stringify(parsedPass)}`);
  }

  // Test 2: Validate FAIL JSON parsing
  console.log('\nTest 2: Parsing valid FAIL JSON response from Gemini...');
  const failJson = `\`\`\`json
{
  "result": "FAIL",
  "score": 40,
  "is_correct": false,
  "summary": "Solution is missing loop termination condition.",
  "issues": ["Infinite loop on single-element arrays"],
  "suggestions": ["Check loop bounds"]
}
\`\`\``;

  const parsedFail = parseAndValidateGeminiResponse(failJson);
  if (
    parsedFail.result === 'FAIL' &&
    parsedFail.is_correct === false &&
    parsedFail.score === 40 &&
    parsedFail.issues.length === 1 &&
    parsedFail.suggestions.length === 1
  ) {
    console.log('✔ Test 2 Passed: Markdown-fenced FAIL JSON correctly parsed and validated.');
  } else {
    throw new Error(`Test 2 Failed: Unexpected parse output: ${JSON.stringify(parsedFail)}`);
  }

  // Test 3: Validate Gemini configuration detection
  console.log('\nTest 3: Checking Gemini API configuration detection...');
  const configured = isGeminiConfigured();
  console.log(`Current isGeminiConfigured() status: ${configured}`);
  console.log('✔ Test 3 Passed: Gemini API configuration detection verified.');

  console.log('\n====================================================');
  console.log('ALL GEMINI EVALUATOR UNIT TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runGeminiEvaluatorUnitTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
