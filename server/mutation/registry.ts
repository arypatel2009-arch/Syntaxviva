/**
 * SyntaXViva Core V1 — Part 3 Mutation Registry
 *
 * Comprehensive registry of 220+ realistic, complex mutation types
 * spanning algorithm logic, data structures, recursion, accumulators,
 * collection slicing, control flow, math precision, and language semantics.
 */

import { MutationRegistryEntry, MutationTypeCode } from './types.js';

export const INITIAL_246_MUTATIONS: MutationRegistryEntry[] = [
  // =========================================================================
  // 1. Relational Operators (14)
  // =========================================================================
  { id: 'mut_greater_than_to_greater_equal', code: 'GREATER_THAN_TO_GREATER_EQUAL', name: 'Greater Than to Greater or Equal', category: 'Relational Operator', description: 'Mutates > comparison operator to >=', enabled: true },
  { id: 'mut_greater_equal_to_greater_than', code: 'GREATER_EQUAL_TO_GREATER_THAN', name: 'Greater or Equal to Greater Than', category: 'Relational Operator', description: 'Mutates >= comparison operator to >', enabled: true },
  { id: 'mut_less_than_to_less_equal', code: 'LESS_THAN_TO_LESS_EQUAL', name: 'Less Than to Less or Equal', category: 'Relational Operator', description: 'Mutates < comparison operator to <=', enabled: true },
  { id: 'mut_less_equal_to_less_than', code: 'LESS_EQUAL_TO_LESS_THAN', name: 'Less or Equal to Less Than', category: 'Relational Operator', description: 'Mutates <= comparison operator to <', enabled: true },
  { id: 'mut_greater_than_to_less_than', code: 'GREATER_THAN_TO_LESS_THAN', name: 'Greater Than to Less Than', category: 'Relational Operator', description: 'Mutates > comparison operator to <', enabled: true },
  { id: 'mut_less_than_to_greater_than', code: 'LESS_THAN_TO_GREATER_THAN', name: 'Less Than to Greater Than', category: 'Relational Operator', description: 'Mutates < comparison operator to >', enabled: true },
  { id: 'mut_greater_equal_to_less_equal', code: 'GREATER_EQUAL_TO_LESS_EQUAL', name: 'Greater Equal to Less Equal', category: 'Relational Operator', description: 'Mutates >= comparison operator to <=', enabled: true },
  { id: 'mut_less_equal_to_greater_equal', code: 'LESS_EQUAL_TO_GREATER_EQUAL', name: 'Less Equal to Greater Equal', category: 'Relational Operator', description: 'Mutates <= comparison operator to >=', enabled: true },
  { id: 'mut_greater_than_to_equal', code: 'GREATER_THAN_TO_EQUAL', name: 'Greater Than to Equal', category: 'Relational Operator', description: 'Mutates > comparison operator to ==', enabled: true },
  { id: 'mut_less_than_to_equal', code: 'LESS_THAN_TO_EQUAL', name: 'Less Than to Equal', category: 'Relational Operator', description: 'Mutates < comparison operator to ==', enabled: true },
  { id: 'mut_strict_equal_to_equal', code: 'STRICT_EQUAL_TO_EQUAL', name: 'Strict Equal to Loose Equal', category: 'Relational Operator', description: 'Mutates === to ==', enabled: true },
  { id: 'mut_strict_not_equal_to_not_equal', code: 'STRICT_NOT_EQUAL_TO_NOT_EQUAL', name: 'Strict Not Equal to Loose Not Equal', category: 'Relational Operator', description: 'Mutates !== to !=', enabled: true },
  { id: 'mut_relational_constant_true', code: 'RELATIONAL_CONSTANT_TRUE', name: 'Relational Expression to True', category: 'Relational Operator', description: 'Forces relational predicate to evaluate to True', enabled: true },
  { id: 'mut_relational_constant_false', code: 'RELATIONAL_CONSTANT_FALSE', name: 'Relational Expression to False', category: 'Relational Operator', description: 'Forces relational predicate to evaluate to False', enabled: true },

  // =========================================================================
  // 2. Equality & Identity Operators (8)
  // =========================================================================
  { id: 'mut_equal_to_not_equal', code: 'EQUAL_TO_NOT_EQUAL', name: 'Equal to Not Equal', category: 'Equality Operator', description: 'Mutates == comparison operator to !=', enabled: true },
  { id: 'mut_not_equal_to_equal', code: 'NOT_EQUAL_TO_EQUAL', name: 'Not Equal to Equal', category: 'Equality Operator', description: 'Mutates != comparison operator to ==', enabled: true },
  { id: 'mut_is_to_is_not', code: 'IS_TO_IS_NOT', name: 'Identity IS to IS NOT', category: 'Equality Operator', description: 'Mutates identity operator is to is not', enabled: true },
  { id: 'mut_is_not_to_is', code: 'IS_NOT_TO_IS', name: 'Identity IS NOT to IS', category: 'Equality Operator', description: 'Mutates identity operator is not to is', enabled: true },
  { id: 'mut_in_to_not_in', code: 'IN_TO_NOT_IN', name: 'Membership IN to NOT IN', category: 'Equality Operator', description: 'Mutates membership operator in to not in', enabled: true },
  { id: 'mut_not_in_to_in', code: 'NOT_IN_TO_IN', name: 'Membership NOT IN to IN', category: 'Equality Operator', description: 'Mutates membership operator not in to in', enabled: true },
  { id: 'mut_instanceof_inversion', code: 'INSTANCEOF_INVERSION', name: 'Type Check Inversion', category: 'Equality Operator', description: 'Inverts isinstance / instanceof validation check', enabled: true },
  { id: 'mut_reference_equality_vs_value', code: 'REFERENCE_EQUALITY_VS_VALUE', name: 'Reference vs Value Equality Swap', category: 'Equality Operator', description: 'Swaps value equality (==) with reference identity (is)', enabled: true },

  // =========================================================================
  // 3. Arithmetic Operators (14)
  // =========================================================================
  { id: 'mut_plus_to_minus', code: 'PLUS_TO_MINUS', name: 'Addition to Subtraction', category: 'Arithmetic Operator', description: 'Mutates + binary operator to -', enabled: true },
  { id: 'mut_minus_to_plus', code: 'MINUS_TO_PLUS', name: 'Subtraction to Addition', category: 'Arithmetic Operator', description: 'Mutates - binary operator to +', enabled: true },
  { id: 'mut_multiply_to_divide', code: 'MULTIPLY_TO_DIVIDE', name: 'Multiplication to Division', category: 'Arithmetic Operator', description: 'Mutates * binary operator to /', enabled: true },
  { id: 'mut_divide_to_multiply', code: 'DIVIDE_TO_MULTIPLY', name: 'Division to Multiplication', category: 'Arithmetic Operator', description: 'Mutates / binary operator to *', enabled: true },
  { id: 'mut_modulo_to_divide', code: 'MODULO_TO_DIVIDE', name: 'Modulo to Division', category: 'Arithmetic Operator', description: 'Mutates % modulo operator to / division', enabled: true },
  { id: 'mut_divide_to_modulo', code: 'DIVIDE_TO_MODULO', name: 'Division to Modulo', category: 'Arithmetic Operator', description: 'Mutates / division operator to % modulo', enabled: true },
  { id: 'mut_floor_div_to_true_div', code: 'FLOOR_DIV_TO_TRUE_DIV', name: 'Floor Division to True Division', category: 'Arithmetic Operator', description: 'Mutates // floor division to / true division', enabled: true },
  { id: 'mut_true_div_to_floor_div', code: 'TRUE_DIV_TO_FLOOR_DIV', name: 'True Division to Floor Division', category: 'Arithmetic Operator', description: 'Mutates / true division to // floor division (truncates float)', enabled: true },
  { id: 'mut_exponent_to_multiply', code: 'EXPONENT_TO_MULTIPLY', name: 'Exponentiation to Multiplication', category: 'Arithmetic Operator', description: 'Mutates ** exponentiation to * multiplication', enabled: true },
  { id: 'mut_unary_plus_to_minus', code: 'UNARY_PLUS_TO_MINUS', name: 'Unary Plus to Unary Minus', category: 'Arithmetic Operator', description: 'Mutates +x to -x', enabled: true },
  { id: 'mut_unary_minus_to_plus', code: 'UNARY_MINUS_TO_PLUS', name: 'Unary Minus to Unary Plus', category: 'Arithmetic Operator', description: 'Mutates -x to +x', enabled: true },
  { id: 'mut_modulo_to_plus', code: 'MODULO_TO_PLUS', name: 'Modulo to Addition', category: 'Arithmetic Operator', description: 'Mutates % modulo operator to + addition', enabled: true },
  { id: 'mut_multiply_to_plus', code: 'MULTIPLY_TO_PLUS', name: 'Multiplication to Addition', category: 'Arithmetic Operator', description: 'Mutates * multiplication to + addition', enabled: true },
  { id: 'mut_modulo_remainder_direction', code: 'MODULO_REMAINDER_DIRECTION', name: 'Modulo Remainder Offset', category: 'Arithmetic Operator', description: 'Adds 1 to divisor in modulo calculation', enabled: true },

  // =========================================================================
  // 4. Logical Operators (12)
  // =========================================================================
  { id: 'mut_and_to_or', code: 'AND_TO_OR', name: 'Logical AND to OR', category: 'Logical Operator', description: 'Mutates logical and/&& operator to or/||', enabled: true },
  { id: 'mut_or_to_and', code: 'OR_TO_AND', name: 'Logical OR to AND', category: 'Logical Operator', description: 'Mutates logical or/|| operator to and/&&', enabled: true },
  { id: 'mut_boolean_negation', code: 'BOOLEAN_NEGATION', name: 'Boolean Negation', category: 'Logical Operator', description: 'Inverts boolean literal or negates conditional expression', enabled: true },
  { id: 'mut_logical_not_removal', code: 'LOGICAL_NOT_REMOVAL', name: 'Logical NOT Removal', category: 'Logical Operator', description: 'Removes unary NOT / ! prefix operator', enabled: true },
  { id: 'mut_logical_not_insertion', code: 'LOGICAL_NOT_INSERTION', name: 'Logical NOT Insertion', category: 'Logical Operator', description: 'Inserts unary NOT / ! prefix operator', enabled: true },
  { id: 'mut_and_to_xor', code: 'AND_TO_XOR', name: 'Logical AND to XOR', category: 'Logical Operator', description: 'Mutates logical AND to XOR', enabled: true },
  { id: 'mut_short_circuit_left', code: 'SHORT_CIRCUIT_LEFT', name: 'Short Circuit Left Operand', category: 'Logical Operator', description: 'Replaces binary logical expression with left operand', enabled: true },
  { id: 'mut_short_circuit_right', code: 'SHORT_CIRCUIT_RIGHT', name: 'Short Circuit Right Operand', category: 'Logical Operator', description: 'Replaces binary logical expression with right operand', enabled: true },
  { id: 'mut_ternary_condition_invert', code: 'TERNARY_CONDITION_INVERT', name: 'Ternary Condition Inversion', category: 'Logical Operator', description: 'Inverts condition in inline ternary expression', enabled: true },
  { id: 'mut_nullish_coalescing_to_or', code: 'NULLISH_COALESCING_TO_OR', name: 'Nullish Coalescing to OR', category: 'Logical Operator', description: 'Mutates ?? operator to ||', enabled: true },
  { id: 'mut_demorgan_conjunction_invert', code: 'DEMORGAN_CONJUNCTION_INVERT', name: 'De Morgan Conjunction Inversion', category: 'Logical Operator', description: 'Inverts compounded boolean predicates without inner negation', enabled: true },
  { id: 'mut_all_any_quantifier_swap', code: 'ALL_ANY_QUANTIFIER_SWAP', name: 'Universal vs Existential Quantifier Swap', category: 'Logical Operator', description: 'Swaps all() predicate evaluation with any()', enabled: true },

  // =========================================================================
  // 5. Bitwise Operators (10)
  // =========================================================================
  { id: 'mut_bitwise_and_to_or', code: 'BITWISE_AND_TO_OR', name: 'Bitwise AND to OR', category: 'Bitwise Operator', description: 'Mutates & bitwise operator to |', enabled: true },
  { id: 'mut_bitwise_or_to_and', code: 'BITWISE_OR_TO_AND', name: 'Bitwise OR to AND', category: 'Bitwise Operator', description: 'Mutates | bitwise operator to &', enabled: true },
  { id: 'mut_bitwise_xor_to_or', code: 'BITWISE_XOR_TO_OR', name: 'Bitwise XOR to OR', category: 'Bitwise Operator', description: 'Mutates ^ bitwise operator to |', enabled: true },
  { id: 'mut_bitwise_left_shift_to_right', code: 'BITWISE_LEFT_SHIFT_TO_RIGHT', name: 'Bitwise Left Shift to Right Shift', category: 'Bitwise Operator', description: 'Mutates << shift operator to >>', enabled: true },
  { id: 'mut_bitwise_right_shift_to_left', code: 'BITWISE_RIGHT_SHIFT_TO_LEFT', name: 'Bitwise Right Shift to Left Shift', category: 'Bitwise Operator', description: 'Mutates >> shift operator to <<', enabled: true },
  { id: 'mut_bitwise_not_inversion', code: 'BITWISE_NOT_INVERSION', name: 'Bitwise NOT Inversion', category: 'Bitwise Operator', description: 'Mutates ~ bitwise NOT operator', enabled: true },
  { id: 'mut_bitwise_and_to_xor', code: 'BITWISE_AND_TO_XOR', name: 'Bitwise AND to XOR', category: 'Bitwise Operator', description: 'Mutates & bitwise AND operator to ^', enabled: true },
  { id: 'mut_bitwise_or_to_xor', code: 'BITWISE_OR_TO_XOR', name: 'Bitwise OR to XOR', category: 'Bitwise Operator', description: 'Mutates | bitwise OR operator to ^', enabled: true },
  { id: 'mut_bitmask_clear_vs_set', code: 'BITMASK_CLEAR_VS_SET', name: 'Bitmask Clear vs Set Inversion', category: 'Bitwise Operator', description: 'Mutates bit clearing operation (x & ~mask) to bit setting (x | mask)', enabled: true },
  { id: 'mut_parity_bitwise_check', code: 'PARITY_BITWISE_CHECK', name: 'Bitwise Parity Check Inversion', category: 'Bitwise Operator', description: 'Inverts (n & 1) odd/even parity validation check', enabled: true },

  // =========================================================================
  // 6. Control Flow & Guard Clauses (20)
  // =========================================================================
  { id: 'mut_conditional_branch_inversion', code: 'CONDITIONAL_BRANCH_INVERSION', name: 'Conditional Branch Inversion', category: 'Control Flow', description: 'Swaps consequent and alternate branches of if/else statements', enabled: true },
  { id: 'mut_return_value_mutation', code: 'RETURN_VALUE_MUTATION', name: 'Return Value Mutation', category: 'Control Flow', description: 'Alters returned expression while preserving syntactic validity', enabled: true },
  { id: 'mut_early_return_null', code: 'EARLY_RETURN_NULL', name: 'Early Return Null/None', category: 'Control Flow', description: 'Forces return of null or None prematurely', enabled: true },
  { id: 'mut_break_to_continue', code: 'BREAK_TO_CONTINUE', name: 'Break to Continue', category: 'Control Flow', description: 'Mutates break statement inside loop to continue', enabled: true },
  { id: 'mut_continue_to_break', code: 'CONTINUE_TO_BREAK', name: 'Continue to Break', category: 'Control Flow', description: 'Mutates continue statement inside loop to break', enabled: true },
  { id: 'mut_switch_case_fallthrough', code: 'SWITCH_CASE_FALLTHROUGH', name: 'Switch Case Fallthrough', category: 'Control Flow', description: 'Removes break statement from switch case block', enabled: true },
  { id: 'mut_else_if_to_if', code: 'ELSE_IF_TO_IF', name: 'Else If to Independent If', category: 'Control Flow', description: 'Decouples else if / elif into standalone if block', enabled: true },
  { id: 'mut_guard_clause_inversion', code: 'GUARD_CLAUSE_INVERSION', name: 'Guard Clause Inversion', category: 'Control Flow', description: 'Inverts guard condition causing premature return for valid input', enabled: true },
  { id: 'mut_guard_clause_default_return', code: 'GUARD_CLAUSE_DEFAULT_RETURN', name: 'Guard Clause Return Value Bug', category: 'Control Flow', description: 'Returns empty structure instead of None/null in input validation', enabled: true },
  { id: 'mut_exception_catch_all', code: 'EXCEPTION_CATCH_ALL', name: 'Try/Catch Swallowing', category: 'Control Flow', description: 'Mutates specific exception type to catch-all handler', enabled: true },
  { id: 'mut_return_expression_negation', code: 'RETURN_EXPRESSION_NEGATION', name: 'Return Expression Negation', category: 'Control Flow', description: 'Negates numeric or boolean expression in return statement', enabled: true },
  { id: 'mut_return_inside_loop_body', code: 'RETURN_INSIDE_LOOP_BODY', name: 'Return Inside Loop (Premature Termination)', category: 'Control Flow', description: 'Indents return statement inside loop so only 1st iteration executes', enabled: true },
  { id: 'mut_overlapping_condition_precedence', code: 'OVERLAPPING_CONDITION_PRECEDENCE', name: 'Overlapping Condition Precedence', category: 'Control Flow', description: 'Reorders conditional checks so less specific case fires first', enabled: true },
  { id: 'mut_empty_collection_guard_drop', code: 'EMPTY_COLLECTION_GUARD_DROP', name: 'Empty Collection Guard Omission', category: 'Control Flow', description: 'Removes boundary check for empty array/string causing IndexError', enabled: true },
  { id: 'mut_negative_index_guard_drop', code: 'NEGATIVE_INDEX_GUARD_DROP', name: 'Negative Number Guard Omission', category: 'Control Flow', description: 'Omits handling for negative inputs in math/string algorithms', enabled: true },
  { id: 'mut_infinite_loop_condition_freeze', code: 'INFINITE_LOOP_CONDITION_FREEZE', name: 'Loop Variable Update Freeze', category: 'Control Flow', description: 'Comments out or bypasses loop variable increment inside while loop', enabled: true },
  { id: 'mut_ternary_branch_swap', code: 'TERNARY_BRANCH_SWAP', name: 'Ternary Operator True/False Branch Swap', category: 'Control Flow', description: 'Swaps true and false expressions in inline ternary operator', enabled: true },
  { id: 'mut_nested_if_merge_error', code: 'NESTED_IF_MERGE_ERROR', name: 'Nested Condition Flattening Bug', category: 'Control Flow', description: 'Merges nested condition into parent with wrong boolean operator', enabled: true },
  { id: 'mut_try_finally_suppression', code: 'TRY_FINALLY_SUPPRESSION', name: 'Finally Block Return Override', category: 'Control Flow', description: 'Returns from finally block overriding try/except outcome', enabled: true },
  { id: 'mut_assert_condition_drop', code: 'ASSERT_CONDITION_DROP', name: 'Assertion Invariant Removal', category: 'Control Flow', description: 'Inverts assertion invariant checking logic', enabled: true },

  // =========================================================================
  // 7. Loop Boundaries, Range & Iteration (20)
  // =========================================================================
  { id: 'mut_loop_boundary_off_by_one', code: 'LOOP_BOUNDARY_OFF_BY_ONE', name: 'Loop Boundary Off-by-One', category: 'Loop Mutation', description: 'Modifies loop upper or lower bound by ±1', enabled: true },
  { id: 'mut_loop_condition_mutation', code: 'LOOP_CONDITION_MUTATION', name: 'Loop Condition Mutation', category: 'Loop Mutation', description: 'Modifies while/for loop continuation predicate', enabled: true },
  { id: 'mut_loop_increment_decrement_mutation', code: 'LOOP_INCREMENT_DECREMENT_MUTATION', name: 'Loop Step Mutation', category: 'Loop Mutation', description: 'Mutates increment to decrement or alters step value', enabled: true },
  { id: 'mut_loop_start_offset', code: 'LOOP_START_OFFSET', name: 'Loop Start Offset Mutation', category: 'Loop Mutation', description: 'Modifies loop initial index from 0 to 1 (skips index 0)', enabled: true },
  { id: 'mut_loop_direction_swap', code: 'LOOP_DIRECTION_SWAP', name: 'Loop Direction Swap', category: 'Loop Mutation', description: 'Reverses loop counting direction from ascending to descending', enabled: true },
  { id: 'mut_loop_stride_mutation', code: 'LOOP_STRIDE_MUTATION', name: 'Loop Stride Step Alteration', category: 'Loop Mutation', description: 'Changes loop step stride from 1 to 2 or vice versa', enabled: true },
  { id: 'mut_nested_loop_index_swap', code: 'NESTED_LOOP_INDEX_SWAP', name: 'Nested Loop Index Swap', category: 'Loop Mutation', description: 'Swaps inner and outer loop iterators (i and j)', enabled: true },
  { id: 'mut_while_to_do_while', code: 'WHILE_TO_DO_WHILE', name: 'While to Do-While Mutation', category: 'Loop Mutation', description: 'Alters loop pre-condition execution behavior', enabled: true },
  { id: 'mut_loop_termination_off_by_one', code: 'LOOP_TERMINATION_OFF_BY_ONE', name: 'Loop Termination Off-by-One (Skip Last)', category: 'Loop Mutation', description: 'Mutates termination check from < len to < len - 1 (skips last element)', enabled: true },
  { id: 'mut_range_inclusive_exclusive_swap', code: 'RANGE_INCLUSIVE_EXCLUSIVE_SWAP', name: 'Range Bounds Swap', category: 'Loop Mutation', description: 'Swaps inclusive vs exclusive upper range bound', enabled: true },
  { id: 'mut_loop_upper_bound_overflow', code: 'LOOP_UPPER_BOUND_OVERFLOW', name: 'Loop Boundary Out-of-Bounds (+1)', category: 'Loop Mutation', description: 'Mutates range(len(arr)) to range(len(arr) + 1)', enabled: true },
  { id: 'mut_reverse_range_step_missing', code: 'REVERSE_RANGE_STEP_MISSING', name: 'Reverse Range Step Omission', category: 'Loop Mutation', description: 'Omits -1 step parameter in reverse countdown range', enabled: true },
  { id: 'mut_zip_iteration_truncation', code: 'ZIP_ITERATION_TRUNCATION', name: 'Zip Iteration Shortest Truncation', category: 'Loop Mutation', description: 'Swaps zip_longest with standard zip causing silent drop of items', enabled: true },
  { id: 'mut_enumerate_start_index_offset', code: 'ENUMERATE_START_INDEX_OFFSET', name: 'Enumerate Start Index Offset', category: 'Loop Mutation', description: 'Changes enumerate start parameter from 0 to 1', enabled: true },
  { id: 'mut_collection_mutation_during_iteration', code: 'COLLECTION_MUTATION_DURING_ITERATION', name: 'Collection Mutation While Iterating', category: 'Loop Mutation', description: 'Mutates loop source collection in place during traversal', enabled: true },
  { id: 'mut_loop_accumulator_update_skip', code: 'LOOP_ACCUMULATOR_UPDATE_SKIP', name: 'Loop Accumulator Skip on Condition', category: 'Loop Mutation', description: 'Inverts branch guarding accumulator update inside loop', enabled: true },
  { id: 'mut_for_each_index_confusion', code: 'FOR_EACH_INDEX_CONFUSION', name: 'Loop Item vs Index Identifier Confusion', category: 'Loop Mutation', description: 'Uses loop item as index or loop index as item', enabled: true },
  { id: 'mut_while_true_break_inverted', code: 'WHILE_TRUE_BREAK_INVERTED', name: 'While True Break Condition Inversion', category: 'Loop Mutation', description: 'Inverts break guard inside indefinite loop', enabled: true },
  { id: 'mut_loop_stride_negative', code: 'LOOP_STRIDE_NEGATIVE', name: 'Negative Loop Stride Error', category: 'Loop Mutation', description: 'Inverts sign of loop stride without swapping bounds', enabled: true },
  { id: 'mut_matrix_col_bound_in_row_loop', code: 'MATRIX_COL_BOUND_IN_ROW_LOOP', name: 'Matrix Row/Col Loop Dimension Swapped', category: 'Loop Mutation', description: 'Uses len(matrix[0]) for row loop and len(matrix) for col loop', enabled: true },

  // =========================================================================
  // 8. Identifier, Scope & Parameter Transpositions (14)
  // =========================================================================
  { id: 'mut_variable_reference_swap', code: 'VARIABLE_REFERENCE_SWAP', name: 'Variable Reference Swap', category: 'Identifier Mutation', description: 'Swaps references to two variables of compatible scope and type', enabled: true },
  { id: 'mut_variable_swap', code: 'VARIABLE_SWAP', name: 'Variable Assignment Swap', category: 'Assignment Mutation', description: 'Swaps assignment targets or positions in multi-variable blocks', enabled: true },
  { id: 'mut_shadowed_variable_swap', code: 'SHADOWED_VARIABLE_SWAP', name: 'Shadowed Variable Swap', category: 'Identifier Mutation', description: 'Swaps local parameter reference with outer scope identifier', enabled: true },
  { id: 'mut_accumulator_variable_swap', code: 'ACCUMULATOR_VARIABLE_SWAP', name: 'Accumulator Variable Swap', category: 'Identifier Mutation', description: 'Swaps accumulator variable with loop counter variable', enabled: true },
  { id: 'mut_parameter_order_swap', code: 'PARAMETER_ORDER_SWAP', name: 'Parameter Order Swap', category: 'Identifier Mutation', description: 'Swaps parameter binding references inside function body', enabled: true },
  { id: 'mut_member_property_swap', code: 'MEMBER_PROPERTY_SWAP', name: 'Member Property Access Swap', category: 'Identifier Mutation', description: 'Swaps object field/property access key', enabled: true },
  { id: 'mut_outer_inner_variable_collision', code: 'OUTER_INNER_VARIABLE_COLLISION', name: 'Scope Reassignment Overwrite', category: 'Identifier Mutation', description: 'Reassigns outer iteration variable inside nested block', enabled: true },
  { id: 'mut_left_right_pointer_variable_swap', code: 'LEFT_RIGHT_POINTER_VARIABLE_SWAP', name: 'Left vs Right Pointer Variable Swap', category: 'Identifier Mutation', description: 'Swaps left and right pointer identifiers in binary search/2-pointer', enabled: true },
  { id: 'mut_row_col_variable_transposition', code: 'ROW_COL_VARIABLE_TRANSPOSITION', name: 'Row vs Col Variable Transposition', category: 'Identifier Mutation', description: 'Swaps r and c coordinate identifiers in matrix access', enabled: true },
  { id: 'mut_source_target_variable_swap', code: 'SOURCE_TARGET_VARIABLE_SWAP', name: 'Source vs Target Variable Swap', category: 'Identifier Mutation', description: 'Swaps source and destination identifiers in graph/string copy', enabled: true },
  { id: 'mut_current_next_node_swap', code: 'CURRENT_NEXT_NODE_SWAP', name: 'Current vs Next Pointer Variable Swap', category: 'Identifier Mutation', description: 'Swaps curr and curr.next in linked list traversal', enabled: true },
  { id: 'mut_key_value_variable_swap', code: 'KEY_VALUE_VARIABLE_SWAP', name: 'Dict Key vs Value Variable Swap', category: 'Identifier Mutation', description: 'Swaps key and value variables in dictionary iteration', enabled: true },
  { id: 'mut_prev_curr_state_swap', code: 'PREV_CURR_STATE_SWAP', name: 'Previous vs Current State Variable Swap', category: 'Identifier Mutation', description: 'Swaps prev and curr variables during state updates', enabled: true },
  { id: 'mut_min_max_tracker_variable_swap', code: 'MIN_MAX_TRACKER_VARIABLE_SWAP', name: 'Min vs Max Tracker Variable Swap', category: 'Identifier Mutation', description: 'Swaps min_val and max_val variable identifiers', enabled: true },

  // =========================================================================
  // 9. Assignment & State Reassignments (12)
  // =========================================================================
  { id: 'mut_assign_plus_to_minus', code: 'ASSIGN_PLUS_TO_MINUS', name: 'Augmented Assignment += to -=', category: 'Assignment Mutation', description: 'Mutates += compound assignment operator to -=', enabled: true },
  { id: 'mut_assign_minus_to_plus', code: 'ASSIGN_MINUS_TO_PLUS', name: 'Augmented Assignment -= to +=', category: 'Assignment Mutation', description: 'Mutates -= compound assignment operator to +=', enabled: true },
  { id: 'mut_assign_mult_to_div', code: 'ASSIGN_MULT_TO_DIV', name: 'Augmented Assignment *= to /=', category: 'Assignment Mutation', description: 'Mutates *= compound assignment operator to /=', enabled: true },
  { id: 'mut_assign_div_to_mult', code: 'ASSIGN_DIV_TO_MULT', name: 'Augmented Assignment /= to *=', category: 'Assignment Mutation', description: 'Mutates /= compound assignment operator to *=', enabled: true },
  { id: 'mut_reassignment_removal', code: 'REASSIGNMENT_REMOVAL', name: 'State Reassignment Override', category: 'Assignment Mutation', description: 'Mutates updated assignment to retain previous state', enabled: true },
  { id: 'mut_compound_assign_to_simple', code: 'COMPOUND_ASSIGN_TO_SIMPLE', name: 'Compound Assignment to Direct Assignment', category: 'Assignment Mutation', description: 'Mutates += x to = x (erases cumulative progress)', enabled: true },
  { id: 'mut_assign_zero_override', code: 'ASSIGN_ZERO_OVERRIDE', name: 'Assignment Zero Override', category: 'Assignment Mutation', description: 'Overrides assignment RHS expression to 0', enabled: true },
  { id: 'mut_assign_swap_rhs', code: 'ASSIGN_SWAP_RHS', name: 'RHS Operand Order Swap', category: 'Assignment Mutation', description: 'Swaps operand order in assignment RHS binary expression', enabled: true },
  { id: 'mut_assignment_target_self_overwrite', code: 'ASSIGNMENT_TARGET_SELF_OVERWRITE', name: 'Self Assignment No-Op', category: 'Assignment Mutation', description: 'Replaces assignment with self-assignment x = x', enabled: true },
  { id: 'mut_tuple_unpacking_order_swap', code: 'TUPLE_UNPACKING_ORDER_SWAP', name: 'Tuple Unpacking Order Swap', category: 'Assignment Mutation', description: 'Swaps targets in multiple assignment: a, b = b, a', enabled: true },
  { id: 'mut_assignment_delayed_update', code: 'ASSIGNMENT_DELAYED_UPDATE', name: 'State Update Premature Overwrite', category: 'Assignment Mutation', description: 'Updates temporary variable after overwriting source', enabled: true },
  { id: 'mut_inplace_modification_vs_assignment', code: 'INPLACE_MODIFICATION_VS_ASSIGNMENT', name: 'In-Place vs Reassignment Return Swap', category: 'Assignment Mutation', description: 'Assigns return of in-place method arr = arr.sort()', enabled: true },

  // =========================================================================
  // 10. Literal Mutations & Constant Invariants (12)
  // =========================================================================
  { id: 'mut_constant_literal_mutation', code: 'CONSTANT_LITERAL_MUTATION', name: 'Constant Literal Mutation', category: 'Literal Mutation', description: 'Alters a constant numeric literal by a small discrete delta', enabled: true },
  { id: 'mut_zero_to_one', code: 'ZERO_TO_ONE', name: 'Literal 0 to 1 Mutation', category: 'Literal Mutation', description: 'Mutates literal numeric 0 to 1', enabled: true },
  { id: 'mut_one_to_zero', code: 'ONE_TO_ZERO', name: 'Literal 1 to 0 Mutation', category: 'Literal Mutation', description: 'Mutates literal numeric 1 to 0', enabled: true },
  { id: 'mut_string_empty_mutation', code: 'STRING_EMPTY_MUTATION', name: 'String Literal Emptiness Mutation', category: 'Literal Mutation', description: 'Replaces non-empty string literal with empty string', enabled: true },
  { id: 'mut_float_precision_truncate', code: 'FLOAT_PRECISION_TRUNCATE', name: 'Floating Point Precision Delta', category: 'Literal Mutation', description: 'Alters floating point literal precision value', enabled: true },
  { id: 'mut_negative_sign_flip', code: 'NEGATIVE_SIGN_FLIP', name: 'Numeric Sign Inversion', category: 'Literal Mutation', description: 'Flips sign of constant numeric literal', enabled: true },
  { id: 'mut_off_by_one_literal', code: 'OFF_BY_ONE_LITERAL', name: 'Literal Off-by-One Delta', category: 'Literal Mutation', description: 'Increments or decrements numeric literal by 1', enabled: true },
  { id: 'mut_null_literal_swap', code: 'NULL_LITERAL_SWAP', name: 'Null/None Literal Swap', category: 'Literal Mutation', description: 'Swaps null or None literal with empty container or object', enabled: true },
  { id: 'mut_boolean_literal_flip', code: 'BOOLEAN_LITERAL_FLIP', name: 'Boolean Literal True/False Flip', category: 'Literal Mutation', description: 'Swaps True to False or False to True', enabled: true },
  { id: 'mut_large_integer_modulo_const', code: 'LARGE_INTEGER_MODULO_CONST', name: 'Modulo Constant 1e9+7 Corruption', category: 'Literal Mutation', description: 'Mutates 10**9 + 7 to 10**9 or 10**9 + 9', enabled: true },
  { id: 'mut_whitespace_delimiter_constant', code: 'WHITESPACE_DELIMITER_CONSTANT', name: 'Delimiter Literal Swap', category: 'Literal Mutation', description: 'Swaps single space delimiter with empty string or comma', enabled: true },
  { id: 'mut_sentinel_negative_one_to_zero', code: 'SENTINEL_NEGATIVE_ONE_TO_ZERO', name: 'Sentinel -1 to 0 Mutation', category: 'Literal Mutation', description: 'Mutates not-found sentinel -1 to 0 (valid index collision)', enabled: true },

  // =========================================================================
  // 11. State Initialization, Sentinels & Accumulators (20)
  // =========================================================================
  { id: 'mut_initialization_value_mutation', code: 'INITIALIZATION_VALUE_MUTATION', name: 'Initialization Value Mutation', category: 'State Initialization', description: 'Changes initial state value (e.g., 0 to 1, or empty container)', enabled: true },
  { id: 'mut_init_empty_array_to_null', code: 'INIT_EMPTY_ARRAY_TO_NULL', name: 'Collection Initialization Override', category: 'State Initialization', description: 'Mutates initial empty array/list to single element', enabled: true },
  { id: 'mut_init_accumulator_zero_to_one', code: 'INIT_ACCUMULATOR_ZERO_TO_ONE', name: 'Sum Accumulator Initial Value 0 to 1', category: 'State Initialization', description: 'Mutates initial sum accumulator from 0 to 1', enabled: true },
  { id: 'mut_init_accumulator_one_to_zero', code: 'INIT_ACCUMULATOR_ONE_TO_ZERO', name: 'Product Accumulator Initial Value 1 to 0', category: 'State Initialization', description: 'Mutates initial product accumulator from 1 to 0 (yields 0 product)', enabled: true },
  { id: 'mut_running_total_reset_in_loop', code: 'RUNNING_TOTAL_RESET_IN_LOOP', name: 'Running Total Reset Inside Loop Body', category: 'State & Accumulators', description: 'Resets accumulator total = 0 inside loop wiping previous iterations', enabled: true },
  { id: 'mut_max_sentinel_zero_init', code: 'MAX_SENTINEL_ZERO_INIT', name: 'Max Sentinel Zero Initialization Bug', category: 'State & Accumulators', description: 'Initializes max tracker to 0 instead of -inf/first item (fails on negatives)', enabled: true },
  { id: 'mut_min_sentinel_zero_init', code: 'MIN_SENTINEL_ZERO_INIT', name: 'Min Sentinel Zero Initialization Bug', category: 'State & Accumulators', description: 'Initializes min tracker to 0 instead of +inf/first item (fails on positives)', enabled: true },
  { id: 'mut_count_increment_to_decrement', code: 'COUNT_INCREMENT_TO_DECREMENT', name: 'Counter Increment to Decrement', category: 'State & Accumulators', description: 'Mutates counter increment count += 1 to count -= 1', enabled: true },
  { id: 'mut_average_division_count', code: 'AVERAGE_DIVISION_COUNT', name: 'Mean Average Divisor Count Off-by-One', category: 'State & Accumulators', description: 'Divides total sum by (len - 1) instead of len', enabled: true },
  { id: 'mut_default_dict_missing_factory', code: 'DEFAULT_DICT_MISSING_FACTORY', name: 'Dictionary Key Initialization Omission', category: 'State & Accumulators', description: 'Accesses dictionary key without prior existence verification', enabled: true },
  { id: 'mut_flag_variable_not_reset', code: 'FLAG_VARIABLE_NOT_RESET', name: 'Loop Flag Variable Reset Omission', category: 'State & Accumulators', description: 'Fails to reset boolean flag between outer loop passes', enabled: true },
  { id: 'mut_accumulator_update_outside_if', code: 'ACCUMULATOR_UPDATE_OUTSIDE_IF', name: 'Accumulator Updated Unconditionally', category: 'State & Accumulators', description: 'Moves accumulator increment outside conditional filter block', enabled: true },
  { id: 'mut_accumulator_item_vs_index_add', code: 'ACCUMULATOR_ITEM_VS_INDEX_ADD', name: 'Accumulating Index Instead of Element', category: 'State & Accumulators', description: 'Adds loop index i to sum instead of array element nums[i]', enabled: true },
  { id: 'mut_string_builder_concatenation_reset', code: 'STRING_BUILDER_CONCATENATION_RESET', name: 'String Builder Reassignment Reset', category: 'State & Accumulators', description: 'Mutates res += char to res = char (only retains last character)', enabled: true },
  { id: 'mut_mutable_default_argument', code: 'MUTABLE_DEFAULT_ARGUMENT', name: 'Mutable Default Argument Bug', category: 'State Initialization', description: 'Changes def fn(x=None) to def fn(x=[]) accumulating state across calls', enabled: true },
  { id: 'mut_shallow_copy_nested_mutation', code: 'SHALLOW_COPY_NESTED_MUTATION', name: 'Shallow vs Deep Copy Reference Bug', category: 'State Initialization', description: 'Uses shallow slice copy list(arr) instead of deep copy for nested lists', enabled: true },
  { id: 'mut_seen_set_insertion_omission', code: 'SEEN_SET_INSERTION_OMISSION', name: 'Visited Set Addition Omission', category: 'State & Accumulators', description: 'Checks visited set but omits visited.add(x) causing infinite processing', enabled: true },
  { id: 'mut_kadane_max_ending_here_reset', code: 'KADANE_MAX_ENDING_HERE_RESET', name: 'Kadane Max Ending Here Reset Bug', category: 'State & Accumulators', description: 'Resets max_ending_here to 0 unconditionally instead of max(x, current + x)', enabled: true },
  { id: 'mut_prefix_sum_offset_init', code: 'PREFIX_SUM_OFFSET_INIT', name: 'Prefix Sum Array Initialization Offset', category: 'State & Accumulators', description: 'Initializes prefix sum array of size N instead of N + 1', enabled: true },
  { id: 'mut_frequency_map_decrement_instead_of_increment', code: 'FREQUENCY_MAP_DECREMENT_INSTEAD_OF_INCREMENT', name: 'Frequency Map Count Decrement', category: 'State & Accumulators', description: 'Decrements frequency counts during tallying phase', enabled: true },

  // =========================================================================
  // 12. Collection Access, Bounds & Slicing (22)
  // =========================================================================
  { id: 'mut_array_index_mutation', code: 'ARRAY_INDEX_MUTATION', name: 'Array Index Offset Mutation', category: 'Collection Access', description: 'Alters array index lookup by ±1 or index offset', enabled: true },
  { id: 'mut_collection_element_selection_mutation', code: 'COLLECTION_ELEMENT_SELECTION_MUTATION', name: 'Collection Selection Mutation', category: 'Collection Access', description: 'Mutates collection head/last selection or slice bound', enabled: true },
  { id: 'mut_slice_start_bound', code: 'SLICE_START_BOUND', name: 'Slice Start Bound Offset (+1)', category: 'Collection Access', description: 'Mutates collection slice start index by +1 (drops head element)', enabled: true },
  { id: 'mut_slice_end_bound', code: 'SLICE_END_BOUND', name: 'Slice End Bound Offset (-1)', category: 'Collection Access', description: 'Mutates collection slice end index by -1 (drops tail element)', enabled: true },
  { id: 'mut_array_first_last_swap', code: 'ARRAY_FIRST_LAST_SWAP', name: 'First vs Last Element Lookup Swap', category: 'Collection Access', description: 'Swaps index [0] access with [-1] or [length - 1]', enabled: true },
  { id: 'mut_off_by_one_index_access', code: 'OFF_BY_ONE_INDEX_ACCESS', name: 'Index Access Off-By-One', category: 'Collection Access', description: 'Adds 1 to element index access causing out-of-bounds or shift', enabled: true },
  { id: 'mut_slice_step_direction_inversion', code: 'SLICE_STEP_DIRECTION_INVERSION', name: 'Slice Step Direction Inversion', category: 'Collection Access', description: 'Mutates slice step [::-1] to [::1] (fails palindrome/reverse)', enabled: true },
  { id: 'mut_matrix_transposition_access', code: 'MATRIX_TRANSPOSITION_ACCESS', name: '2D Matrix Row/Column Transposition', category: 'Collection Access', description: 'Swaps grid[r][c] to grid[c][r] (causes IndexError on non-square matrix)', enabled: true },
  { id: 'mut_dict_key_lookup_value_swap', code: 'DICT_KEY_LOOKUP_VALUE_SWAP', name: 'Dictionary Key/Value Lookup Confusion', category: 'Collection Access', description: 'Uses value as dictionary lookup key instead of expected identifier', enabled: true },
  { id: 'mut_two_pointer_mid_index_calculation', code: 'TWO_POINTER_MID_INDEX_CALCULATION', name: 'Midpoint Index Offset Error', category: 'Collection Access', description: 'Mutates mid = (low + high) // 2 to mid = (high - low) // 2', enabled: true },
  { id: 'mut_binary_search_right_bound_update', code: 'BINARY_SEARCH_RIGHT_BOUND_UPDATE', name: 'Binary Search Right Bound Infinite Loop', category: 'Collection Access', description: 'Mutates high = mid - 1 to high = mid (causes infinite loop on low == mid)', enabled: true },
  { id: 'mut_binary_search_left_bound_update', code: 'BINARY_SEARCH_LEFT_BOUND_UPDATE', name: 'Binary Search Left Bound Infinite Loop', category: 'Collection Access', description: 'Mutates low = mid + 1 to low = mid (causes infinite loop)', enabled: true },
  { id: 'mut_two_pointer_left_advance_on_large_sum', code: 'TWO_POINTER_LEFT_ADVANCE_ON_LARGE_SUM', name: 'Two Pointer Direction Synchronization Bug', category: 'Collection Access', description: 'Increments left pointer instead of decrementing right pointer', enabled: true },
  { id: 'mut_sliding_window_shrink_condition', code: 'SLIDING_WINDOW_SHRINK_CONDITION', name: 'Sliding Window Contraction Inversion', category: 'Collection Access', description: 'Inverts window contraction while loop condition', enabled: true },
  { id: 'mut_sliding_window_left_pointer_advance', code: 'SLIDING_WINDOW_LEFT_POINTER_ADVANCE', name: 'Sliding Window Left Pointer Freeze', category: 'Collection Access', description: 'Omits left += 1 pointer advance during window shrinking', enabled: true },
  { id: 'mut_queue_pop_left_to_pop_right', code: 'QUEUE_POP_LEFT_TO_POP_RIGHT', name: 'FIFO Queue to LIFO Stack Swap', category: 'Collection Access', description: 'Mutates popleft() to pop() (converts BFS to DFS)', enabled: true },
  { id: 'mut_stack_peek_vs_pop', code: 'STACK_PEEK_VS_POP', name: 'Stack Peek vs Pop Swap', category: 'Collection Access', description: 'Replaces stack.pop() with stack[-1] without removing element', enabled: true },
  { id: 'mut_heap_min_vs_max_push', code: 'HEAP_MIN_VS_MAX_PUSH', name: 'Min-Heap vs Max-Heap Sign Inversion', category: 'Collection Access', description: 'Omits negation on element pushed into min-heap to simulate max-heap', enabled: true },
  { id: 'mut_circular_array_modulo_wrap', code: 'CIRCULAR_ARRAY_MODULO_WRAP', name: 'Circular Array Index Modulo Omission', category: 'Collection Access', description: 'Omits % N wrap-around in circular queue / array pointer update', enabled: true },
  { id: 'mut_subsegment_length_calculation', code: 'SUBSEGMENT_LENGTH_CALCULATION', name: 'Inclusive Subsegment Length Off-by-One', category: 'Collection Access', description: 'Calculates length as (right - left) instead of (right - left + 1)', enabled: true },
  { id: 'mut_nested_list_flattening_order', code: 'NESTED_LIST_FLATTENING_ORDER', name: 'Nested List Flattening Order Inversion', category: 'Collection Access', description: 'Inverts row and column iteration in 2D list comprehension', enabled: true },
  { id: 'mut_dict_get_default_value_swap', code: 'DICT_GET_DEFAULT_VALUE_SWAP', name: 'Dictionary .get() Default Value Error', category: 'Collection Access', description: 'Mutates d.get(k, 0) to d.get(k, 1) or d.get(k, -1)', enabled: true },

  // =========================================================================
  // 13. Function Calls, Signatures & Method Chaining (16)
  // =========================================================================
  { id: 'mut_function_argument_mutation', code: 'FUNCTION_ARGUMENT_MUTATION', name: 'Function Argument Mutation', category: 'Function Call', description: 'Swaps positional argument values in function calls', enabled: true },
  { id: 'mut_arg_constant_override', code: 'ARG_CONSTANT_OVERRIDE', name: 'Argument Constant Replacement', category: 'Function Call', description: 'Replaces function call argument with 0 or null', enabled: true },
  { id: 'mut_arg_duplicate_pass', code: 'ARG_DUPLICATE_PASS', name: 'Duplicate Argument Passing', category: 'Function Call', description: 'Passes first argument twice in multi-argument function call', enabled: true },
  { id: 'mut_method_chain_drop', code: 'METHOD_CHAIN_DROP', name: 'Method Chain Call Skip', category: 'Function Call', description: 'Omits middle transformer step in chained method calls', enabled: true },
  { id: 'mut_positional_vs_keyword_arg_swap', code: 'POSITIONAL_VS_KEYWORD_ARG_SWAP', name: 'Keyword Argument Value Swap', category: 'Function Call', description: 'Swaps keyword argument values in function invocation', enabled: true },
  { id: 'mut_callee_method_name_mutation', code: 'CALLEE_METHOD_NAME_MUTATION', name: 'Callee Method Name Mutation', category: 'Function Call', description: 'Mutates append() to extend() or add() to update()', enabled: true },
  { id: 'mut_return_call_result_ignored', code: 'RETURN_CALL_RESULT_IGNORED', name: 'Functional Return Value Discarded', category: 'Function Call', description: 'Calls pure function without capturing return value (e.g. s.replace())', enabled: true },
  { id: 'mut_predicate_filter_return_inverted', code: 'PREDICATE_FILTER_RETURN_INVERTED', name: 'Predicate Filter Lambda Inversion', category: 'Function Call', description: 'Inverts boolean predicate lambda passed to filter() or find()', enabled: true },
  { id: 'mut_sort_key_lambda_index_swap', code: 'SORT_KEY_LAMBDA_INDEX_SWAP', name: 'Sort Key Tuple Index Swap', category: 'Function Call', description: 'Mutates sort key lambda x: x[0] to lambda x: x[1]', enabled: true },
  { id: 'mut_comparator_sign_inversion', code: 'COMPARATOR_SIGN_INVERSION', name: 'Comparator Return Sign Inversion', category: 'Function Call', description: 'Inverts return sign of custom comparator function (a - b to b - a)', enabled: true },
  { id: 'mut_varargs_splat_operator_omission', code: 'VARARGS_SPLAT_OPERATOR_OMISSION', name: 'Argument Unpacking (*args) Omission', category: 'Function Call', description: 'Passes wrapped list directly without unpacking (*arr)', enabled: true },
  { id: 'mut_format_specifier_swap', code: 'FORMAT_SPECIFIER_SWAP', name: 'String Format Specifier Mutation', category: 'Function Call', description: 'Mutates :.2f float specifier to :.0f integer rounding', enabled: true },
  { id: 'mut_recursive_helper_arguments_transposed', code: 'RECURSIVE_HELPER_ARGUMENTS_TRANSPOSED', name: 'Recursive Helper Coordinates Transposition', category: 'Function Call', description: 'Swaps (r, c) arguments to (c, r) in recursive DFS helper call', enabled: true },
  { id: 'mut_generator_next_exhaustion', code: 'GENERATOR_NEXT_EXHAUSTION', name: 'Premature Generator Next Call', category: 'Function Call', description: 'Calls next() prematurely advancing generator state', enabled: true },
  { id: 'mut_partial_function_currying_drop', code: 'PARTIAL_FUNCTION_CURRYING_DROP', name: 'Curried Function Application Omission', category: 'Function Call', description: 'Omits invocation of curried returned function', enabled: true },
  { id: 'mut_super_constructor_arguments_drop', code: 'SUPER_CONSTRUCTOR_ARGUMENTS_DROP', name: 'Superclass Constructor Arguments Drop', category: 'Function Call', description: 'Omits required forwarding arguments in super() call', enabled: true },

  // =========================================================================
  // 14. Built-in Function & Standard Library Swaps (15)
  // =========================================================================
  { id: 'mut_min_max_swap', code: 'MIN_MAX_SWAP', name: 'Min/Max Function Swap', category: 'Built-in Function', description: 'Swaps min() invocation for max() invocation or vice-versa', enabled: true },
  { id: 'mut_sum_len_swap', code: 'SUM_LEN_SWAP', name: 'Sum/Len Aggregation Swap', category: 'Built-in Function', description: 'Swaps sum() build-in with len() count', enabled: true },
  { id: 'mut_abs_value_drop', code: 'ABS_VALUE_DROP', name: 'Absolute Value Call Drop', category: 'Built-in Function', description: 'Removes abs() wrapper around numeric difference expression', enabled: true },
  { id: 'mut_floor_ceil_swap', code: 'FLOOR_CEIL_SWAP', name: 'Math Floor/Ceil Swap', category: 'Built-in Function', description: 'Swaps floor() function call with ceil()', enabled: true },
  { id: 'mut_str_lower_upper_swap', code: 'STR_LOWER_UPPER_SWAP', name: 'String lower()/upper() Swap', category: 'Built-in Function', description: 'Swaps lower() case function with upper()', enabled: true },
  { id: 'mut_sorted_reverse_swap', code: 'SORTED_REVERSE_SWAP', name: 'Sort Order Flag Swap', category: 'Built-in Function', description: 'Flips reverse flag in sort/sorted call (ascending vs descending)', enabled: true },
  { id: 'mut_any_all_builtins_swap', code: 'ANY_ALL_BUILTINS_SWAP', name: 'Any vs All Predicate Swap', category: 'Built-in Function', description: 'Swaps any() built-in with all()', enabled: true },
  { id: 'mut_round_int_truncation_swap', code: 'ROUND_INT_TRUNCATION_SWAP', name: 'Round vs Truncate Cast Swap', category: 'Built-in Function', description: 'Swaps round(x) with int(x) floor truncation', enabled: true },
  { id: 'mut_startswith_endswith_swap', code: 'STARTSWITH_ENDSWITH_SWAP', name: 'StartsWith vs EndsWith Swap', category: 'Built-in Function', description: 'Swaps startswith() check with endswith()', enabled: true },
  { id: 'mut_index_find_sentinel_handling', code: 'INDEX_FIND_SENTINEL_HANDLING', name: 'Index vs Find Exception Swap', category: 'Built-in Function', description: 'Swaps str.find() (-1 sentinel) with str.index() (raises ValueError)', enabled: true },
  { id: 'mut_set_intersection_union_swap', code: 'SET_INTERSECTION_UNION_SWAP', name: 'Set Intersection vs Union Swap', category: 'Built-in Function', description: 'Swaps set.intersection() (&) with set.union() (|)', enabled: true },
  { id: 'mut_set_difference_symmetric_difference_swap', code: 'SET_DIFFERENCE_SYMMETRIC_DIFFERENCE_SWAP', name: 'Set Difference vs Symmetric Difference Swap', category: 'Built-in Function', description: 'Swaps set difference (-) with symmetric difference (^)', enabled: true },
  { id: 'mut_ord_chr_unicode_swap', code: 'ORD_CHR_UNICODE_SWAP', name: 'Ord vs Chr Character Conversion Error', category: 'Built-in Function', description: 'Miscalculates alphabet offset in cipher / character arithmetic', enabled: true },
  { id: 'mut_math_gcd_lcm_swap', code: 'MATH_GCD_LCM_SWAP', name: 'GCD vs LCM Function Swap', category: 'Built-in Function', description: 'Swaps math.gcd with math.lcm computation', enabled: true },
  { id: 'mut_math_sqrt_power_swap', code: 'MATH_SQRT_POWER_SWAP', name: 'Square Root vs Power Swap', category: 'Built-in Function', description: 'Mutates math.isqrt() or sqrt() calculation to ** 2', enabled: true },

  // =========================================================================
  // 15. Algorithm Logic, Sorting, Kadane & Two-Pointers (25)
  // =========================================================================
  { id: 'mut_accumulator_aggregation_mutation', code: 'ACCUMULATOR_AGGREGATION_MUTATION', name: 'Accumulator Aggregation Mutation', category: 'Algorithm Logic', description: 'Mutates accumulator operation in reduction/aggregation loops', enabled: true },
  { id: 'mut_two_sum_hashmap_lookup_order', code: 'TWO_SUM_HASHMAP_LOOKUP_ORDER', name: 'Two-Sum Self Matching Hash Collision', category: 'Algorithm Logic', description: 'Inserts current element into map BEFORE checking complement (matches self)', enabled: true },
  { id: 'mut_kadane_negative_reset_condition', code: 'KADANE_NEGATIVE_RESET_CONDITION', name: 'Kadane Max Subarray Reset Inversion', category: 'Algorithm Logic', description: 'Resets running sum when > 0 instead of when < 0', enabled: true },
  { id: 'mut_binary_search_exact_match_return', code: 'BINARY_SEARCH_EXACT_MATCH_RETURN', name: 'Binary Search Match Target Omission', category: 'Algorithm Logic', description: 'Returns mid + 1 instead of mid when target found', enabled: true },
  { id: 'mut_dijkstra_visited_relexation_inversion', code: 'DIJKSTRA_VISITED_RELEXATION_INVERSION', name: 'Dijkstra Edge Relaxation Inversion', category: 'Algorithm Logic', description: 'Updates path distance when new_dist > dist[v] instead of < dist[v]', enabled: true },
  { id: 'mut_bfs_visited_enqueue_timing', code: 'BFS_VISITED_ENQUEUE_TIMING', name: 'BFS Duplicate Node Enqueue Bug', category: 'Algorithm Logic', description: 'Marks node visited on dequeue instead of enqueue (exponential duplicates)', enabled: true },
  { id: 'mut_dfs_cycle_detection_color_swap', code: 'DFS_CYCLE_DETECTION_COLOR_SWAP', name: 'Graph Cycle State Color Inversion', category: 'Algorithm Logic', description: 'Fails to backtrack node visiting state from GREY to BLACK', enabled: true },
  { id: 'mut_quickselect_partition_pivot_swap', code: 'QUICKSELECT_PARTITION_PIVOT_SWAP', name: 'Lomuto Partition Pivot Placement Off-by-One', category: 'Algorithm Logic', description: 'Swaps pivot element with index i instead of i + 1', enabled: true },
  { id: 'mut_merge_sort_merge_remaining_elements', code: 'MERGE_SORT_MERGE_REMAINING_ELEMENTS', name: 'Merge Sort Remaining Elements Drop', category: 'Algorithm Logic', description: 'Omits appending remaining elements from right subarray', enabled: true },
  { id: 'mut_monotonic_stack_pop_condition', code: 'MONOTONIC_STACK_POP_CONDITION', name: 'Monotonic Stack Strict Inequality Bug', category: 'Algorithm Logic', description: 'Mutates stack popping condition from >= to > (breaks duplicate handling)', enabled: true },
  { id: 'mut_interval_overlap_condition', code: 'INTERVAL_OVERLAP_CONDITION', name: 'Interval Merge Overlap Condition Bug', category: 'Algorithm Logic', description: 'Mutates current[1] >= next[0] to current[1] > next[0]', enabled: true },
  { id: 'mut_interval_end_max_update', code: 'INTERVAL_END_MAX_UPDATE', name: 'Interval End Timestamp Update Omission', category: 'Algorithm Logic', description: 'Assigns next[1] directly instead of max(current[1], next[1])', enabled: true },
  { id: 'mut_euclidean_gcd_remainder_order', code: 'EUCLIDEAN_GCD_REMAINDER_ORDER', name: 'Euclidean GCD Arguments Swapped', category: 'Algorithm Logic', description: 'Mutates gcd(b, a % b) to gcd(a % b, b)', enabled: true },
  { id: 'mut_sieve_inner_loop_start_multiple', code: 'SIEVE_INNER_LOOP_START_MULTIPLE', name: 'Sieve of Eratosthenes Inner Loop Start Bug', category: 'Algorithm Logic', description: 'Starts composite marking loop at p instead of p * p', enabled: true },
  { id: 'mut_topological_sort_indegree_decrement', code: 'TOPOLOGICAL_SORT_INDEGREE_DECREMENT', name: 'Topological Sort Indegree Zero Omission', category: 'Algorithm Logic', description: 'Enqueues neighbor when indegree != 0 instead of == 0', enabled: true },
  { id: 'mut_flood_fill_boundary_condition', code: 'FLOOD_FILL_BOUNDARY_CONDITION', name: 'Grid Traversal Boundary Off-by-One', category: 'Algorithm Logic', description: 'Uses r <= len(grid) instead of r < len(grid) (triggers IndexError)', enabled: true },
  { id: 'mut_backtracking_path_restore_outside_loop', code: 'BACKTRACKING_PATH_RESTORE_OUTSIDE_LOOP', name: 'Backtracking State Pop Placed Outside Loop', category: 'Algorithm Logic', description: 'Moves path.pop() state restore step outside choice loop', enabled: true },
  { id: 'mut_majority_element_boyer_moore_vote', code: 'MAJORITY_ELEMENT_BOYER_MOORE_VOTE', name: 'Boyer-Moore Voting Candidate Shift', category: 'Algorithm Logic', description: 'Resets vote count to 0 instead of 1 when new candidate chosen', enabled: true },
  { id: 'mut_trap_rainwater_two_pointer_height', code: 'TRAP_RAINWATER_TWO_POINTER_HEIGHT', name: 'Trapping Rainwater Height Subtraction Bug', category: 'Algorithm Logic', description: 'Subtracts height[right] from left_max instead of right_max', enabled: true },
  { id: 'mut_coin_change_unreachable_sentinel', code: 'COIN_CHANGE_UNREACHABLE_SENTINEL', name: 'DP Unreachable Sentinel Check Bug', category: 'Algorithm Logic', description: 'Checks dp[amount] == inf but returns 0 instead of -1', enabled: true },
  { id: 'mut_longest_common_subsequence_diagonal', code: 'LONGEST_COMMON_SUBSEQUENCE_DIAGONAL', name: 'LCS Diagonal Transition Offset', category: 'Algorithm Logic', description: 'Updates dp[i][j] from dp[i-1][j] instead of dp[i-1][j-1] + 1', enabled: true },
  { id: 'mut_knapsack_weight_loop_direction', code: 'KNAPSACK_WEIGHT_LOOP_DIRECTION', name: '0/1 Knapsack 1D DP Loop Direction Bug', category: 'Algorithm Logic', description: 'Traverses weights ascending instead of descending (allows unbounded items)', enabled: true },
  { id: 'mut_longest_palindromic_substring_expansion', code: 'LONGEST_PALINDROMIC_SUBSTRING_EXPANSION', name: 'Palindrome Center Expansion Boundary', category: 'Algorithm Logic', description: 'Expands center with left > 0 instead of left >= 0 (skips index 0)', enabled: true },
  { id: 'mut_matrix_spiral_traversal_boundary_update', code: 'MATRIX_SPIRAL_TRAVERSAL_BOUNDARY_UPDATE', name: 'Spiral Matrix Boundary Inward Shift Omission', category: 'Algorithm Logic', description: 'Omits top += 1 or right -= 1 resulting in infinite loop', enabled: true },
  { id: 'mut_rotate_array_reverse_segments', code: 'ROTATE_ARRAY_REVERSE_SEGMENTS', name: 'Array Rotation Segment Reverse Bounds', category: 'Algorithm Logic', description: 'Reverses from k to N instead of 0 to k', enabled: true },

  // =========================================================================
  // 16. Recursion, Base Cases & Dynamic Programming (18)
  // =========================================================================
  { id: 'mut_recursion_base_case_bound', code: 'RECURSION_BASE_CASE_BOUND', name: 'Recursion Base Case Off-by-One', category: 'Recursion & Base Case', description: 'Modifies recursive base condition n <= 1 to n <= 0', enabled: true },
  { id: 'mut_recursion_step_delta', code: 'RECURSION_STEP_DELTA', name: 'Recursion Step Subtraction Delta', category: 'Recursion & Base Case', description: 'Mutates recursive call fn(n - 1) to fn(n - 2)', enabled: true },
  { id: 'mut_recursion_return_operand', code: 'RECURSION_RETURN_OPERAND', name: 'Recursive Combination Operator Mutation', category: 'Recursion & Base Case', description: 'Mutates return fn(n-1) + fn(n-2) to return fn(n-1) - fn(n-2)', enabled: true },
  { id: 'mut_recursion_duplicate_subproblem_branch', code: 'RECURSION_DUPLICATE_SUBPROBLEM_BRANCH', name: 'Recursive Duplicate Subproblem Call', category: 'Recursion & Base Case', description: 'Mutates fn(n-1) + fn(n-2) to fn(n-1) + fn(n-1)', enabled: true },
  { id: 'mut_recursion_base_return_zero_factorial', code: 'RECURSION_BASE_RETURN_ZERO_FACTORIAL', name: 'Factorial/Combination Base Return Zero', category: 'Recursion & Base Case', description: 'Returns 0 instead of 1 in base case (causes entire product to be 0)', enabled: true },
  { id: 'mut_recursion_infinite_missing_decrement', code: 'RECURSION_INFINITE_MISSING_DECREMENT', name: 'Recursive Infinite Call (Missing Decrement)', category: 'Recursion & Base Case', description: 'Calls fn(n) instead of fn(n - 1) triggering RecursionError', enabled: true },
  { id: 'mut_memoization_cache_key_missing_param', code: 'MEMOIZATION_CACHE_KEY_MISSING_PARAM', name: 'Memoization Cache Key Collision', category: 'Recursion & Base Case', description: 'Omits second parameter from cache tuple key (i, j) -> (i,)', enabled: true },
  { id: 'mut_memoization_return_unmemoized', code: 'MEMOIZATION_RETURN_UNMEMOIZED', name: 'Memoization Return Calculation Without Storing', category: 'Recursion & Base Case', description: 'Computes recursive result without storing in memo dict (TLE)', enabled: true },
  { id: 'mut_tree_dfs_left_child_only', code: 'TREE_DFS_LEFT_CHILD_ONLY', name: 'Binary Tree Traversal Right Branch Omission', category: 'Recursion & Base Case', description: 'Traverses root.left twice instead of root.left and root.right', enabled: true },
  { id: 'mut_tree_dfs_null_node_return_value', code: 'TREE_DFS_NULL_NODE_RETURN_VALUE', name: 'Tree Base Case Null Node Return Value', category: 'Recursion & Base Case', description: 'Returns 1 instead of 0 when root is None in height calculation', enabled: true },
  { id: 'mut_bst_validation_bounds_swap', code: 'BST_VALIDATION_BOUNDS_SWAP', name: 'BST Invariant Min/Max Bounds Inversion', category: 'Recursion & Base Case', description: 'Validates node.val <= min_val instead of node.val >= min_val', enabled: true },
  { id: 'mut_divide_and_conquer_midpoint_include', code: 'DIVIDE_AND_CONQUER_MIDPOINT_INCLUDE', name: 'Divide & Conquer Midpoint Overlap', category: 'Recursion & Base Case', description: 'Passes (mid, right) instead of (mid + 1, right) to right subproblem', enabled: true },
  { id: 'mut_dp_fibonacci_transition_sign', code: 'DP_FIBONACCI_TRANSITION_SIGN', name: 'DP Transition Sign Subtraction Bug', category: 'Recursion & Base Case', description: 'Mutates dp[i] = dp[i-1] + dp[i-2] to dp[i-1] - dp[i-2]', enabled: true },
  { id: 'mut_dp_base_case_initialization_offset', code: 'DP_BASE_CASE_INITIALIZATION_OFFSET', name: 'DP Base Case Array Offset Bug', category: 'Recursion & Base Case', description: 'Initializes dp[1] = 1 but leaves dp[0] uninitialized or corrupted', enabled: true },
  { id: 'mut_tree_diameter_max_vs_sum', code: 'TREE_DIAMETER_MAX_VS_SUM', name: 'Tree Diameter Height Combination Bug', category: 'Recursion & Base Case', description: 'Updates diameter with max(left, right) instead of left + right', enabled: true },
  { id: 'mut_lowest_common_ancestor_return_condition', code: 'LOWEST_COMMON_ANCESTOR_RETURN_CONDITION', name: 'LCA Subtree Result Combination Bug', category: 'Recursion & Base Case', description: 'Returns left or right when both left and right are non-null', enabled: true },
  { id: 'mut_recursive_string_permutation_base', code: 'RECURSIVE_STRING_PERMUTATION_BASE', name: 'Permutations Base Case Output Omission', category: 'Recursion & Base Case', description: 'Appends path directly instead of copy path[:]', enabled: true },
  { id: 'mut_binary_tree_invert_child_overwrite', code: 'BINARY_TREE_INVERT_CHILD_OVERWRITE', name: 'Tree Child Swap Overwrite Without Temp', category: 'Recursion & Base Case', description: 'Overwrites root.left before swapping into root.right', enabled: true },

  // =========================================================================
  // 17. String, Text Encoding & Character Operations (16)
  // =========================================================================
  { id: 'mut_string_join_empty_delimiter', code: 'STRING_JOIN_EMPTY_DELIMITER', name: 'String Join Delimiter Omission', category: 'String Operation', description: 'Mutates " ".join(words) to "".join(words) (loses spaces between words)', enabled: true },
  { id: 'mut_string_join_comma_delimiter', code: 'STRING_JOIN_COMMA_DELIMITER', name: 'String Join Separator Mutation', category: 'String Operation', description: 'Mutates ",".join(items) to "-".join(items)', enabled: true },
  { id: 'mut_palindrome_symmetry_index_offset', code: 'PALINDROME_SYMMETRY_INDEX_OFFSET', name: 'Palindrome Symmetry Lookup Off-by-One', category: 'String Operation', description: 'Mutates s[len(s) - 1 - i] to s[len(s) - i] (IndexError / off-by-one)', enabled: true },
  { id: 'mut_case_insensitive_comparison_drop', code: 'CASE_INSENSITIVE_COMPARISON_DROP', name: 'Case-Insensitive Normalization Omission', category: 'String Operation', description: 'Compares raw mixed-case string without calling .lower()', enabled: true },
  { id: 'mut_whitespace_strip_omission', code: 'WHITESPACE_STRIP_OMISSION', name: 'Whitespace Stripping Omission', category: 'String Operation', description: 'Omits .strip() before parsing numeric strings', enabled: true },
  { id: 'mut_string_find_sentinel_inversion', code: 'STRING_FIND_SENTINEL_INVERSION', name: 'Substring Find Sentinel Check Inversion', category: 'String Operation', description: 'Checks s.find(sub) != -1 as s.find(sub) == -1', enabled: true },
  { id: 'mut_caesar_cipher_alphabet_wrap', code: 'CAESAR_CIPHER_ALPHABET_WRAP', name: 'Alphabet Rotation Modulo 26 Offset', category: 'String Operation', description: 'Mutates (ord(c) - ord("a") + k) % 26 to % 25', enabled: true },
  { id: 'mut_string_replace_count_limit', code: 'STRING_REPLACE_COUNT_LIMIT', name: 'String Replace First Only Limit', category: 'String Operation', description: 'Adds count=1 limit to str.replace() replacing only first occurrence', enabled: true },
  { id: 'mut_anagram_character_count_mismatch', code: 'ANAGRAM_CHARACTER_COUNT_MISMATCH', name: 'Anagram Length Pre-Check Omission', category: 'String Operation', description: 'Omits length validation before character counting', enabled: true },
  { id: 'mut_string_slice_step_negative', code: 'STRING_SLICE_STEP_NEGATIVE', name: 'String Reversal Step Drop', category: 'String Operation', description: 'Mutates s[::-1] to s[::1] (fails string reversal)', enabled: true },
  { id: 'mut_isnumeric_vs_isalnum_swap', code: 'ISNUMERIC_VS_ISALNUM_SWAP', name: 'IsNumeric vs IsAlnum Method Swap', category: 'String Operation', description: 'Swaps char.isalnum() with char.isdigit() (discards letters)', enabled: true },
  { id: 'mut_regex_greedy_vs_lazy_match', code: 'REGEX_GREEDY_VS_LAZY_MATCH', name: 'Regex Greedy vs Lazy Quantifier Mutation', category: 'String Operation', description: 'Mutates .*? lazy quantifier to .* greedy pattern', enabled: true },
  { id: 'mut_regex_escape_backslash_drop', code: 'REGEX_ESCAPE_BACKSLASH_DROP', name: 'Regex Special Character Escape Omission', category: 'String Operation', description: 'Omits escape on dot / bracket in regex pattern', enabled: true },
  { id: 'mut_string_split_whitespace_vs_char', code: 'STRING_SPLIT_WHITESPACE_VS_CHAR', name: 'String Split Consecutive Whitespace Bug', category: 'String Operation', description: 'Mutates s.split() to s.split(" ") (preserves empty strings on double space)', enabled: true },
  { id: 'mut_roman_numeral_subtraction_rule', code: 'ROMAN_NUMERAL_SUBTRACTION_RULE', name: 'Roman Numeral Subtractive Notation Bug', category: 'String Operation', description: 'Adds current value instead of subtracting when curr < next', enabled: true },
  { id: 'mut_vowel_membership_set_corruption', code: 'VOWEL_MEMBERSHIP_SET_CORRUPTION', name: 'Vowel Character Set Membership Omission', category: 'String Operation', description: 'Omits single vowel from reference check set ("aeiou" -> "aeio")', enabled: true },

  // =========================================================================
  // 18. Pointer, Memory, Reference & Data Structures (14)
  // =========================================================================
  { id: 'mut_pointer_increment_offset', code: 'POINTER_INCREMENT_OFFSET', name: 'Pointer Arithmetic Offset Mutation', category: 'Pointer & Memory', description: 'Mutates pointer increment ptr++ to ptr += 2', enabled: true },
  { id: 'mut_null_check_inversion', code: 'NULL_CHECK_INVERSION', name: 'Pointer Null Check Inversion', category: 'Pointer & Memory', description: 'Inverts pointer non-null check ptr != NULL to ptr == NULL', enabled: true },
  { id: 'mut_linked_list_next_pointer_lost', code: 'LINKED_LIST_NEXT_POINTER_LOST', name: 'Linked List Next Pointer Overwrite Order', category: 'Pointer & Memory', description: 'Assigns curr.next = prev BEFORE caching next_node = curr.next (loses tail)', enabled: true },
  { id: 'mut_linked_list_dummy_head_return', code: 'LINKED_LIST_DUMMY_HEAD_RETURN', name: 'Linked List Dummy Head Return Bug', category: 'Pointer & Memory', description: 'Returns dummy head directly instead of dummy.next', enabled: true },
  { id: 'mut_linked_list_cycle_fast_slow_step', code: 'LINKED_LIST_CYCLE_FAST_SLOW_STEP', name: 'Fast & Slow Pointer Step Inversion', category: 'Pointer & Memory', description: 'Advances fast pointer by 1 step instead of 2 (fast = fast.next)', enabled: true },
  { id: 'mut_linked_list_delete_node_bypass', code: 'LINKED_LIST_DELETE_NODE_BYPASS', name: 'Linked List Delete Node Pointer Skip', category: 'Pointer & Memory', description: 'Mutates prev.next = curr.next to prev.next = curr', enabled: true },
  { id: 'mut_doubly_linked_list_prev_pointer_sync', code: 'DOUBLY_LINKED_LIST_PREV_POINTER_SYNC', name: 'Doubly Linked List Prev Pointer Update Omission', category: 'Pointer & Memory', description: 'Updates next pointer but forgets node.next.prev = node', enabled: true },
  { id: 'mut_trie_insert_node_traversal_freeze', code: 'TRIE_INSERT_NODE_TRAVERSAL_FREEZE', name: 'Trie Node Insertion Pointer Advance Omission', category: 'Pointer & Memory', description: 'Creates child trie node but fails to advance node = node.children[c]', enabled: true },
  { id: 'mut_trie_end_of_word_flag_omission', code: 'TRIE_END_OF_WORD_FLAG_OMISSION', name: 'Trie is_end_of_word Flag Omission', category: 'Pointer & Memory', description: 'Traverses word characters but omits node.is_end = True', enabled: true },
  { id: 'mut_union_find_path_compression_omission', code: 'UNION_FIND_PATH_COMPRESSION_OMISSION', name: 'Union-Find Root Compression Omission', category: 'Pointer & Memory', description: 'Returns root without updating parent[x] = root', enabled: true },
  { id: 'mut_union_find_rank_update_swap', code: 'UNION_FIND_RANK_UPDATE_SWAP', name: 'Union-Find Parent Reassignment Error', category: 'Pointer & Memory', description: 'Points root1 to itself instead of root2 during union', enabled: true },
  { id: 'mut_circular_buffer_head_tail_collision', code: 'CIRCULAR_BUFFER_HEAD_TAIL_COLLISION', name: 'Circular Buffer Full/Empty Condition Inversion', category: 'Pointer & Memory', description: 'Identifies buffer as full when head == tail instead of (tail + 1) % N == head', enabled: true },
  { id: 'mut_memory_deallocation_double_free', code: 'MEMORY_DEALLOCATION_DOUBLE_FREE', name: 'Resource Deallocation Double Cleanup', category: 'Pointer & Memory', description: 'Closes or deallocates stream handle twice without NULL reassignment', enabled: true },
  { id: 'mut_deep_object_clone_reference_leak', code: 'DEEP_OBJECT_CLONE_REFERENCE_LEAK', name: 'State Mutation via Shared Object Reference', category: 'Pointer & Memory', description: 'Shares underlying mutable list between cloned object instances', enabled: true },
];

export const INITIAL_105_MUTATIONS = INITIAL_246_MUTATIONS;
export const INITIAL_27_MUTATIONS = INITIAL_246_MUTATIONS;
export const INITIAL_MUTATION_TYPES = INITIAL_246_MUTATIONS;

export class MutationRegistry {
  private static instance: MutationRegistry;
  private registry: Map<string, MutationRegistryEntry> = new Map();

  private constructor() {
    for (const item of INITIAL_246_MUTATIONS) {
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
