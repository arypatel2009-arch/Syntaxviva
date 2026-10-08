/**
 * SyntaXViva Core V1 — Part 3 Mutation Registry
 *
 * Modular registry of mutation types. Designed to scale from the initial 27
 * to 500+ mutations without rewriting core engine interfaces.
 */

import { MutationRegistryEntry, MutationTypeCode } from './types.js';

export const INITIAL_27_MUTATIONS: MutationRegistryEntry[] = [
  {
    id: 'mut_greater_than_to_greater_equal',
    code: 'GREATER_THAN_TO_GREATER_EQUAL',
    name: 'Greater Than to Greater or Equal',
    category: 'Relational Operator',
    description: 'Mutates > comparison operator to >=',
    enabled: true,
  },
  {
    id: 'mut_greater_equal_to_greater_than',
    code: 'GREATER_EQUAL_TO_GREATER_THAN',
    name: 'Greater or Equal to Greater Than',
    category: 'Relational Operator',
    description: 'Mutates >= comparison operator to >',
    enabled: true,
  },
  {
    id: 'mut_less_than_to_less_equal',
    code: 'LESS_THAN_TO_LESS_EQUAL',
    name: 'Less Than to Less or Equal',
    category: 'Relational Operator',
    description: 'Mutates < comparison operator to <=',
    enabled: true,
  },
  {
    id: 'mut_less_equal_to_less_than',
    code: 'LESS_EQUAL_TO_LESS_THAN',
    name: 'Less or Equal to Less Than',
    category: 'Relational Operator',
    description: 'Mutates <= comparison operator to <',
    enabled: true,
  },
  {
    id: 'mut_equal_to_not_equal',
    code: 'EQUAL_TO_NOT_EQUAL',
    name: 'Equal to Not Equal',
    category: 'Equality Operator',
    description: 'Mutates == comparison operator to !=',
    enabled: true,
  },
  {
    id: 'mut_not_equal_to_equal',
    code: 'NOT_EQUAL_TO_EQUAL',
    name: 'Not Equal to Equal',
    category: 'Equality Operator',
    description: 'Mutates != comparison operator to ==',
    enabled: true,
  },
  {
    id: 'mut_plus_to_minus',
    code: 'PLUS_TO_MINUS',
    name: 'Addition to Subtraction',
    category: 'Arithmetic Operator',
    description: 'Mutates + binary operator to -',
    enabled: true,
  },
  {
    id: 'mut_minus_to_plus',
    code: 'MINUS_TO_PLUS',
    name: 'Subtraction to Addition',
    category: 'Arithmetic Operator',
    description: 'Mutates - binary operator to +',
    enabled: true,
  },
  {
    id: 'mut_multiply_to_divide',
    code: 'MULTIPLY_TO_DIVIDE',
    name: 'Multiplication to Division',
    category: 'Arithmetic Operator',
    description: 'Mutates * binary operator to /',
    enabled: true,
  },
  {
    id: 'mut_divide_to_multiply',
    code: 'DIVIDE_TO_MULTIPLY',
    name: 'Division to Multiplication',
    category: 'Arithmetic Operator',
    description: 'Mutates / binary operator to *',
    enabled: true,
  },
  {
    id: 'mut_and_to_or',
    code: 'AND_TO_OR',
    name: 'Logical AND to OR',
    category: 'Logical Operator',
    description: 'Mutates logical and/&& operator to or/||',
    enabled: true,
  },
  {
    id: 'mut_or_to_and',
    code: 'OR_TO_AND',
    name: 'Logical OR to AND',
    category: 'Logical Operator',
    description: 'Mutates logical or/|| operator to and/&&',
    enabled: true,
  },
  {
    id: 'mut_boolean_negation',
    code: 'BOOLEAN_NEGATION',
    name: 'Boolean Negation',
    category: 'Logical Operator',
    description: 'Inverts boolean literal or negates conditional expression',
    enabled: true,
  },
  {
    id: 'mut_conditional_branch_inversion',
    code: 'CONDITIONAL_BRANCH_INVERSION',
    name: 'Conditional Branch Inversion',
    category: 'Control Flow',
    description: 'Swaps consequent and alternate branches of if/else statements',
    enabled: true,
  },
  {
    id: 'mut_loop_boundary_off_by_one',
    code: 'LOOP_BOUNDARY_OFF_BY_ONE',
    name: 'Loop Boundary Off-by-One',
    category: 'Loop Mutation',
    description: 'Modifies loop upper or lower bound by ±1',
    enabled: true,
  },
  {
    id: 'mut_loop_condition_mutation',
    code: 'LOOP_CONDITION_MUTATION',
    name: 'Loop Condition Mutation',
    category: 'Loop Mutation',
    description: 'Modifies while/for loop continuation predicate',
    enabled: true,
  },
  {
    id: 'mut_loop_increment_decrement_mutation',
    code: 'LOOP_INCREMENT_DECREMENT_MUTATION',
    name: 'Loop Step Mutation',
    category: 'Loop Mutation',
    description: 'Mutates increment to decrement or alters step value',
    enabled: true,
  },
  {
    id: 'mut_variable_reference_swap',
    code: 'VARIABLE_REFERENCE_SWAP',
    name: 'Variable Reference Swap',
    category: 'Identifier Mutation',
    description: 'Swaps references to two variables of compatible scope and type',
    enabled: true,
  },
  {
    id: 'mut_variable_swap',
    code: 'VARIABLE_SWAP',
    name: 'Variable Assignment Swap',
    category: 'Assignment Mutation',
    description: 'Swaps assignment targets or positions in multi-variable blocks',
    enabled: true,
  },
  {
    id: 'mut_constant_literal_mutation',
    code: 'CONSTANT_LITERAL_MUTATION',
    name: 'Constant Literal Mutation',
    category: 'Literal Mutation',
    description: 'Alters a constant numeric literal by a small discrete delta',
    enabled: true,
  },
  {
    id: 'mut_initialization_value_mutation',
    code: 'INITIALIZATION_VALUE_MUTATION',
    name: 'Initialization Value Mutation',
    category: 'State Initialization',
    description: 'Changes initial state value (e.g., 0 to 1, or empty container)',
    enabled: true,
  },
  {
    id: 'mut_array_index_mutation',
    code: 'ARRAY_INDEX_MUTATION',
    name: 'Array Index Offset Mutation',
    category: 'Collection Access',
    description: 'Alters array index lookup by ±1 or index offset',
    enabled: true,
  },
  {
    id: 'mut_collection_element_selection_mutation',
    code: 'COLLECTION_ELEMENT_SELECTION_MUTATION',
    name: 'Collection Selection Mutation',
    category: 'Collection Access',
    description: 'Mutates collection head/last selection or slice bound',
    enabled: true,
  },
  {
    id: 'mut_function_argument_mutation',
    code: 'FUNCTION_ARGUMENT_MUTATION',
    name: 'Function Argument Mutation',
    category: 'Function Call',
    description: 'Swaps positional argument values in function calls',
    enabled: true,
  },
  {
    id: 'mut_return_value_mutation',
    code: 'RETURN_VALUE_MUTATION',
    name: 'Return Value Mutation',
    category: 'Control Flow',
    description: 'Alters returned expression while preserving syntactic validity',
    enabled: true,
  },
  {
    id: 'mut_min_max_swap',
    code: 'MIN_MAX_SWAP',
    name: 'Min/Max Function Swap',
    category: 'Built-in Function',
    description: 'Swaps min() invocation for max() invocation or vice-versa',
    enabled: true,
  },
  {
    id: 'mut_accumulator_aggregation_mutation',
    code: 'ACCUMULATOR_AGGREGATION_MUTATION',
    name: 'Accumulator Aggregation Mutation',
    category: 'Algorithm Logic',
    description: 'Mutates accumulator operation in reduction/aggregation loops',
    enabled: true,
  },
];

export class MutationRegistry {
  private static instance: MutationRegistry;
  private registry: Map<string, MutationRegistryEntry> = new Map();

  private constructor() {
    for (const item of INITIAL_27_MUTATIONS) {
      this.registry.set(item.code, { ...item });
    }
  }

  public static getInstance(): MutationRegistry {
    if (!MutationRegistry.instance) {
      MutationRegistry.instance = new MutationRegistry();
    }
    return MutationRegistry.instance;
  }

  public register(entry: MutationRegistryEntry): void {
    this.registry.set(entry.code, entry);
  }

  public get(code: string): MutationRegistryEntry | undefined {
    return this.registry.get(code);
  }

  public getAll(): MutationRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  public getEnabled(): MutationRegistryEntry[] {
    return Array.from(this.registry.values()).filter((m) => m.enabled);
  }

  public isEnabled(code: MutationTypeCode): boolean {
    const entry = this.registry.get(code);
    return entry ? entry.enabled : false;
  }

  public setEnabled(code: MutationTypeCode, enabled: boolean): void {
    const entry = this.registry.get(code);
    if (entry) {
      entry.enabled = enabled;
    }
  }
}
