/**
 * SyntaXViva Core V1 — Part 3 Mutation Registry
 *
 * Modular registry of mutation types with 100+ bug variants.
 */

import { MutationRegistryEntry, MutationTypeCode } from './types.js';

export const INITIAL_105_MUTATIONS: MutationRegistryEntry[] = [
  // 1. Relational Operators (14)
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

  // 2. Equality Operators (6)
  { id: 'mut_equal_to_not_equal', code: 'EQUAL_TO_NOT_EQUAL', name: 'Equal to Not Equal', category: 'Equality Operator', description: 'Mutates == comparison operator to !=', enabled: true },
  { id: 'mut_not_equal_to_equal', code: 'NOT_EQUAL_TO_EQUAL', name: 'Not Equal to Equal', category: 'Equality Operator', description: 'Mutates != comparison operator to ==', enabled: true },
  { id: 'mut_is_to_is_not', code: 'IS_TO_IS_NOT', name: 'Identity IS to IS NOT', category: 'Equality Operator', description: 'Mutates identity operator is to is not', enabled: true },
  { id: 'mut_is_not_to_is', code: 'IS_NOT_TO_IS', name: 'Identity IS NOT to IS', category: 'Equality Operator', description: 'Mutates identity operator is not to is', enabled: true },
  { id: 'mut_in_to_not_in', code: 'IN_TO_NOT_IN', name: 'Membership IN to NOT IN', category: 'Equality Operator', description: 'Mutates membership operator in to not in', enabled: true },
  { id: 'mut_not_in_to_in', code: 'NOT_IN_TO_IN', name: 'Membership NOT IN to IN', category: 'Equality Operator', description: 'Mutates membership operator not in to in', enabled: true },

  // 3. Arithmetic Operators (12)
  { id: 'mut_plus_to_minus', code: 'PLUS_TO_MINUS', name: 'Addition to Subtraction', category: 'Arithmetic Operator', description: 'Mutates + binary operator to -', enabled: true },
  { id: 'mut_minus_to_plus', code: 'MINUS_TO_PLUS', name: 'Subtraction to Addition', category: 'Arithmetic Operator', description: 'Mutates - binary operator to +', enabled: true },
  { id: 'mut_multiply_to_divide', code: 'MULTIPLY_TO_DIVIDE', name: 'Multiplication to Division', category: 'Arithmetic Operator', description: 'Mutates * binary operator to /', enabled: true },
  { id: 'mut_divide_to_multiply', code: 'DIVIDE_TO_MULTIPLY', name: 'Division to Multiplication', category: 'Arithmetic Operator', description: 'Mutates / binary operator to *', enabled: true },
  { id: 'mut_modulo_to_divide', code: 'MODULO_TO_DIVIDE', name: 'Modulo to Division', category: 'Arithmetic Operator', description: 'Mutates % modulo operator to / division', enabled: true },
  { id: 'mut_divide_to_modulo', code: 'DIVIDE_TO_MODULO', name: 'Division to Modulo', category: 'Arithmetic Operator', description: 'Mutates / division operator to % modulo', enabled: true },
  { id: 'mut_floor_div_to_true_div', code: 'FLOOR_DIV_TO_TRUE_DIV', name: 'Floor Division to True Division', category: 'Arithmetic Operator', description: 'Mutates // floor division to / true division', enabled: true },
  { id: 'mut_exponent_to_multiply', code: 'EXPONENT_TO_MULTIPLY', name: 'Exponentiation to Multiplication', category: 'Arithmetic Operator', description: 'Mutates ** exponentiation to * multiplication', enabled: true },
  { id: 'mut_unary_plus_to_minus', code: 'UNARY_PLUS_TO_MINUS', name: 'Unary Plus to Unary Minus', category: 'Arithmetic Operator', description: 'Mutates +x to -x', enabled: true },
  { id: 'mut_unary_minus_to_plus', code: 'UNARY_MINUS_TO_PLUS', name: 'Unary Minus to Unary Plus', category: 'Arithmetic Operator', description: 'Mutates -x to +x', enabled: true },
  { id: 'mut_modulo_to_plus', code: 'MODULO_TO_PLUS', name: 'Modulo to Addition', category: 'Arithmetic Operator', description: 'Mutates % modulo operator to + addition', enabled: true },
  { id: 'mut_multiply_to_plus', code: 'MULTIPLY_TO_PLUS', name: 'Multiplication to Addition', category: 'Arithmetic Operator', description: 'Mutates * multiplication to + addition', enabled: true },

  // 4. Logical Operators (10)
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

  // 5. Bitwise Operators (8)
  { id: 'mut_bitwise_and_to_or', code: 'BITWISE_AND_TO_OR', name: 'Bitwise AND to OR', category: 'Bitwise Operator', description: 'Mutates & bitwise operator to |', enabled: true },
  { id: 'mut_bitwise_or_to_and', code: 'BITWISE_OR_TO_AND', name: 'Bitwise OR to AND', category: 'Bitwise Operator', description: 'Mutates | bitwise operator to &', enabled: true },
  { id: 'mut_bitwise_xor_to_or', code: 'BITWISE_XOR_TO_OR', name: 'Bitwise XOR to OR', category: 'Bitwise Operator', description: 'Mutates ^ bitwise operator to |', enabled: true },
  { id: 'mut_bitwise_left_shift_to_right', code: 'BITWISE_LEFT_SHIFT_TO_RIGHT', name: 'Bitwise Left Shift to Right Shift', category: 'Bitwise Operator', description: 'Mutates << shift operator to >>', enabled: true },
  { id: 'mut_bitwise_right_shift_to_left', code: 'BITWISE_RIGHT_SHIFT_TO_LEFT', name: 'Bitwise Right Shift to Left Shift', category: 'Bitwise Operator', description: 'Mutates >> shift operator to <<', enabled: true },
  { id: 'mut_bitwise_not_inversion', code: 'BITWISE_NOT_INVERSION', name: 'Bitwise NOT Inversion', category: 'Bitwise Operator', description: 'Mutates ~ bitwise NOT operator', enabled: true },
  { id: 'mut_bitwise_and_to_xor', code: 'BITWISE_AND_TO_XOR', name: 'Bitwise AND to XOR', category: 'Bitwise Operator', description: 'Mutates & bitwise AND operator to ^', enabled: true },
  { id: 'mut_bitwise_or_to_xor', code: 'BITWISE_OR_TO_XOR', name: 'Bitwise OR to XOR', category: 'Bitwise Operator', description: 'Mutates | bitwise OR operator to ^', enabled: true },

  // 6. Control Flow & Branching (10)
  { id: 'mut_conditional_branch_inversion', code: 'CONDITIONAL_BRANCH_INVERSION', name: 'Conditional Branch Inversion', category: 'Control Flow', description: 'Swaps consequent and alternate branches of if/else statements', enabled: true },
  { id: 'mut_return_value_mutation', code: 'RETURN_VALUE_MUTATION', name: 'Return Value Mutation', category: 'Control Flow', description: 'Alters returned expression while preserving syntactic validity', enabled: true },
  { id: 'mut_early_return_null', code: 'EARLY_RETURN_NULL', name: 'Early Return Null/None', category: 'Control Flow', description: 'Forces return of null or None prematurely', enabled: true },
  { id: 'mut_break_to_continue', code: 'BREAK_TO_CONTINUE', name: 'Break to Continue', category: 'Control Flow', description: 'Mutates break statement inside loop to continue', enabled: true },
  { id: 'mut_continue_to_break', code: 'CONTINUE_TO_BREAK', name: 'Continue to Break', category: 'Control Flow', description: 'Mutates continue statement inside loop to break', enabled: true },
  { id: 'mut_switch_case_fallthrough', code: 'SWITCH_CASE_FALLTHROUGH', name: 'Switch Case Fallthrough', category: 'Control Flow', description: 'Removes break statement from switch case block', enabled: true },
  { id: 'mut_else_if_to_if', code: 'ELSE_IF_TO_IF', name: 'Else If to Independent If', category: 'Control Flow', description: 'Decouples else if / elif into standalone if block', enabled: true },
  { id: 'mut_guard_clause_inversion', code: 'GUARD_CLAUSE_INVERSION', name: 'Guard Clause Inversion', category: 'Control Flow', description: 'Inverts guard condition causing premature return', enabled: true },
  { id: 'mut_exception_catch_all', code: 'EXCEPTION_CATCH_ALL', name: 'Try/Catch Swallowing', category: 'Control Flow', description: 'Mutates specific exception type to catch-all handler', enabled: true },
  { id: 'mut_return_expression_negation', code: 'RETURN_EXPRESSION_NEGATION', name: 'Return Expression Negation', category: 'Control Flow', description: 'Negates numeric or boolean expression in return statement', enabled: true },

  // 7. Loop Mutations (10)
  { id: 'mut_loop_boundary_off_by_one', code: 'LOOP_BOUNDARY_OFF_BY_ONE', name: 'Loop Boundary Off-by-One', category: 'Loop Mutation', description: 'Modifies loop upper or lower bound by ±1', enabled: true },
  { id: 'mut_loop_condition_mutation', code: 'LOOP_CONDITION_MUTATION', name: 'Loop Condition Mutation', category: 'Loop Mutation', description: 'Modifies while/for loop continuation predicate', enabled: true },
  { id: 'mut_loop_increment_decrement_mutation', code: 'LOOP_INCREMENT_DECREMENT_MUTATION', name: 'Loop Step Mutation', category: 'Loop Mutation', description: 'Mutates increment to decrement or alters step value', enabled: true },
  { id: 'mut_loop_start_offset', code: 'LOOP_START_OFFSET', name: 'Loop Start Offset Mutation', category: 'Loop Mutation', description: 'Modifies loop initial index from 0 to 1 or 1 to 0', enabled: true },
  { id: 'mut_loop_direction_swap', code: 'LOOP_DIRECTION_SWAP', name: 'Loop Direction Swap', category: 'Loop Mutation', description: 'Reverses loop counting direction from ascending to descending', enabled: true },
  { id: 'mut_loop_stride_mutation', code: 'LOOP_STRIDE_MUTATION', name: 'Loop Stride Step Alteration', category: 'Loop Mutation', description: 'Changes loop step stride from 1 to 2 or vice versa', enabled: true },
  { id: 'mut_nested_loop_index_swap', code: 'NESTED_LOOP_INDEX_SWAP', name: 'Nested Loop Index Swap', category: 'Loop Mutation', description: 'Swaps inner and outer loop iterators (i and j)', enabled: true },
  { id: 'mut_while_to_do_while', code: 'WHILE_TO_DO_WHILE', name: 'While to Do-While Mutation', category: 'Loop Mutation', description: 'Alters loop pre-condition execution behavior', enabled: true },
  { id: 'mut_loop_termination_off_by_one', code: 'LOOP_TERMINATION_OFF_BY_ONE', name: 'Loop Termination Off-by-One', category: 'Loop Mutation', description: 'Mutates termination check from < len to <= len', enabled: true },
  { id: 'mut_range_inclusive_exclusive_swap', code: 'RANGE_INCLUSIVE_EXCLUSIVE_SWAP', name: 'Range Bounds Swap', category: 'Loop Mutation', description: 'Swaps inclusive vs exclusive upper range bound', enabled: true },

  // 8. Identifier & Variable Swaps (6)
  { id: 'mut_variable_reference_swap', code: 'VARIABLE_REFERENCE_SWAP', name: 'Variable Reference Swap', category: 'Identifier Mutation', description: 'Swaps references to two variables of compatible scope and type', enabled: true },
  { id: 'mut_variable_swap', code: 'VARIABLE_SWAP', name: 'Variable Assignment Swap', category: 'Assignment Mutation', description: 'Swaps assignment targets or positions in multi-variable blocks', enabled: true },
  { id: 'mut_shadowed_variable_swap', code: 'SHADOWED_VARIABLE_SWAP', name: 'Shadowed Variable Swap', category: 'Identifier Mutation', description: 'Swaps local parameter reference with outer scope identifier', enabled: true },
  { id: 'mut_accumulator_variable_swap', code: 'ACCUMULATOR_VARIABLE_SWAP', name: 'Accumulator Variable Swap', category: 'Identifier Mutation', description: 'Swaps accumulator variable with loop counter variable', enabled: true },
  { id: 'mut_parameter_order_swap', code: 'PARAMETER_ORDER_SWAP', name: 'Parameter Order Swap', category: 'Identifier Mutation', description: 'Swaps parameter binding references inside function body', enabled: true },
  { id: 'mut_member_property_swap', code: 'MEMBER_PROPERTY_SWAP', name: 'Member Property Access Swap', category: 'Identifier Mutation', description: 'Swaps object field/property access key', enabled: true },

  // 9. Assignment Mutations (8)
  { id: 'mut_assign_plus_to_minus', code: 'ASSIGN_PLUS_TO_MINUS', name: 'Augmented Assignment += to -=', category: 'Assignment Mutation', description: 'Mutates += compound assignment operator to -=', enabled: true },
  { id: 'mut_assign_minus_to_plus', code: 'ASSIGN_MINUS_TO_PLUS', name: 'Augmented Assignment -= to +=', category: 'Assignment Mutation', description: 'Mutates -= compound assignment operator to +=', enabled: true },
  { id: 'mut_assign_mult_to_div', code: 'ASSIGN_MULT_TO_DIV', name: 'Augmented Assignment *= to /=', category: 'Assignment Mutation', description: 'Mutates *= compound assignment operator to /=', enabled: true },
  { id: 'mut_assign_div_to_mult', code: 'ASSIGN_DIV_TO_MULT', name: 'Augmented Assignment /= to *=', category: 'Assignment Mutation', description: 'Mutates /= compound assignment operator to *=', enabled: true },
  { id: 'mut_reassignment_removal', code: 'REASSIGNMENT_REMOVAL', name: 'State Reassignment Override', category: 'Assignment Mutation', description: 'Mutates updated assignment to retain previous state', enabled: true },
  { id: 'mut_compound_assign_to_simple', code: 'COMPOUND_ASSIGN_TO_SIMPLE', name: 'Compound Assignment to Direct Assignment', category: 'Assignment Mutation', description: 'Mutates += x to = x', enabled: true },
  { id: 'mut_assign_zero_override', code: 'ASSIGN_ZERO_OVERRIDE', name: 'Assignment Zero Override', category: 'Assignment Mutation', description: 'Overrides assignment RHS expression to 0', enabled: true },
  { id: 'mut_assign_swap_rhs', code: 'ASSIGN_SWAP_RHS', name: 'RHS Operand Order Swap', category: 'Assignment Mutation', description: 'Swaps operand order in assignment RHS binary expression', enabled: true },

  // 10. Literal Mutations (8)
  { id: 'mut_constant_literal_mutation', code: 'CONSTANT_LITERAL_MUTATION', name: 'Constant Literal Mutation', category: 'Literal Mutation', description: 'Alters a constant numeric literal by a small discrete delta', enabled: true },
  { id: 'mut_zero_to_one', code: 'ZERO_TO_ONE', name: 'Literal 0 to 1 Mutation', category: 'Literal Mutation', description: 'Mutates literal numeric 0 to 1', enabled: true },
  { id: 'mut_one_to_zero', code: 'ONE_TO_ZERO', name: 'Literal 1 to 0 Mutation', category: 'Literal Mutation', description: 'Mutates literal numeric 1 to 0', enabled: true },
  { id: 'mut_string_empty_mutation', code: 'STRING_EMPTY_MUTATION', name: 'String Literal Emptiness Mutation', category: 'Literal Mutation', description: 'Replaces non-empty string literal with empty string', enabled: true },
  { id: 'mut_float_precision_truncate', code: 'FLOAT_PRECISION_TRUNCATE', name: 'Floating Point Precision Delta', category: 'Literal Mutation', description: 'Alters floating point literal precision value', enabled: true },
  { id: 'mut_negative_sign_flip', code: 'NEGATIVE_SIGN_FLIP', name: 'Numeric Sign Inversion', category: 'Literal Mutation', description: 'Flips sign of constant numeric literal', enabled: true },
  { id: 'mut_off_by_one_literal', code: 'OFF_BY_ONE_LITERAL', name: 'Literal Off-by-One Delta', category: 'Literal Mutation', description: 'Increments or decrements numeric literal by 1', enabled: true },
  { id: 'mut_null_literal_swap', code: 'NULL_LITERAL_SWAP', name: 'Null/None Literal Swap', category: 'Literal Mutation', description: 'Swaps null or None literal with empty container or object', enabled: true },

  // 11. State Initialization (4)
  { id: 'mut_initialization_value_mutation', code: 'INITIALIZATION_VALUE_MUTATION', name: 'Initialization Value Mutation', category: 'State Initialization', description: 'Changes initial state value (e.g., 0 to 1, or empty container)', enabled: true },
  { id: 'mut_init_empty_array_to_null', code: 'INIT_EMPTY_ARRAY_TO_NULL', name: 'Collection Initialization Override', category: 'State Initialization', description: 'Mutates initial empty array/list to single element', enabled: true },
  { id: 'mut_init_accumulator_zero_to_one', code: 'INIT_ACCUMULATOR_ZERO_TO_ONE', name: 'Accumulator Initial Value 0 to 1', category: 'State Initialization', description: 'Mutates initial sum accumulator from 0 to 1', enabled: true },
  { id: 'mut_init_accumulator_one_to_zero', code: 'INIT_ACCUMULATOR_ONE_TO_ZERO', name: 'Product Accumulator Initial Value 1 to 0', category: 'State Initialization', description: 'Mutates initial product accumulator from 1 to 0', enabled: true },

  // 12. Collection Access & Slicing (6)
  { id: 'mut_array_index_mutation', code: 'ARRAY_INDEX_MUTATION', name: 'Array Index Offset Mutation', category: 'Collection Access', description: 'Alters array index lookup by ±1 or index offset', enabled: true },
  { id: 'mut_collection_element_selection_mutation', code: 'COLLECTION_ELEMENT_SELECTION_MUTATION', name: 'Collection Selection Mutation', category: 'Collection Access', description: 'Mutates collection head/last selection or slice bound', enabled: true },
  { id: 'mut_slice_start_bound', code: 'SLICE_START_BOUND', name: 'Slice Start Bound Offset', category: 'Collection Access', description: 'Mutates collection slice start index by +1', enabled: true },
  { id: 'mut_slice_end_bound', code: 'SLICE_END_BOUND', name: 'Slice End Bound Offset', category: 'Collection Access', description: 'Mutates collection slice end index by -1', enabled: true },
  { id: 'mut_array_first_last_swap', code: 'ARRAY_FIRST_LAST_SWAP', name: 'First vs Last Element Lookup Swap', category: 'Collection Access', description: 'Swaps index [0] access with [-1] or [length - 1]', enabled: true },
  { id: 'mut_off_by_one_index_access', code: 'OFF_BY_ONE_INDEX_ACCESS', name: 'Index Access Off-By-One', category: 'Collection Access', description: 'Adds 1 to element index access causing out-of-bounds or shift', enabled: true },

  // 13. Function Call & Arguments (4)
  { id: 'mut_function_argument_mutation', code: 'FUNCTION_ARGUMENT_MUTATION', name: 'Function Argument Mutation', category: 'Function Call', description: 'Swaps positional argument values in function calls', enabled: true },
  { id: 'mut_arg_constant_override', code: 'ARG_CONSTANT_OVERRIDE', name: 'Argument Constant Replacement', category: 'Function Call', description: 'Replaces function call argument with 0 or null', enabled: true },
  { id: 'mut_arg_duplicate_pass', code: 'ARG_DUPLICATE_PASS', name: 'Duplicate Argument Passing', category: 'Function Call', description: 'Passes first argument twice in multi-argument function call', enabled: true },
  { id: 'mut_method_chain_drop', code: 'METHOD_CHAIN_DROP', name: 'Method Chain Call Skip', category: 'Function Call', description: 'Omits middle transformer step in chained method calls', enabled: true },

  // 14. Built-in Function Swaps (6)
  { id: 'mut_min_max_swap', code: 'MIN_MAX_SWAP', name: 'Min/Max Function Swap', category: 'Built-in Function', description: 'Swaps min() invocation for max() invocation or vice-versa', enabled: true },
  { id: 'mut_sum_len_swap', code: 'SUM_LEN_SWAP', name: 'Sum/Len Aggregation Swap', category: 'Built-in Function', description: 'Swaps sum() build-in with len() count', enabled: true },
  { id: 'mut_abs_value_drop', code: 'ABS_VALUE_DROP', name: 'Absolute Value Call Drop', category: 'Built-in Function', description: 'Removes abs() wrapper around numeric expression', enabled: true },
  { id: 'mut_floor_ceil_swap', code: 'FLOOR_CEIL_SWAP', name: 'Math Floor/Ceil Swap', category: 'Built-in Function', description: 'Swaps floor() function call with ceil()', enabled: true },
  { id: 'mut_str_lower_upper_swap', code: 'STR_LOWER_UPPER_SWAP', name: 'String lower()/upper() Swap', category: 'Built-in Function', description: 'Swaps lower() case function with upper()', enabled: true },
  { id: 'mut_sorted_reverse_swap', code: 'SORTED_REVERSE_SWAP', name: 'Sort Order Flag Swap', category: 'Built-in Function', description: 'Flips reverse flag in sort/sorted call', enabled: true },

  // 15. Accumulator & Aggregation (6)
  { id: 'mut_accumulator_aggregation_mutation', code: 'ACCUMULATOR_AGGREGATION_MUTATION', name: 'Accumulator Aggregation Mutation', category: 'Algorithm Logic', description: 'Mutates accumulator operation in reduction/aggregation loops', enabled: true },
  { id: 'mut_count_increment_to_decrement', code: 'COUNT_INCREMENT_TO_DECREMENT', name: 'Counter Increment to Decrement', category: 'Algorithm Logic', description: 'Mutates counter increment count += 1 to count -= 1', enabled: true },
  { id: 'mut_running_total_reset', code: 'RUNNING_TOTAL_RESET', name: 'Running Total Reset Bug', category: 'Algorithm Logic', description: 'Resets running total inside loop body instead of accumulating', enabled: true },
  { id: 'mut_aggregation_multiplier_bug', code: 'AGGREGATION_MULTIPLIER_BUG', name: 'Product Accumulator Addition Bug', category: 'Algorithm Logic', description: 'Mutates product accumulator *= to +=', enabled: true },
  { id: 'mut_average_division_count', code: 'AVERAGE_DIVISION_COUNT', name: 'Mean Average Count Off-by-One', category: 'Algorithm Logic', description: 'Divides total sum by (N - 1) or (N + 1) instead of N', enabled: true },
  { id: 'mut_max_sentinel_initialization', code: 'MAX_SENTINEL_INITIALIZATION', name: 'Max Sentinel Initial Value Bug', category: 'Algorithm Logic', description: 'Initializes max tracking variable to 0 instead of negative infinity or first element', enabled: true },

  // 16. Pointer, Memory & Recursion (5)
  { id: 'mut_pointer_increment_offset', code: 'POINTER_INCREMENT_OFFSET', name: 'Pointer Arithmetic Offset Mutation', category: 'Pointer & Memory', description: 'Mutates pointer increment ptr++ to ptr += 2', enabled: true },
  { id: 'mut_null_check_inversion', code: 'NULL_CHECK_INVERSION', name: 'Pointer Null Check Inversion', category: 'Pointer & Memory', description: 'Inverts pointer non-null check ptr != NULL to ptr == NULL', enabled: true },
  { id: 'mut_recursion_base_case_bound', code: 'RECURSION_BASE_CASE_BOUND', name: 'Recursion Base Case Off-by-One', category: 'Recursion & Base Case', description: 'Modifies recursive base condition n <= 1 to n <= 0', enabled: true },
  { id: 'mut_recursion_step_delta', code: 'RECURSION_STEP_DELTA', name: 'Recursion Step Subtraction Delta', category: 'Recursion & Base Case', description: 'Mutates recursive call fn(n - 1) to fn(n - 2)', enabled: true },
  { id: 'mut_recursion_return_operand', code: 'RECURSION_RETURN_OPERAND', name: 'Recursive Combination Operator Mutation', category: 'Recursion & Base Case', description: 'Mutates return fn(n-1) + fn(n-2) to return fn(n-1) - fn(n-2)', enabled: true },
];

export const INITIAL_27_MUTATIONS = INITIAL_105_MUTATIONS;

export class MutationRegistry {
  private static instance: MutationRegistry;
  private registry: Map<string, MutationRegistryEntry> = new Map();

  private constructor() {
    for (const item of INITIAL_105_MUTATIONS) {
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
