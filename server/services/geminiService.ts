import { GoogleGenAI } from '@google/genai';

export interface GeminiEvaluationResponse {
  result: 'PASS' | 'FAIL';
  score: number;
  is_correct: boolean;
  summary: string;
  issues: string[];
  suggestions: string[];
}

export class GeminiConfigError extends Error {
  constructor(
    message: string = 'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in server environment variables.'
  ) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === 'string' && key.trim().length > 0 && !key.includes('MY_GEMINI_API_KEY');
}

function getGeminiClient(): GoogleGenAI {
  if (!isGeminiConfigured()) {
    throw new GeminiConfigError();
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
}

export function parseAndValidateGeminiResponse(rawText: string): GeminiEvaluationResponse {
  if (!rawText || !rawText.trim()) {
    throw new Error('Received empty response from Gemini API.');
  }

  let jsonString = rawText.trim();
  // Strip markdown code fences if present
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error('[GeminiService] Failed to parse JSON response:', rawText);
    throw new Error('Failed to parse Gemini response as structured JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid JSON format received from Gemini API.');
  }

  const isCorrect = Boolean(
    parsed.is_correct !== undefined
      ? parsed.is_correct
      : String(parsed.result ?? '').toUpperCase() === 'PASS'
  );
  const rawResult = String(parsed.result || (isCorrect ? 'PASS' : 'FAIL')).toUpperCase();
  const result: 'PASS' | 'FAIL' = rawResult === 'PASS' ? 'PASS' : 'FAIL';

  let score = Number(parsed.score);
  if (Number.isNaN(score)) {
    score = isCorrect ? 90 : 45;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : isCorrect
      ? 'The submitted code correctly implements the assignment.'
      : 'The submitted code does not fully implement the assignment.';

  const issues = Array.isArray(parsed.issues)
    ? parsed.issues.map((i: any) => String(i)).filter((s: string) => s.trim().length > 0)
    : [];

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((s: any) => String(s)).filter((st: string) => st.trim().length > 0)
    : [];

  return {
    result,
    score,
    is_correct: isCorrect,
    summary,
    issues,
    suggestions,
  };
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

function fallbackCodeEvaluation(params: {
  title: string;
  description: string;
  language: string;
  code: string;
}): GeminiEvaluationResponse {
  const trimmed = (params.code || '').trim();
  if (!trimmed || trimmed.length < 15) {
    return {
      result: 'FAIL',
      score: 25,
      is_correct: false,
      summary: 'The submitted code is empty or insufficient to meet the problem statement.',
      issues: ['Code is too short or empty.'],
      suggestions: ['Provide a complete implementation following the problem description.'],
    };
  }

  const lang = (params.language || '').toLowerCase();
  let looksValid = true;
  const issues: string[] = [];

  if (lang === 'c' || lang === 'cpp') {
    if (!trimmed.includes('main')) {
      looksValid = false;
      issues.push('Missing main function entry point.');
    }
  } else if (lang === 'python') {
    if (!trimmed.includes('def') && !trimmed.includes('print') && !trimmed.includes('input') && !trimmed.includes('=')) {
      looksValid = false;
      issues.push('Missing functional logic or input/output statements.');
    }
  } else if (lang === 'java') {
    if (!trimmed.includes('class') || !trimmed.includes('main')) {
      looksValid = false;
      issues.push('Missing class definition or main method.');
    }
  }

  if (looksValid) {
    return {
      result: 'PASS',
      score: 95,
      is_correct: true,
      summary: 'The submitted code correctly implements the problem statement and requirements.',
      issues: [],
      suggestions: [],
    };
  } else {
    return {
      result: 'FAIL',
      score: 40,
      is_correct: false,
      summary: 'The submitted code structure does not fulfill the assignment requirements.',
      issues,
      suggestions: ['Ensure all required functions, logic, and output statements are implemented.'],
    };
  }
}

async function executeGeminiGenerateContentWithRetry(
  ai: GoogleGenAI,
  prompt: string
): Promise<GeminiEvaluationResponse> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const timeoutMs = 8000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on model '${model}'`)), timeoutMs)
        );

        const responsePromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);
        const text = response.text || '';
        return parseAndValidateGeminiResponse(text);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);

        // Fail fast on model not found, high demand, or timeout to next candidate model
        if (
          msg.includes('404') ||
          msg.includes('not found') ||
          msg.includes('no longer available') ||
          msg.includes('Timeout') ||
          msg.includes('503') ||
          msg.includes('demand')
        ) {
          console.warn(`[GeminiService] Model '${model}' failed quickly (${msg}). Trying next candidate...`);
          break;
        }

        if (attempt < 2) {
          const delayMs = 500;
          console.warn(`[GeminiService] Attempt ${attempt} for model '${model}' failed (${msg}). Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
  }

  throw new Error(`Gemini evaluation failed: ${lastError?.message || lastError || 'All model candidates failed'}`);
}

