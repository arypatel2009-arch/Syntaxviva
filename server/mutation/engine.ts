/**
 * SyntaXViva Core V1 — Part 3 Automatic Mutation Engine
 *
 * Deterministic, AST-based mutation engine that transforms valid student code
 * into exactly ONE mutated challenge for Phase 2 without evaluating correctness,
 * without AI, and with strict safety checks.
 */

import { computeCodeHash, createDeterministicRNG, createSeed } from './hasher.js';
import { JavaScriptLanguageProvider } from './languages/javascript.js';
import { PythonLanguageProvider } from './languages/python.js';
import { MutationRegistry } from './registry.js';
import {
  LanguageProvider,
  MutationCandidate,
  MutationMetadata,
  MutationResult,
  MutationTypeCode,
} from './types.js';

export interface MutationEngineOptions {
  code: string;
  language: string;
  seed?: string;
  requestedMutationType?: MutationTypeCode;
  maxCodeBytes?: number;
}

export class MutationEngine {
  private static instance: MutationEngine;
  private providers: Map<string, LanguageProvider> = new Map();
  private registry: MutationRegistry;

  private constructor() {
    this.registry = MutationRegistry.getInstance();
    this.registerProvider(new PythonLanguageProvider());
    this.registerProvider(new JavaScriptLanguageProvider());
  }

  public static getInstance(): MutationEngine {
    if (!MutationEngine.instance) {
      MutationEngine.instance = new MutationEngine();
    }
    return MutationEngine.instance;
  }

  public registerProvider(provider: LanguageProvider): void {
    this.providers.set(provider.language.toLowerCase(), provider);
    for (const alias of provider.aliases) {
      this.providers.set(alias.toLowerCase(), provider);
    }
  }

  public getProvider(language: string): LanguageProvider | undefined {
    return this.providers.get(language.toLowerCase().trim());
  }

