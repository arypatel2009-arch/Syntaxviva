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
  | 'Control Flow'
  | 'Loop Mutation'
  | 'Identifier Mutation'
  | 'Assignment Mutation'
  | 'Literal Mutation'
  | 'State Initialization'
  | 'Collection Access'
  | 'Function Call'
  | 'Built-in Function'
  | 'Algorithm Logic';

export type MutationTypeCode =
  | 'GREATER_THAN_TO_GREATER_EQUAL'
  | 'GREATER_EQUAL_TO_GREATER_THAN'
  | 'LESS_THAN_TO_LESS_EQUAL'
  | 'LESS_EQUAL_TO_LESS_THAN'
  | 'EQUAL_TO_NOT_EQUAL'
  | 'NOT_EQUAL_TO_EQUAL'
  | 'PLUS_TO_MINUS'
  | 'MINUS_TO_PLUS'
  | 'MULTIPLY_TO_DIVIDE'
  | 'DIVIDE_TO_MULTIPLY'
  | 'AND_TO_OR'
  | 'OR_TO_AND'
  | 'BOOLEAN_NEGATION'
  | 'CONDITIONAL_BRANCH_INVERSION'
  | 'LOOP_BOUNDARY_OFF_BY_ONE'
  | 'LOOP_CONDITION_MUTATION'
  | 'LOOP_INCREMENT_DECREMENT_MUTATION'
  | 'VARIABLE_REFERENCE_SWAP'
  | 'VARIABLE_SWAP'
  | 'CONSTANT_LITERAL_MUTATION'
  | 'INITIALIZATION_VALUE_MUTATION'
  | 'ARRAY_INDEX_MUTATION'
  | 'COLLECTION_ELEMENT_SELECTION_MUTATION'
  | 'FUNCTION_ARGUMENT_MUTATION'
  | 'RETURN_VALUE_MUTATION'
  | 'MIN_MAX_SWAP'
  | 'ACCUMULATOR_AGGREGATION_MUTATION';

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
  category: MutationCategory;
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
