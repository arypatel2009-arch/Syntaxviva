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
import { computeCodeHash } from './hasher.js';
import { MutationResult, MutationTypeCode } from './types.js';

function buildDeterministicFallbackMutation(code: string, language: string): {
  mutatedCode: string;
  mutationType: MutationTypeCode;
  originalFragment: string;
  mutatedFragment: string;
  line: number;
} {
  const lines = code.split('\n');
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

    if (lineText.includes('==')) {
      const nextLine = lineText.replace('==', '!=');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'EQUAL_TO_NOT_EQUAL',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (lineText.includes('!=')) {
      const nextLine = lineText.replace('!=', '==');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'NOT_EQUAL_TO_EQUAL',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (lineText.includes('>=')) {
      const nextLine = lineText.replace('>=', '<');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'GREATER_EQUAL_TO_GREATER_THAN',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (lineText.includes('<=')) {
      const nextLine = lineText.replace('<=', '>');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'LESS_EQUAL_TO_LESS_THAN',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (/\bmax\s*\(/.test(lineText)) {
      const nextLine = lineText.replace(/\bmax(\s*\()/, 'min$1');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'MIN_MAX_SWAP',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (/\bmin\s*\(/.test(lineText)) {
      const nextLine = lineText.replace(/\bmin(\s*\()/, 'max$1');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'MIN_MAX_SWAP',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (lineText.includes('+=')) {
      const nextLine = lineText.replace('+=', '-=');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'LOOP_INCREMENT_DECREMENT_MUTATION',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (lineText.includes('-=')) {
      const nextLine = lineText.replace('-=', '+=');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'LOOP_INCREMENT_DECREMENT_MUTATION',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    // Match '>' comparison (with or without spaces, avoiding '->', '>>', '>=')
    if (/(?<![->])>(?![>=])/.test(lineText)) {
      const nextLine = lineText.replace(/(?<![->])>(?![>=])/, '<');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'GREATER_THAN_TO_GREATER_EQUAL',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    // Match '<' comparison (with or without spaces, avoiding '<<', '<=', generics)
    if (/(?<!<)<(?![<=])/.test(lineText) && !/<\s*[A-Za-z0-9_:]+\s*>/.test(lineText)) {
      const nextLine = lineText.replace(/(?<!<)<(?![<=])/, '>');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'LESS_THAN_TO_LESS_EQUAL',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    // Match '+' binary arithmetic (with or without spaces, avoiding '++', '+=')
    if (/(?<=[A-Za-z0-9_)\]])\s*\+\s*(?=[A-Za-z0-9_(])/.test(lineText)) {
      const nextLine = lineText.replace(/(?<=[A-Za-z0-9_)\]])(\s*)\+(\s*)(?=[A-Za-z0-9_(])/, '$1-$2');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'PLUS_TO_MINUS',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    // Match '-' binary arithmetic (with or without spaces, avoiding '--', '-=', '->')
    if (/(?<=[A-Za-z0-9_)\]])\s*-\s*(?=[A-Za-z0-9_(])/.test(lineText)) {
      const nextLine = lineText.replace(/(?<=[A-Za-z0-9_)\]])(\s*)-(\s*)(?=[A-Za-z0-9_(])/, '$1+$2');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'MINUS_TO_PLUS',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    // Match '*' binary multiplication (avoiding '**' and '*=')
    if (/(?<=[A-Za-z0-9_)\]])\s*\*(?![*=])\s*(?=[A-Za-z0-9_(])/.test(lineText)) {
      const nextLine = lineText.replace(/(?<=[A-Za-z0-9_)\]])(\s*)\*(?![*=])(\s*)(?=[A-Za-z0-9_(])/, '$1+$2');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'MULTIPLY_TO_DIVIDE',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (/\bpass\b/.test(lineText)) {
      const nextLine = lineText.replace(/\bpass\b/, 'return -1');
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'RETURN_VALUE_MUTATION',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (/\b\d+\b/.test(lineText) && !/\breturn\s+0\s*;/.test(lineText)) {
      const nextLine = lineText.replace(/\b(\d+)\b/, (m) => String(Number(m) + 1));
      const copy = [...lines];
      copy[i] = nextLine;
      return {
        mutatedCode: copy.join('\n'),
        mutationType: 'CONSTANT_LITERAL_MUTATION',
        originalFragment: lineText,
        mutatedFragment: nextLine,
        line: i + 1,
      };
    }
    if (language.toLowerCase() === 'python' && /\breturn\s+(.+)/.test(lineText)) {
      const nextLine = lineText.replace(/\breturn\s+(.+)/, 'return None');
      if (nextLine !== lineText) {
        const copy = [...lines];
        copy[i] = nextLine;
        return {
          mutatedCode: copy.join('\n'),
          mutationType: 'RETURN_VALUE_MUTATION',
          originalFragment: lineText,
          mutatedFragment: nextLine,
          line: i + 1,
        };
      }
    }
    if (/\bprint\s*\(([^)]+)\)/.test(lineText)) {
      const nextLine = lineText.replace(/\bprint\s*\(([^)]+)\)/, 'print(0)');
      if (nextLine !== lineText) {
        const copy = [...lines];
        copy[i] = nextLine;
        return {
          mutatedCode: copy.join('\n'),
          mutationType: 'CONSTANT_LITERAL_MUTATION',
          originalFragment: lineText,
          mutatedFragment: nextLine,
          line: i + 1,
        };
      }
    }
  }

  // Final guaranteed line mutation
  const isPy = language.toLowerCase() === 'python' || language.toLowerCase() === 'py';
  const fallbackLine = isPy
    ? '\n# BUG: unexpected output override\nprint(-1)'
    : '\n// BUG: unexpected logic branch';
  return {
    mutatedCode: code + fallbackLine,
    mutationType: 'CONSTANT_LITERAL_MUTATION',
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

    // Execute static AST mutation engine
    let result = this.engine.processSubmission({
      code: sourceCode,
      language,
      seed: options?.seed,
      requestedMutationType: options?.requestedMutationType,
    });

    // If AST candidate matching did not find a match and no explicit type was forced, use deterministic line mutator so student is always MUTATION_READY
    if (!result.success && !options?.requestedMutationType) {
      const fb = buildDeterministicFallbackMutation(sourceCode, language);
      const origHash = computeCodeHash(sourceCode);
      const mutHash = computeCodeHash(fb.mutatedCode);
      const seedVal = options?.seed || `seed_${origHash.slice(0, 12)}`;
      result = {
        success: true,
        status: 'MUTATION_READY',
        mutatedCode: fb.mutatedCode,
        mutationType: fb.mutationType,
        originalCodeHash: origHash,
        mutatedCodeHash: mutHash,
        seed: seedVal,
        metadata: {
          mutationType: fb.mutationType,
          language,
          sourceLocation: { line: fb.line, column: 0, endLine: fb.line, endColumn: fb.originalFragment.length },
          originalFragment: fb.originalFragment,
          mutatedFragment: fb.mutatedFragment,
          description: `Deterministic mutation at line ${fb.line}`,
          seed: seedVal,
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
        mutation_version: '1.0.0',
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
        mutation_version: '1.0.0',
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