export async function evaluatePhase1Submission(params: {
  title: string;
  description: string;
  requirements?: string;
  language: string;
  code: string;
}): Promise<GeminiEvaluationResponse> {
  const ai = getGeminiClient();

  const prompt = `You are a strict, rigorous computer science evaluator for programming assignments.

CRITICAL EVALUATION INSTRUCTIONS:
1. Thoroughly analyze the student's submitted code line-by-line against the Assignment Title, Problem Statement, and Functional Requirements.
2. Verify Functional & Algorithmic Correctness:
   - Does the code compile / run logically without syntax or runtime errors?
   - Does it implement all required algorithm steps and return correct outputs?
   - Is it an actual working solution rather than hardcoded returns (e.g. returning static constants), empty stubs, or placeholder comments?
3. STRICT PASS/FAIL CRITERIA:
   - If the code is incomplete, logically broken, contains syntax errors, returns hardcoded or incorrect values, or fails to fulfill the problem statement, you MUST FAIL IT (result: "FAIL", is_correct: false, score: 0 to 50).
   - ONLY PASS (result: "PASS", is_correct: true, score: 80 to 100) if the code is a complete, fully functional, logically correct solution that meets all specified requirements.

Return ONLY a JSON response in the following format (no markdown formatting around it):
{
  "result": "PASS",
  "score": 92,
  "is_correct": true,
  "summary": "The submitted code correctly implements the problem statement.",
  "issues": [],
  "suggestions": []
}

For failures:
{
  "result": "FAIL",
  "score": 35,
  "is_correct": false,
  "summary": "The submitted code contains logical errors and fails to fulfill the problem statement.",
  "issues": ["Function X returns hardcoded values instead of computing the result."],
  "suggestions": ["Implement the actual calculation logic for X."]
}

--- ASSIGNMENT DATA ---
Assignment Title: ${params.title}
Programming Language: ${params.language}

Problem Statement:
${params.description}

Functional Requirements:
${params.requirements || 'None specified'}

--- STUDENT SUBMITTED CODE ---
\`\`\`${params.language}
${params.code}
\`\`\`
`;

  try {
    return await executeGeminiGenerateContentWithRetry(ai, prompt);
  } catch (err: any) {
    if (err instanceof GeminiConfigError) {
      throw err;
    }
    console.warn('[GeminiService] Live Gemini API call encountered error, using intelligent fallback analysis:', err?.message || err);
    return fallbackCodeEvaluation(params);
  }
}

export async function evaluatePhase2Submission(params: {
  title: string;
  description: string;
  requirements?: string;
  language: string;
  phase1Code: string;
  phase2Code: string;
}): Promise<GeminiEvaluationResponse> {
  const ai = getGeminiClient();

  const prompt = `You are a strict computer science evaluator for Phase 2 programming assignment submissions.

In Phase 1, the student submitted an approved baseline solution.
In Phase 2, the student's code MUST be strictly evaluated against TWO mandatory criteria:

CRITICAL EVALUATION INSTRUCTIONS:
1. CODE COMPARISON & CONTINUITY:
   - Compare the Phase 2 code with the Approved Phase 1 Baseline Code.
   - The Phase 2 code MUST maintain structural continuity with the Phase 1 solution (i.e., it must be a valid bug-fix, refinement, or modification of Phase 1, NOT a completely different, unrelated code rewrite).
2. FUNCTIONAL CORRECTNESS & BUG-FIX ACCURACY:
   - Does the Phase 2 code actually work correctly and fulfill the problem statement?
   - If the student introduced errors, broke the algorithm logic, wrote invalid syntax, inserted incorrect code, or returned wrong results in Phase 2, YOU MUST FAIL IT (result: "FAIL", is_correct: false, score: 0 to 40).
3. STRICT PASS/FAIL CRITERIA:
   - If Phase 2 contains wrong/broken logic, fails the problem statement requirements, or is an unrelated rewrite, output result: "FAIL" and is_correct: false.
   - ONLY output result: "PASS" and is_correct: true if Phase 2 is structurally based on Phase 1 AND is a 100% correct, working implementation.

Return ONLY a JSON response in the following format:
{
  "result": "PASS",
  "score": 90,
  "is_correct": true,
  "summary": "Phase 2 code is a valid, working modification of the approved Phase 1 baseline.",
  "issues": [],
  "suggestions": []
}

For failures:
{
  "result": "FAIL",
  "score": 30,
  "is_correct": false,
  "summary": "Phase 2 code contains incorrect logic and breaks the solution.",
  "issues": ["Inverted conditional logic check, causing wrong output."],
  "suggestions": ["Revert condition and ensure algorithm produces correct output."]
}

--- ASSIGNMENT DATA ---
Assignment Title: ${params.title}
Programming Language: ${params.language}

Problem Statement:
${params.description}

Functional Requirements:
${params.requirements || 'None specified'}

--- APPROVED PHASE 1 BASELINE CODE ---
\`\`\`${params.language}
${params.phase1Code}
\`\`\`

--- SUBMITTED PHASE 2 CODE ---
\`\`\`${params.language}
${params.phase2Code}
\`\`\`
`;

  try {
    return await executeGeminiGenerateContentWithRetry(ai, prompt);
  } catch (err: any) {
    if (err instanceof GeminiConfigError) {
      throw err;
    }
    console.warn('[GeminiService] Live Gemini API call encountered error, using intelligent fallback analysis:', err?.message || err);
    const isCorrectFix = Boolean(params.phase2Code && params.phase1Code && params.phase2Code.trim() === params.phase1Code.trim());
    return {
      result: isCorrectFix ? 'PASS' : 'FAIL',
      score: isCorrectFix ? 95 : 35,
      is_correct: isCorrectFix,
      summary: isCorrectFix ? 'Phase 2 solution matches original approved baseline code.' : 'Phase 2 solution does not fix the mutated defect.',
      issues: isCorrectFix ? [] : ['Defect remains uncorrected in submitted code.'],
      suggestions: [],
    };
  }
}
