/**
 * SyntaXViva Core V1 — Part 3 Mutation Engine Types
 *
 * Provides extensible type definitions for AST-based single-mutation processing,
 * language providers, deterministic seeds, and auditable metadata.
 */

export type MutationCategory =
  | 'Relational Operator'
  | 'Equality Operator'
  | 'Arithmetic Operator'
  | 'Logical Operator'
  | 'Bitwise Operator'
  | 'Control Flow'
  | 'Loop Mutation'
  | 'Identifier Mutation'
  | 'Assignment Mutation'
  | 'Literal Mutation'
  | 'State Initialization'
  | 'Collection Access'
  | 'Function Call'
  | 'Built-in Function'
  | 'Algorithm Logic'
  | 'String Operation'
  | 'Pointer & Memory'
  | 'Recursion & Base Case';

export type MutationTypeCode = string;

export interface SourceLocation {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export interface MutationRegistryEntry {
  id: string;
  code: MutationTypeCode;
  name: string;
  category: MutationCategory | string;
  description: string;
  enabled: boolean;
}

export interface MutationCandidate {
  id: string;
  mutationType: MutationTypeCode;
  language: string;
  location: SourceLocation;
  originalFragment: string;
  mutatedFragment: string;
  description: string;
  apply: () => string;
}

export interface MutationMetadata {
  mutationType: MutationTypeCode;
  language: string;
  sourceLocation: SourceLocation;
  originalFragment: string;
  mutatedFragment: string;
  description: string;
  seed: string;
  originalCodeHash: string;
  mutatedCodeHash: string;
  appliedAt: string;
  isSnippet?: boolean;
  startLine?: number;
  endLine?: number;
  originalSnippet?: string;
  mutatedSnippet?: string;
  fullOriginalCode?: string;
}

export type MutationProcessingStatus =
  | 'MUTATION_READY'
  | 'MUTATION_PROCESSING_FAILED'
  | 'PROCESSING';

export interface MutationSuccessResult {
  success: true;
  status: 'MUTATION_READY';
  mutatedCode: string;
  mutationType: MutationTypeCode;
  originalCodeHash: string;
  mutatedCodeHash: string;
  seed: string;
  metadata: MutationMetadata;
  error?: undefined;
}

export interface MutationFailureResult {
  success: false;
  status: 'MUTATION_PROCESSING_FAILED';
  error: string;
  originalCodeHash: string;
  seed?: string;
  mutatedCode?: undefined;
  mutationType?: undefined;
  mutatedCodeHash?: undefined;
  metadata?: undefined;
}

export type MutationResult = MutationSuccessResult | MutationFailureResult;

export interface LanguageProvider {
  language: string;
  aliases: string[];
  parseAndValidate(code: string): { valid: boolean; error?: string };
  findCandidates(code: string): MutationCandidate[];
}
