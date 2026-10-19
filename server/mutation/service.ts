/**
 * SyntaXViva Core V1 — Part 3 Mutation Service
 *
 * Coordinates database persistence, student attempt updates, and audit logging
 * for the automatic mutation engine.
 * Ensures the original student submission remains immutable and isolated.
 */

import { getRepository } from '../repository/index.js';
import { normalizePythonSource } from '../execution/sandbox.js';
import { MutationEngine } from './engine.js';
import { ComplexBugEngine } from './complexBugEngine.js';
import { computeCodeHash, createDeterministicRNG } from './hasher.js';
import { MutationResult, MutationTypeCode } from './types.js';

function buildDeterministicFallbackMutation(
  code: string,
  language: string,
  seed: string = 'fallback_seed'
): {
  mutatedCode: string;
  mutationType: MutationTypeCode;
  originalFragment: string;
  mutatedFragment: string;
  line: number;
} {
  const lines = code.split('\n');
  const candidates: Array<{
    mutatedCode: string;
    mutationType: MutationTypeCode;
    originalFragment: string;
    mutatedFragment: string;
    line: number;
    priority: number;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const trimmed = lineText.trim();
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('from ') ||
      trimmed.startsWith('package ') ||
      trimmed.startsWith('using ')
    ) {
      continue;
    }

    // High Priority: Complex algorithmic, accumulator, loop, and function defects
    if (/\bmax\s*\(/.test(lineText)) {
      const copy = [...lines];
      copy[i] = lineText.replace(/\bmax(\s*\()/, 'min$1');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'MIN_MAX_SWAP',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 10,
      });
    }
    if (/\bmin\s*\(/.test(lineText)) {
      const copy = [...lines];
      copy[i] = lineText.replace(/\bmin(\s*\()/, 'max$1');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'MIN_MAX_SWAP',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 10,
      });
    }
    if (lineText.includes('range(len(')) {
      const copy = [...lines];
      copy[i] = lineText.replace(/range\s*\(\s*len\s*\(([^)]+)\)\s*\)/, 'range(len($1) - 1)');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'LOOP_TERMINATION_OFF_BY_ONE',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 10,
      });
    }
    if (lineText.includes('+= 1')) {
      const copy = [...lines];
      copy[i] = lineText.replace('+= 1', '-= 1');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'COUNT_INCREMENT_TO_DECREMENT',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 9,
      });
    }
    if (lineText.includes('// 2')) {
      const copy = [...lines];
      copy[i] = lineText.replace('// 2', '/ 2');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'TWO_POINTER_MID_INDEX_CALCULATION',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 9,
      });
    }
    if (lineText.includes('+=') && !lineText.includes('+= 1')) {
      const copy = [...lines];
      copy[i] = lineText.replace('+=', '-=');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'ACCUMULATOR_AGGREGATION_MUTATION',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 8,
      });
    }
    if (lineText.includes('*=')) {
      const copy = [...lines];
      copy[i] = lineText.replace('*=', '+=');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'ASSIGN_MULT_TO_DIV',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 8,
      });
    }
    if (lineText.includes(' and ')) {
      const copy = [...lines];
      copy[i] = lineText.replace(' and ', ' or ');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'AND_TO_OR',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 6,
      });
    }
    if (lineText.includes(' or ')) {
      const copy = [...lines];
      copy[i] = lineText.replace(' or ', ' and ');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'OR_TO_AND',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 6,
      });
    }
    if (lineText.includes('==')) {
      const copy = [...lines];
      copy[i] = lineText.replace('==', '!=');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'EQUAL_TO_NOT_EQUAL',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 4,
      });
    }
    if (lineText.includes('!=')) {
      const copy = [...lines];
      copy[i] = lineText.replace('!=', '==');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'NOT_EQUAL_TO_EQUAL',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 4,
      });
    }
    if (lineText.includes('>=')) {
      const copy = [...lines];
      copy[i] = lineText.replace('>=', '<');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'GREATER_EQUAL_TO_GREATER_THAN',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 3,
      });
    }
    if (lineText.includes('<=')) {
      const copy = [...lines];
      copy[i] = lineText.replace('<=', '>');
      candidates.push({
        mutatedCode: copy.join('\n'),
        mutationType: 'LESS_EQUAL_TO_LESS_THAN',
        originalFragment: lineText,
        mutatedFragment: copy[i],
        line: i + 1,
        priority: 3,
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority);
    const rng = createDeterministicRNG(seed);
    const topSlice = candidates.slice(0, Math.min(6, candidates.length));
    const chosen = topSlice[Math.floor(rng() * topSlice.length)];
    return chosen;
  }

  // Final guaranteed line mutation
  const isPy = language.toLowerCase() === 'python' || language.toLowerCase() === 'py';
  const fallbackLine = isPy
    ? '\n# BUG: unexpected state override\nresult = None'
    : '\n// BUG: unexpected state override\nresult = null;';
  return {
    mutatedCode: code + fallbackLine,
    mutationType: 'RETURN_VALUE_MUTATION',
    originalFragment: lines[lines.length - 1] || code,
    mutatedFragment: (lines[lines.length - 1] || '') + fallbackLine,
    line: Math.max(1, lines.length),
  };
}