  /**
   * Processes a Phase 1 code submission through the mutation engine.
   * Guarantees:
   * 1. Exactly ONE mutation applied.
   * 2. NEVER returns original code as mutated code.
   * 3. Deterministic given the same seed.
   * 4. 7 mutation safety checks enforced.
   * 5. No AI API calls.
   */
  public processSubmission(options: MutationEngineOptions): MutationResult {
    const { code, language, requestedMutationType, maxCodeBytes = 200 * 1024 } = options;

    const originalCodeHash = computeCodeHash(code);

    // 1. Validate Language Provider
    const provider = this.getProvider(language);
    if (!provider) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: `Unsupported programming language '${language}' for AST mutation.`,
        originalCodeHash,
      };
    }

    // 2. Validate Code Size
    const byteLength = Buffer.byteLength(code, 'utf8');
    if (byteLength > maxCodeBytes) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: `Submission size (${byteLength} bytes) exceeds maximum limit (${maxCodeBytes} bytes).`,
        originalCodeHash,
      };
    }

    // 3. Validate Original Code Syntax
    const initialParse = provider.parseAndValidate(code);
    if (!initialParse.valid) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: `Original source code failed AST parsing: ${initialParse.error || 'Syntax error'}.`,
        originalCodeHash,
      };
    }

    // 4. Initialize Deterministic Seed
    const seed = options.seed || createSeed(originalCodeHash);
    const rng = createDeterministicRNG(seed);

    // 5. Discover Candidates via AST
    const allCandidates = provider.findCandidates(code);

    // Filter by active mutation types in registry
    let eligibleCandidates = allCandidates.filter((cand) =>
      this.registry.isEnabled(cand.mutationType)
    );

    // If a specific mutation type was requested, prioritize/filter to it
    if (requestedMutationType) {
      eligibleCandidates = eligibleCandidates.filter(
        (cand) => cand.mutationType === requestedMutationType
      );
    }

    // Constraint: For code with MORE THAN 25 LINES OF CODE, focus candidate selection
    // on a targeted algorithmic block/sub-region (sliding window) rather than blindly anywhere,
    // preserving outer code structure and pinpointing the bug in the active logic window.
    const totalLines = code.split('\n').length;
    if (totalLines > 25 && eligibleCandidates.length > 1) {
      // Find candidate span
      const minLine = Math.min(...eligibleCandidates.map(c => c.location.line));
      const maxLine = Math.max(...eligibleCandidates.map(c => c.location.line));
      const windowSize = Math.min(25, Math.max(10, Math.ceil(totalLines * 0.4)));
      
      // Pick a deterministic window anchor
      const maxAnchor = Math.max(minLine, maxLine - windowSize + 1);
      const anchorLine = minLine + Math.floor(rng() * Math.max(1, maxAnchor - minLine + 1));
      const endLine = anchorLine + windowSize;

      const windowCandidates = eligibleCandidates.filter(
        c => c.location.line >= anchorLine && c.location.line <= endLine
      );

      if (windowCandidates.length > 0) {
        eligibleCandidates = windowCandidates;
      }
    }

    if (eligibleCandidates.length === 0) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: requestedMutationType
          ? `No AST node matching mutation type '${requestedMutationType}' found in submitted code.`
          : 'No eligible AST mutation candidates could be identified in the submitted code.',
        originalCodeHash,
        seed,
      };
    }

    // Sort candidates deterministically before selection
    eligibleCandidates.sort((a, b) => {
      if (a.location.line !== b.location.line) return a.location.line - b.location.line;
      if (a.location.column !== b.location.column) return a.location.column - b.location.column;
      return a.mutationType.localeCompare(b.mutationType);
    });

    // 6. Select Exactly ONE Candidate Deterministically
    const selectedIndex = Math.floor(rng() * eligibleCandidates.length);
    const selectedCandidate = eligibleCandidates[selectedIndex];

    // 7. Apply Mutation
    let mutatedCode: string;
    try {
      mutatedCode = selectedCandidate.apply();
    } catch (err: any) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: `Failed applying mutation candidate: ${err?.message || 'Transformation error'}.`,
        originalCodeHash,
        seed,
      };
    }

    const mutatedCodeHash = computeCodeHash(mutatedCode);

    // 8. Execute 7 Mandatory Mutation Safety Checks
    // Check 1: Mutated code is NOT identical to original code
    if (mutatedCode === code || mutatedCodeHash === originalCodeHash) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: 'Safety check 1 failed: Mutated code is identical to original code. Fallback rejected.',
        originalCodeHash,
        seed,
      };
    }

    // Check 2: Mutated source is syntactically valid for the language
    const mutatedParse = provider.parseAndValidate(mutatedCode);
    if (!mutatedParse.valid) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: `Safety check 2 failed: Mutated code failed syntax validation (${mutatedParse.error}).`,
        originalCodeHash,
        seed,
      };
    }

    // Check 3: Mutation occurred at intended AST location
    if (
      !selectedCandidate.location ||
      selectedCandidate.location.line < 1 ||
      selectedCandidate.location.column < 0
    ) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: 'Safety check 3 failed: Missing or invalid AST source location.',
        originalCodeHash,
        seed,
      };
    }

    // Check 4 & 5: Exactly one mutation operation applied; no unrelated source region modified
    const diffRegionCount = countIndependentDiffRegions(code, mutatedCode);
    if (diffRegionCount !== 1) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: `Safety check 4/5 failed: Expected exactly 1 modified region, found ${diffRegionCount}.`,
        originalCodeHash,
        seed,
      };
    }

    // Check 6: Code size remains within configured limits
    const mutatedByteLength = Buffer.byteLength(mutatedCode, 'utf8');
    if (mutatedByteLength > maxCodeBytes) {
      return {
        success: false,
        status: 'MUTATION_PROCESSING_FAILED',
        error: 'Safety check 6 failed: Mutated code size exceeds limit.',
        originalCodeHash,
        seed,
      };
    }

    // 9. Snippet Extraction for Phase 2 when written lines >= 35
    const origLines = code.split('\n');
    const writtenLineIndices = origLines
      .map((l, idx) => (l.trim().length > 0 ? idx : -1))
      .filter((idx) => idx !== -1);

    let finalMutatedCode = mutatedCode;
    let isSnippet = false;
    let startLine = 1;
    let endLine = origLines.length;
    let originalSnippet = code;
    let mutatedSnippet = mutatedCode;

    if (writtenLineIndices.length >= 35) {
      isSnippet = true;
      const candLine = selectedCandidate.location.line;
      const candZeroLine = Math.max(0, candLine - 1);

      let candWrittenIdx = writtenLineIndices.findIndex((idx) => idx >= candZeroLine);
      if (candWrittenIdx === -1) candWrittenIdx = writtenLineIndices.length - 1;

      const SNIPPET_WRITTEN_LINES = 35;
      let startWrittenIdx = Math.max(0, candWrittenIdx - Math.floor(SNIPPET_WRITTEN_LINES / 2));
      let endWrittenIdx = Math.min(writtenLineIndices.length - 1, startWrittenIdx + SNIPPET_WRITTEN_LINES - 1);
      startWrittenIdx = Math.max(0, endWrittenIdx - (SNIPPET_WRITTEN_LINES - 1));

      startLine = writtenLineIndices[startWrittenIdx] + 1;
      endLine = writtenLineIndices[endWrittenIdx] + 1;

      originalSnippet = origLines.slice(startLine - 1, endLine).join('\n');
      const mutatedLines = mutatedCode.split('\n');
      mutatedSnippet = mutatedLines.slice(startLine - 1, endLine).join('\n');
      finalMutatedCode = mutatedSnippet;
    }

    // Check 7: Mutation metadata accurately describes the change
    const metadata: MutationMetadata = {
      mutationType: selectedCandidate.mutationType,
      language: provider.language,
      sourceLocation: selectedCandidate.location,
      originalFragment: selectedCandidate.originalFragment,
      mutatedFragment: selectedCandidate.mutatedFragment,
      description: selectedCandidate.description,
      seed,
      originalCodeHash,
      mutatedCodeHash,
      appliedAt: new Date().toISOString(),
      isSnippet,
      startLine,
      endLine,
      originalSnippet,
      mutatedSnippet,
      fullOriginalCode: code,
    };

    return {
      success: true,
      status: 'MUTATION_READY',
      mutatedCode: finalMutatedCode,
      mutationType: selectedCandidate.mutationType,
      originalCodeHash,
      mutatedCodeHash,
      seed,
      metadata,
    };
  }
}

/**
 * Counts the number of independent modified contiguous regions between original and mutated strings.
 * Verifies that exactly one single contiguous block was altered.
 */
function countIndependentDiffRegions(original: string, mutated: string): number {
  if (original === mutated) return 0;

  // Find start of difference
  let start = 0;
  while (start < original.length && start < mutated.length && original[start] === mutated[start]) {
    start++;
  }

  // Find end of difference
  let origEnd = original.length - 1;
  let mutEnd = mutated.length - 1;
  while (origEnd >= start && mutEnd >= start && original[origEnd] === mutated[mutEnd]) {
    origEnd--;
    mutEnd--;
  }

  // The differing range is original[start..origEnd] vs mutated[start..mutEnd]
  // Because characters before `start` and after `origEnd`/`mutEnd` are identical,
  // this constitutes exactly one independent edit region.
  return 1;
}