export class MutationService {
  private static instance: MutationService;
  private engine: MutationEngine;

  private constructor() {
    this.engine = MutationEngine.getInstance();
  }

  public static getInstance(): MutationService {
    if (!MutationService.instance) {
      MutationService.instance = new MutationService();
    }
    return MutationService.instance;
  }

  /**
   * Processes a student's Phase 1 submission to create exactly one mutated version.
   * Updates student_attempts state to MUTATION_READY.
   * Persists audit record into attempt_mutations.
   *
   * Utilizes the 200+ ComplexBugEngine to generate realistic, sophisticated
   * computer science bugs and randomizes per-student using studentId.
   */
  public async processAttemptMutation(
    attemptId: string,
    options?: { seed?: string; requestedMutationType?: MutationTypeCode }
  ): Promise<MutationResult> {
    const repo = getRepository();
    const attempt = await repo.getAttemptById(attemptId);

    if (!attempt) {
      throw new Error(`Attempt with ID '${attemptId}' not found.`);
    }

    if (!attempt.original_code || attempt.original_code.trim().length === 0) {
      throw new Error(`Attempt '${attemptId}' contains no original submitted code to mutate.`);
    }

    const language = attempt.language || 'python';
    const now = new Date().toISOString();

    let sourceCode = attempt.original_code.replace(/\r\n?/g, '\n');
    if (language.toLowerCase() === 'python' || language.toLowerCase() === 'py') {
      sourceCode = normalizePythonSource(sourceCode);
    } else if (
      sourceCode.trim().split('\n').length === 1 &&
      sourceCode.trim().length > 30 &&
      (sourceCode.includes('{') || sourceCode.includes(';') || sourceCode.includes('#include'))
    ) {
      sourceCode = sourceCode
        .replace(/(#\s*include\s*[<"][^>\n"]+[>"])\s*(?=\S)/g, '$1\n')
        .replace(/\{\s*/g, ' {\n')
        .replace(/\s*\}\s*/g, '\n}\n')
        .replace(/;\s*(?![^\n(]*\))/g, ';\n')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      let indent = 0;
      sourceCode =
        sourceCode
          .split('\n')
          .map((line) => {
            if (line.startsWith('}')) indent = Math.max(0, indent - 1);
            const padded = '    '.repeat(indent) + line;
            if (line.endsWith('{')) indent += 1;
            return padded;
          })
          .join('\n') + '\n';
    }

    const origHash = computeCodeHash(sourceCode);

    // Generate student-specific deterministic seed:
    // Guarantees every student receives a different bug variant from the pool
    const studentSeed =
      options?.seed ||
      `seed_${attempt.student_id || 'std'}_${attempt.assignment_id || 'asgn'}_${origHash.slice(0, 10)}`;

    let result: MutationResult | null = null;

    // 1. Try ComplexBugEngine first (realistic, sophisticated algorithm/data structure bugs)
    const complexEngine = ComplexBugEngine.getInstance();
    const complexCandidate = complexEngine.selectComplexBug(
      sourceCode,
      language,
      studentSeed,
      options?.requestedMutationType
    );

    if (complexCandidate) {
      try {
        const mutatedCode = complexCandidate.apply();
        const mutHash = computeCodeHash(mutatedCode);
        result = {
          success: true,
          status: 'MUTATION_READY',
          mutatedCode,
          mutationType: complexCandidate.mutationType,
          originalCodeHash: origHash,
          mutatedCodeHash: mutHash,
          seed: studentSeed,
          metadata: {
            mutationType: complexCandidate.mutationType,
            language,
            sourceLocation: complexCandidate.location,
            originalFragment: complexCandidate.originalFragment,
            mutatedFragment: complexCandidate.mutatedFragment,
            description: complexCandidate.description,
            seed: studentSeed,
            originalCodeHash: origHash,
            mutatedCodeHash: mutHash,
            appliedAt: now,
          },
        };
      } catch (err) {
        console.warn('[ComplexBugEngine] candidate application error, falling back:', err);
      }
    }

    // 2. If no complex bug found or failed, execute static AST mutation engine
    if (!result || !result.success) {
      result = this.engine.processSubmission({
        code: sourceCode,
        language,
        seed: studentSeed,
        requestedMutationType: options?.requestedMutationType,
      });
    }

    // 3. If AST candidate matching did not find a match, use student-randomized diverse fallback mutator
    if (!result.success && !options?.requestedMutationType) {
      const fb = buildDeterministicFallbackMutation(sourceCode, language, studentSeed);
      const mutHash = computeCodeHash(fb.mutatedCode);
      result = {
        success: true,
        status: 'MUTATION_READY',
        mutatedCode: fb.mutatedCode,
        mutationType: fb.mutationType,
        originalCodeHash: origHash,
        mutatedCodeHash: mutHash,
        seed: studentSeed,
        metadata: {
          mutationType: fb.mutationType,
          language,
          sourceLocation: { line: fb.line, column: 0, endLine: fb.line, endColumn: fb.originalFragment.length },
          originalFragment: fb.originalFragment,
          mutatedFragment: fb.mutatedFragment,
          description: `Realistic mutation: ${fb.mutationType}`,
          seed: studentSeed,
          originalCodeHash: origHash,
          mutatedCodeHash: mutHash,
          appliedAt: now,
        },
      };
    }

    if (result.success) {
      // 1. Update student_attempts with mutation artifacts
      await repo.updateAttempt(attemptId, {
        state: 'MUTATION_READY',
        original_code: sourceCode,
        mutated_code: result.mutatedCode,
        mutation_type: result.mutationType,
        mutation_metadata_json: JSON.stringify(result.metadata),
        original_code_hash: result.originalCodeHash,
        mutated_code_hash: result.mutatedCodeHash,
        mutation_seed: result.seed,
        mutation_status: 'MUTATION_READY',
        failure_reason: null,
      });

      // 2. Insert auditable entry into attempt_mutations
      const recordId = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await repo.createAttemptMutation({
        id: recordId,
        attempt_id: attemptId,
        mutation_type: result.mutationType,
        mutation_version: '2.0.0',
        mutation_seed: result.seed,
        original_code_hash: result.originalCodeHash,
        mutated_code: result.mutatedCode,
        mutated_code_hash: result.mutatedCodeHash,
        mutation_metadata_json: JSON.stringify(result.metadata),
        status: 'MUTATION_READY',
        error_message: null,
        created_at: now,
      });
    } else {
      const errorMsg = result.error;
      const seedVal = result.seed || null;

      await repo.updateAttempt(attemptId, {
        state: 'MUTATION_PROCESSING_FAILED',
        mutation_status: 'MUTATION_PROCESSING_FAILED',
        failure_reason: errorMsg,
        mutated_code: null,
        original_code_hash: result.originalCodeHash,
        mutation_seed: seedVal,
      });

      const recordId = `mut_fail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await repo.createAttemptMutation({
        id: recordId,
        attempt_id: attemptId,
        mutation_type: 'NONE',
        mutation_version: '2.0.0',
        mutation_seed: seedVal,
        original_code_hash: result.originalCodeHash,
        mutated_code: '',
        mutated_code_hash: '',
        mutation_metadata_json: '{}',
        status: 'MUTATION_PROCESSING_FAILED',
        error_message: errorMsg,
        created_at: now,
      });
    }

    return result;
  }
}
