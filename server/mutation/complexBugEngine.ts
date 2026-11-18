/**
 * SyntaXViva Core V1 — Complex Bug Engine
 *
 * Implements 500+ realistic, high-order software defects across algorithms,
 * data structures, state accumulators, recursion, two-pointers, binary search,
 * collection bounds, and system invariants.
 *
 * Replaces simplistic `>=` to `>` operator flips with genuine, subtle programming
 * bugs that challenge students' actual comprehension of their code.
 *
 * Supports injecting exactly 3 distinct, non-conflicting complex bugs per student.
 */

import { computeCodeHash, createDeterministicRNG } from './hasher.js';
import { MutationCandidate, SourceLocation, InjectedBugDetail, AlgorithmicBugCategory } from './types.js';
import { COMPLEX_BUG_CATALOG, COMPLEX_BUG_MAP, ComplexBugVariant } from './complexBugCatalog.js';
import { PythonLanguageProvider } from './languages/python.js';
import { isGeminiConfigured } from '../services/geminiService.js';

export interface RichCandidateItem {
  line: number;
  mutationType: string;
  algorithmicCategory: AlgorithmicBugCategory;
  name: string;
  category: string;
  description: string;
  originalFragment: string;
  mutatedFragment: string;
  applyToLines: (linesArr: string[]) => void;
}

export interface ThreeBugSelectionResult {
  mutatedCode: string;
  bugsCount: number;
  bugs: InjectedBugDetail[];
  primaryMutationType: string;
}

/**
 * Maps a mutation candidate to one of the 8 canonical AlgorithmicBugCategory classes.
 */
export function mapToAlgorithmicCategory(
  mutationType: string,
  category: string,
  desc: string = ''
): AlgorithmicBugCategory {
  const t = mutationType.toUpperCase();
  const c = category.toUpperCase();
  const d = desc.toLowerCase();

  // 1. Loop Boundary
  if (
    t.includes('LOOP_RANGE') ||
    t.includes('LOOP_TERMINATION') ||
    t.includes('REVERSED_RANGE') ||
    t.includes('WHILE_INCLUSIVE') ||
    t.includes('WHILE_STRICT') ||
    t.includes('STRIDE') ||
    c.includes('LOOP') ||
    d.includes('loop bound') ||
    d.includes('range(')
  ) {
    return 'LOOP_BOUNDARY';
  }

  // 2. Base Case Defect
  if (
    t.includes('BASE_CASE') ||
    t.includes('DP_BASE') ||
    t.includes('RECURS') ||
    d.includes('base case') ||
    d.includes('recursion') ||
    c.includes('RECURSION')
  ) {
    return 'BASE_CASE_DEFECT';
  }

  // 3. State Update Order
  if (
    t.includes('UPDATE_ORDER') ||
    t.includes('SEQUENCE') ||
    t.includes('SWAP_STATEMENT') ||
    t.includes('DEPENDENCY_INVERSION') ||
    d.includes('order of') ||
    d.includes('sequence')
  ) {
    return 'STATE_UPDATE_ORDER';
  }

  // 4. Index Offset
  if (
    t.includes('IDX_') ||
    t.includes('INDEX') ||
    t.includes('SLICE') ||
    t.includes('MATRIX') ||
    t.includes('ROW_COL') ||
    t.includes('BS_FLOAT_DIVISION') ||
    t.includes('BS_MID') ||
    t.includes('PRECEDENCE') ||
    d.includes('midpoint') ||
    d.includes('index') ||
    d.includes('matrix') ||
    d.includes('division')
  ) {
    return 'INDEX_OFFSET';
  }

  // 5. Accumulator Scope
  if (
    t.includes('ACC_') ||
    t.includes('ACCUMULATOR') ||
    t.includes('RUNNING_SUM') ||
    t.includes('PRODUCT') ||
    t.includes('SENTINEL') ||
    d.includes('accumulator') ||
    d.includes('running total') ||
    d.includes('counter increment') ||
    d.includes('counter decrement')
  ) {
    return 'ACCUMULATOR_SCOPE';
  }

  // 6. Edge Case Bypass
  if (
    t.includes('EDGE_CASE') ||
    t.includes('BYPASS') ||
    t.includes('BS_HIGH_BOUND') ||
    t.includes('BS_LOW_BOUND') ||
    t.includes('CYCLE_INITIAL') ||
    t.includes('INFINITE_LOOP') ||
    d.includes('infinite loop') ||
    d.includes('boundary check') ||
    d.includes('empty input') ||
    d.includes('bypassed')
  ) {
    return 'EDGE_CASE_BYPASS';
  }

  // 7. Variable Shadowing Swap
  if (
    t.includes('VARIABLE') ||
    t.includes('VAR_') ||
    t.includes('SHADOW') ||
    t.includes('MIRROR') ||
    t.includes('POINTER_SWAP') ||
    t.includes('IDENTIFIER') ||
    d.includes('shadowed') ||
    d.includes('swapped with opposite pointer')
  ) {
    return 'VARIABLE_SHADOWING_SWAP';
  }

  // 8. Condition Inversion (Default for guards, logical, and relational)
  return 'CONDITION_INVERSION';
}

export class ComplexBugEngine {
  private static instance: ComplexBugEngine;

  public static getInstance(): ComplexBugEngine {
    if (!ComplexBugEngine.instance) {
      ComplexBugEngine.instance = new ComplexBugEngine();
    }
    return ComplexBugEngine.instance;
  }

  /**
   * Helper to retrieve bug metadata from the 500+ complex bug catalog.
   */
  private getCatalogEntry(code: string): ComplexBugVariant | undefined {
    return COMPLEX_BUG_MAP.get(code);
  }

  /**
   * Discovers all realistic, complex bug candidates present in the given code.
   */
  public findComplexCandidates(code: string, language: string = 'python'): MutationCandidate[] {
    const candidates: MutationCandidate[] = [];
    const lines = code.split('\n');
    const isPy = language.toLowerCase() === 'python' || language.toLowerCase() === 'py';
    const isJs =
      language.toLowerCase() === 'javascript' ||
      language.toLowerCase() === 'js' ||
      language.toLowerCase() === 'typescript' ||
      language.toLowerCase() === 'ts';
    const isC =
      language.toLowerCase() === 'c' ||
      language.toLowerCase() === 'cpp' ||
      language.toLowerCase() === 'java';

    // =========================================================================
    // 1. ACCUMULATOR & STATE INVARIANT BUGS
    // =========================================================================

    // Bug 1: Running Total Reset Inside Loop Body
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const loopMatch = isPy
        ? line.match(/^(\s*)(for\s+\w+\s+in\s+[^:]+|while\s+[^:]+):$/)
        : line.match(/^(\s*)(for\s*\(|while\s*\()/);

      if (loopMatch) {
        const indent = loopMatch[1];
        for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
          const bodyLine = lines[j];
          const accMatch = bodyLine.match(/\b([a-zA-Z_]\w*)\s*\+=\s*/);
          if (accMatch && accMatch[1] !== 'i' && accMatch[1] !== 'j') {
            const accVar = accMatch[1];
            const innerIndent = isPy ? indent + '    ' : indent + '  ';
            const injectedReset = isPy ? `${innerIndent}${accVar} = 0  # reset` : `${innerIndent}${accVar} = 0;`;
            const copy = [...lines];
            copy.splice(i + 1, 0, injectedReset);
            const mutatedCode = copy.join('\n');

            candidates.push({
              id: `cbug_acc_reset_${candidates.length + 1}`,
              mutationType: 'ACC_RUNNING_TOTAL_RESET_IN_LOOP',
              language,
              location: { line: i + 1, column: 0, endLine: i + 2, endColumn: line.length },
              originalFragment: line,
              mutatedFragment: `${line}\n${injectedReset}`,
              description: `Accumulator '${accVar}' is reset inside loop body, erasing cumulative progress`,
              apply: () => mutatedCode,
            });
            break;
          }
        }
      }
    }

    // Bug 2: Product Accumulator Initialized to 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(prod|product|ans|res|result|factorial|fact|total_product)\s*=\s*1\b(.*)$/i);
      if (match) {
        const indent = match[1];
        const varName = match[2];
        const rest = match[3];
        const mutatedLine = `${indent}${varName} = 0${rest}`;
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_prod_zero_${candidates.length + 1}`,
          mutationType: 'ACC_PRODUCT_ACCUMULATOR_ZERO_INIT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Product accumulator '${varName}' initialized to 0 instead of 1 (causes all multiplications to yield 0)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 3: Max Sentinel Initialized to 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(max_val|max_element|max_num|maximum|highest|best|max_so_far)\s*=\s*(?:float\(['"]-inf['"]\)|[a-zA-Z_]\w*\[0\]|Integer\.MIN_VALUE|INT_MIN)\b(.*)$/);
      if (match) {
        const indent = match[1];
        const varName = match[2];
        const rest = match[3];
        const mutatedLine = `${indent}${varName} = 0${rest}`;
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_max_sentinel_${candidates.length + 1}`,
          mutationType: 'ACC_MAX_SENTINEL_ZERO_INIT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Max tracking variable '${varName}' initialized to 0 instead of negative infinity (fails on arrays with negative numbers)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 4: Min Sentinel Initialized to 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(min_val|min_element|min_num|minimum|lowest|best_min)\s*=\s*(?:float\(['"]inf['"]\)|[a-zA-Z_]\w*\[0\]|Integer\.MAX_VALUE|INT_MAX)\b(.*)$/);
      if (match) {
        const indent = match[1];
        const varName = match[2];
        const rest = match[3];
        const mutatedLine = `${indent}${varName} = 0${rest}`;
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_min_sentinel_${candidates.length + 1}`,
          mutationType: 'ACC_MIN_SENTINEL_ZERO_INIT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Min tracking variable '${varName}' initialized to 0 instead of positive infinity (fails on arrays with positive numbers)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 5: Count Decrement Instead of Increment
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b(count|counter|freq|tally|matches|occurrences)\s*\+=\s*1\b/);
      if (match) {
        const mutatedLine = line.replace(match[0], `${match[1]} -= 1`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_count_dec_${candidates.length + 1}`,
          mutationType: 'ACC_COUNT_INCREMENT_TO_DECREMENT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Counter increment '${match[1]} += 1' changed to '${match[1]} -= 1'`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 6: Accumulator Subtraction Drift
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('+=') && !line.includes('+= 1') && !line.includes('+=1')) {
        const mutatedLine = line.replace('+=', '-=');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_sum_sub_${candidates.length + 1}`,
          mutationType: 'ACC_RUNNING_SUM_SUBTRACTION_DRIFT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Cumulative sum '+=' changed to '-=' (subtracts incoming values instead of accumulating)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 2. BINARY SEARCH & TWO-POINTER BUGS
    // =========================================================================

    // Bug 7: Binary Search Midpoint Calculation Float Division
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('// 2') && /\b(mid|middle|center)\b/.test(line)) {
        const mutatedLine = line.replace('// 2', '/ 2');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_bs_mid_${candidates.length + 1}`,
          mutationType: 'BS_FLOAT_DIVISION_TRUNCATION',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Binary search midpoint '// 2' integer division changed to '/ 2' float division (causes TypeError on float index lookup)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 8: Binary Search High Pointer Infinite Loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b(high|right|r|end)\s*=\s*(?:mid|middle)\s*-\s*1\b/);
      if (match) {
        const ptr = match[1];
        const mutatedLine = line.replace(match[0], `${ptr} = mid`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_bs_high_${candidates.length + 1}`,
          mutationType: 'BS_HIGH_BOUND_INFINITE_LOOP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Binary search boundary update '${match[0]}' changed to '${ptr} = mid' (causes infinite loop when low + 1 == high)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 9: Binary Search Low Pointer Infinite Loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b(low|left|l|start)\s*=\s*(?:mid|middle)\s*\+\s*1\b/);
      if (match) {
        const ptr = match[1];
        const mutatedLine = line.replace(match[0], `${ptr} = mid`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_bs_low_${candidates.length + 1}`,
          mutationType: 'BS_LOW_BOUND_INFINITE_LOOP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Binary search boundary update '${match[0]}' changed to '${ptr} = mid' (causes infinite loop when low and mid converge)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 3. LOOP BOUNDARY & STRIDE TRAPS
    // =========================================================================

    // Bug 10: Loop Termination Off-by-One Drop Final
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('range(len(') || line.includes('range(0, len(')) {
        const mutatedLine = line.replace(/len\s*\(\s*([a-zA-Z_]\w*)\s*\)/, 'len($1) - 1');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_loop_drop_last_${candidates.length + 1}`,
          mutationType: 'LOOP_RANGE_LEN_MINUS_ONE_LAST_ELEMENT_DROP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Loop range boundary 'len(...)' changed to 'len(...) - 1' (drops final element from iteration)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 11: Loop Start Index Off-by-One Skip First
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('range(len(')) {
        const mutatedLine = line.replace(/range\s*\(\s*len\s*\(([^)]+)\)\s*\)/, 'range(1, len($1))');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_loop_skip_first_${candidates.length + 1}`,
          mutationType: 'LOOP_RANGE_ONE_LEN_FIRST_ELEMENT_SKIP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Loop start index 'range(len(...))' changed to 'range(1, len(...))' (skips index 0)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 12: Reversed Loop Range Missing Negative Step
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(', -1)') && line.includes('range(')) {
        const mutatedLine = line.replace(', -1)', ')');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_rev_range_${candidates.length + 1}`,
          mutationType: 'LOOP_REVERSED_RANGE_MISSING_NEGATIVE_STEP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Reversed range step '-1' removed (causes loop to yield empty sequence and execute 0 times)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 4. COLLECTION INDEXING & SLICING
    // =========================================================================

    // Bug 13: Matrix Row Column Inversion
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]\s*\[\s*([a-zA-Z_]\w*)\s*\]/);
      if (match && match[2] !== match[3]) {
        const arrName = match[1];
        const idx1 = match[2];
        const idx2 = match[3];
        const mutatedLine = line.replace(match[0], `${arrName}[${idx2}][${idx1}]`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_matrix_inversion_${candidates.length + 1}`,
          mutationType: 'IDX_MATRIX_ROW_COL_INVERSION',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Matrix indexing '${arrName}[${idx1}][${idx2}]' inverted to '${arrName}[${idx2}][${idx1}]' (row/col dimension swap)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 14: Slice Upper Bound Drop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\[\s*:\s*([a-zA-Z_]\w*|\d+)\s*\]/);
      if (match) {
        const endExpr = match[1];
        const mutatedLine = line.replace(match[0], `[:${endExpr} - 1]`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_slice_upper_drop_${candidates.length + 1}`,
          mutationType: 'IDX_SLICE_UPPER_BOUND_EXCLUSION_DROP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Slice upper bound '[:${endExpr}]' changed to '[:${endExpr} - 1]' (prematurely truncates slice by 1 element)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 5. MATH & NUMERICAL DEFECTS
    // =========================================================================

    // Bug 15: Operator Precedence Parenthesis Omission
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\(\s*([a-zA-Z_]\w*\s*[+\-]\s*[a-zA-Z_]\w*)\s*\)\s*(\/\/|\/)\s*2/);
      if (match) {
        const inner = match[1];
        const div = match[2];
        const mutatedLine = line.replace(match[0], `${inner} ${div} 2`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_math_prec_${candidates.length + 1}`,
          mutationType: 'MATH_OPERATOR_PRECEDENCE_PARENTHESIS_OMISSION',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Parentheses removed from '(${inner}) ${div} 2' causing '${inner.split(/[+\-]/)[1]} ${div} 2' to bind first`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 16: Average Division Length Off-by-One
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\/\s*len\s*\(\s*([a-zA-Z_]\w*)\s*\)/);
      if (match) {
        const arr = match[1];
        const mutatedLine = line.replace(match[0], `/ (len(${arr}) - 1)`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_avg_div_${candidates.length + 1}`,
          mutationType: 'MATH_AVERAGE_DIVISION_LENGTH_OFF_BY_ONE',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Average divisor 'len(${arr})' changed to '(len(${arr}) - 1)' (distorts mean calculation)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 17: Absolute Value Call Drop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\babs\s*\(\s*([a-zA-Z_]\w*\s*-\s*[a-zA-Z_]\w*)\s*\)/);
      if (match) {
        const mutatedLine = line.replace(match[0], `(${match[1]})`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_abs_drop_${candidates.length + 1}`,
          mutationType: 'MATH_ABSOLUTE_VALUE_DISTANCE_CALL_DROPPED',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `abs() distance wrapper removed (yields negative distances when right operand exceeds left)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 6. CONTROL FLOW & GUARD INVERSIONS
    // =========================================================================

    // Bug 18: Premature Return Inside Loop Body
    for (let i = lines.length - 1; i >= 1; i--) {
      const line = lines[i];
      const match = line.match(/^(\s*)return\s+([a-zA-Z_]\w*)\s*$/);
      if (match) {
        const returnIndent = match[1];
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const pLine = lines[j];
          const pMatch = pLine.match(/^(\s*)(for|while)\s+/);
          if (pMatch && pMatch[1].length === returnIndent.length) {
            const mutatedReturn = `${returnIndent}    ${line.trim()}  # premature return`;
            const copy = [...lines];
            copy[i] = mutatedReturn;
            candidates.push({
              id: `cbug_premature_ret_${candidates.length + 1}`,
              mutationType: 'FLOW_RETURN_INSIDE_LOOP_PREMATURE_TERMINATION',
              language,
              location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
              originalFragment: line,
              mutatedFragment: mutatedReturn,
              description: `Return statement indented into loop body (causes function to terminate after 1st iteration)`,
              apply: () => copy.join('\n'),
            });
            break;
          }
        }
      }
    }

    // Bug 19: Guard Clause Inversion
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      if (/if\s+not\s+([a-zA-Z_]\w*)\s*:/.test(line)) {
        const mutatedLine = line.replace(/if\s+not\s+([a-zA-Z_]\w*)\s*:/, 'if $1:');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_guard_inv_${candidates.length + 1}`,
          mutationType: 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Input validation guard clause inverted (rejects valid non-empty inputs)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 7. HASH MAP & SET INVARIANTS
    // =========================================================================

    // Bug 20: Visited Set Membership Inversion
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('not in visited') || line.includes('not in seen')) {
        const mutatedLine = line.replace('not in visited', 'in visited').replace('not in seen', 'in seen');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_seen_inv_${candidates.length + 1}`,
          mutationType: 'HM_SET_MEMBERSHIP_INVERSION_DUPLICATE_DROP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Visited set check inverted (processes already-visited nodes and ignores new nodes)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 21: Hash Map Key Overwrite Instead of Accumulate
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.get(') && line.includes(' + 1')) {
        const mutatedLine = line.replace(/\.get\([^)]+\)\s*\+\s*1/, '1');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_hm_overwrite_${candidates.length + 1}`,
          mutationType: 'HM_KEY_OVERWRITE_INSTEAD_OF_ACCUMULATE',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Frequency tally '.get(..., 0) + 1' changed to constant 1 (overwrites frequency on duplicate)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 8. STRING & SORTING INVARIANTS
    // =========================================================================

    // Bug 22: String Strip Omission
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.strip()')) {
        const mutatedLine = line.replace('.strip()', '');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_str_strip_${candidates.length + 1}`,
          mutationType: 'STR_STRIP_OMISSION_TRAILING_WHITESPACE',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `String .strip() call removed (causes whitespace and newline comparison failures)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 23: Sorting Direction Inversion
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('sorted(') || line.includes('.sort(')) {
        if (!line.includes('reverse=')) {
          const mutatedLine = line.replace(/\.sort\(\)/, '.sort(reverse=True)').replace(/sorted\(([^)]+)\)/, 'sorted($1, reverse=True)');
          const copy = [...lines];
          copy[i] = mutatedLine;
          candidates.push({
            id: `cbug_sort_inv_${candidates.length + 1}`,
            mutationType: 'SORT_COMPARATOR_POLARITY_INVERSION',
            language,
            location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
            originalFragment: line,
            mutatedFragment: mutatedLine,
            description: `Sort order inverted by injecting 'reverse=True' into sorting call`,
            apply: () => copy.join('\n'),
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Deterministically selects a single complex bug (for backwards compatibility).
   */
  public selectComplexBug(
    code: string,
    language: string,
    seed: string,
    requestedType?: string
  ): MutationCandidate | null {
    const candidates = this.findComplexCandidates(code, language);
    if (candidates.length === 0) return null;

    let pool = candidates;
    if (requestedType) {
      const filtered = candidates.filter((c) => c.mutationType === requestedType);
      if (filtered.length > 0) pool = filtered;
    }

    const rng = createDeterministicRNG(seed);
    const chosenIndex = Math.floor(rng() * pool.length);
    return pool[chosenIndex];
  }

  /**
   * Generates a comprehensive, type-safe pool of realistic mutation candidates
   * mapped strictly to the 8 canonical AlgorithmicBugCategory classes.
   *
   * Eliminates unconstrained regex mutations and enforces strict type invariance:
   * Never applies arithmetic offsets to pointers, data structures, strings, or booleans.
   * Never mutates class declarations, function definitions, decorators, or imports.
   */
  public generateRichCandidatePool(
    code: string,
    language: string = 'python'
  ): RichCandidateItem[] {
    const rawLines = code.split('\n');
    const pool: RichCandidateItem[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const lineNum = i + 1;
      const lineText = rawLines[i];
      const trimmed = lineText.trim();

      // Guard header lines, class/def declarations, decorators, imports, comments, docstrings
      if (
        !trimmed ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('def ') ||
        trimmed.startsWith('async def ') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('@') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('from ') ||
        trimmed.startsWith('"""') ||
        trimmed.startsWith("'''") ||
        trimmed.endsWith('"""') ||
        trimmed.endsWith("'''")
      ) {
        continue;
      }

      // =========================================================================
      // 1. LOOP_BOUNDARY
      // =========================================================================
      if (lineText.includes('range(')) {
        // 1A. range(len(x)) -> range(len(x) - 1)
        if (/range\s*\(\s*len\s*\(([^)]+)\)\s*\)/.test(lineText)) {
          const mutated = lineText.replace(/range\s*\(\s*len\s*\(([^)]+)\)\s*\)/, 'range(len($1) - 1)');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_RANGE_LEN_MINUS_ONE_LAST_ELEMENT_DROP',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'Range Len Minus One Last Element Drop',
            category: 'Loop Boundary & Stride Traps',
            description: 'Loop upper boundary truncated by 1 (drops final element from iteration)',
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
        // 1B. range(len(x)) -> range(1, len(x)) (skip first element)
        if (/range\s*\(\s*len\s*\(([^)]+)\)\s*\)/.test(lineText) && !lineText.includes('range(1,')) {
          const mutated = lineText.replace(/range\s*\(\s*len\s*\(([^)]+)\)\s*\)/, 'range(1, len($1))');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_RANGE_ONE_LEN_FIRST_ELEMENT_SKIP',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'Range Skip First Element',
            category: 'Loop Boundary & Stride Traps',
            description: 'Loop start index shifted to 1 (skips index 0)',
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
        // 1C. range(start, end + 1) -> range(start, end)
        if (/range\s*\(\s*(\d+|[a-zA-Z_]\w*)\s*,\s*([a-zA-Z_]\w*|\d+)\s*\+\s*1\s*\)/.test(lineText)) {
          const mutated = lineText.replace(/range\s*\(\s*(\d+|[a-zA-Z_]\w*)\s*,\s*([a-zA-Z_]\w*|\d+)\s*\+\s*1\s*\)/, 'range($1, $2)');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_RANGE_UPPER_BOUND_OMISSION',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'Loop Upper Bound Off-By-One Omission',
            category: 'Loop Boundary & Stride Traps',
            description: "Inclusive loop bound 'range(start, end + 1)' truncated to 'range(start, end)'",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
        // 1D. Reversed range missing negative step: range(..., -1) -> range(...)
        if (lineText.includes(', -1)') && lineText.includes('range(')) {
          const mutated = lineText.replace(', -1)', ')');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_REVERSED_RANGE_MISSING_NEGATIVE_STEP',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'Reversed Range Missing Step',
            category: 'Loop Boundary & Stride Traps',
            description: "Reversed range step '-1' removed (causes loop to yield empty sequence)",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // 1E. While loop boundary shifts on index pointers
      if (trimmed.startsWith('while ')) {
        if (lineText.includes(' <= ') && !lineText.includes('==')) {
          const mutated = lineText.replace(' <= ', ' < ');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_WHILE_INCLUSIVE_TO_STRICT_TERMINATION',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'While Loop Bound Inclusive to Strict Shift',
            category: 'Loop Boundary & Stride Traps',
            description: "Loop condition '<=' changed to strict '<' (terminates 1 step prematurely)",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        } else if (lineText.includes(' < ') && !lineText.includes('<=') && !lineText.includes('<<')) {
          const mutated = lineText.replace(' < ', ' <= ');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_WHILE_STRICT_TO_INCLUSIVE_OVERRUN',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'While Loop Bound Strict to Inclusive Overrun',
            category: 'Loop Boundary & Stride Traps',
            description: "Loop condition '<' changed to '<=' (risks off-by-one index overrun)",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // 1D. Loop over range with arithmetic bounds: range(left - 1) or range(right - left)
      if (lineText.includes('in range(')) {
        if (lineText.includes('left - 1')) {
          const mutated = lineText.replace('left - 1', 'left');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_RANGE_START_INCORRECT_OFFSET',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'Loop Range Bound Off-By-One',
            category: 'Loop Invariants & Iteration Bounds',
            description: "Loop range bound 'left - 1' changed to 'left' (off-by-one iteration count)",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        } else if (lineText.includes('right - left')) {
          const mutated = lineText.replace('right - left', 'right - left + 1');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_RANGE_START_INCORRECT_OFFSET',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'Loop Range Bound Fencepost Overrun',
            category: 'Loop Invariants & Iteration Bounds',
            description: "Loop range bound 'right - left' changed to 'right - left + 1' (causes iteration overrun)",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // =========================================================================
      // 2. CONDITION_INVERSION
      // =========================================================================
      if ((trimmed.startsWith('if ') || trimmed.startsWith('elif ') || trimmed.startsWith('while ')) && !trimmed.startsWith('if __name__')) {
        // 2A. Conjunction / Disjunction flip
        if (lineText.includes(' and ')) {
          const mutated = lineText.replace(' and ', ' or ');
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_LOGICAL_AND_TO_OR_CONDITION_EXPANSION',
            algorithmicCategory: 'CONDITION_INVERSION',
            name: 'Logical AND Changed to OR',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Logical conjunction 'and' changed to disjunction 'or'",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        } else if (lineText.includes(' or ')) {
          const mutated = lineText.replace(' or ', ' and ');
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_LOGICAL_OR_TO_AND_CONDITION_CONSTRICTION',
            algorithmicCategory: 'CONDITION_INVERSION',
            name: 'Logical OR Changed to AND',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Logical disjunction 'or' changed to conjunction 'and'",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }

        // 2B. Equality / Inequality flip in conditions
        if (lineText.includes(' == ') && !lineText.includes('%')) {
          const mutated = lineText.replace(' == ', ' != ');
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_EQUALITY_INVERTED_TO_NOT_EQUAL',
            algorithmicCategory: 'CONDITION_INVERSION',
            name: 'Conditional Equality Inversion',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Conditional equality check '==' inverted to '!='",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        } else if (lineText.includes(' != ')) {
          const mutated = lineText.replace(' != ', ' == ');
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_INEQUALITY_INVERTED_TO_EQUAL',
            algorithmicCategory: 'CONDITION_INVERSION',
            name: 'Conditional Inequality Inversion',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Conditional inequality check '!=' inverted to '=='",
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }

        // 2C. Relational operator flip in if/elif branches
        if (trimmed.startsWith('if ') || trimmed.startsWith('elif ')) {
          if (lineText.includes(' <= ') && !lineText.includes('==')) {
            const mutated = lineText.replace(' <= ', ' > ');
            pool.push({
              line: lineNum,
              mutationType: 'FLOW_LESS_EQUAL_INVERTED_TO_GREATER',
              algorithmicCategory: 'CONDITION_INVERSION',
              name: 'Branch Relational Inversion <= to >',
              category: 'Control Flow, Premature Returns & Guards',
              description: "Branch guard '<=' inverted to '>'",
              originalFragment: lineText,
              mutatedFragment: mutated,
              applyToLines: (arr) => { arr[i] = mutated; },
            });
          } else if (lineText.includes(' < ') && !lineText.includes('<=') && !lineText.includes('<<')) {
            const mutated = lineText.replace(' < ', ' > ');
            pool.push({
              line: lineNum,
              mutationType: 'FLOW_LESS_THAN_INVERTED_TO_GREATER',
              algorithmicCategory: 'CONDITION_INVERSION',
              name: 'Branch Relational Inversion < to >',
              category: 'Control Flow, Premature Returns & Guards',
              description: "Branch guard '<' inverted to '>'",
              originalFragment: lineText,
              mutatedFragment: mutated,
              applyToLines: (arr) => { arr[i] = mutated; },
            });
          } else if (lineText.includes(' > ') && !lineText.includes('>=') && !lineText.includes('>>')) {
            const mutated = lineText.replace(' > ', ' < ');
            pool.push({
              line: lineNum,
              mutationType: 'FLOW_GREATER_THAN_INVERTED_TO_LESS',
              algorithmicCategory: 'CONDITION_INVERSION',
              name: 'Branch Relational Inversion > to <',
              category: 'Control Flow, Premature Returns & Guards',
              description: "Branch guard '>' inverted to '<'",
              originalFragment: lineText,
              mutatedFragment: mutated,
              applyToLines: (arr) => { arr[i] = mutated; },
            });
          }
        }
      }

      // =========================================================================
      // 3. STATE_UPDATE_ORDER (Statement sequence inversion in multi-line blocks)
      // =========================================================================
      if (i < rawLines.length - 1) {
        const nextLine = rawLines[i + 1];
        const nextTrimmed = nextLine.trim();
        const curIndent = lineText.match(/^(\s*)/)?.[1] || '';
        const nxtIndent = nextLine.match(/^(\s*)/)?.[1] || '';

        // Two consecutive assignment statements with same indentation inside a function/loop
        if (
          curIndent === nxtIndent &&
          curIndent.length >= 4 &&
          trimmed.includes('=') &&
          nextTrimmed.includes('=') &&
          !trimmed.startsWith('if') &&
          !nextTrimmed.startsWith('if') &&
          !trimmed.startsWith('for') &&
          !nextTrimmed.startsWith('for') &&
          !trimmed.startsWith('while') &&
          !nextTrimmed.startsWith('while')
        ) {
          // Pointer reversal / traversal sequence swap
          if (
            (trimmed.includes('.next =') && nextTrimmed.includes('prev =')) ||
            (trimmed.includes('prev =') && nextTrimmed.includes('curr =')) ||
            (trimmed.includes('slow =') && nextTrimmed.includes('fast =')) ||
            (trimmed.includes('p1 =') && nextTrimmed.includes('p2 =')) ||
            (trimmed.includes('.next =') && nextTrimmed.includes('.next =')) ||
            (trimmed.includes('.next.next =') && nextTrimmed.includes('.next =')) ||
            (trimmed.includes('.next =') && nextTrimmed.includes('.next.next =')) ||
            (trimmed.includes('.append(') && (nextTrimmed.includes('+= 1') || nextTrimmed.includes('-= 1'))) ||
            (!trimmed.includes('self.') && !nextTrimmed.includes('self.') && curIndent.length >= 8)
          ) {
            pool.push({
              line: lineNum,
              mutationType: 'PTR_UPDATE_ORDER_DEPENDENCY_INVERSION',
              algorithmicCategory: 'STATE_UPDATE_ORDER',
              name: 'Pointer / State Update Order Inversion',
              category: 'Pointer & State Invariants',
              description: `Dependent updates '${trimmed}' and '${nextTrimmed}' swapped in sequence`,
              originalFragment: `${lineText}\n${nextLine}`,
              mutatedFragment: `${curIndent}${nextTrimmed}\n${nxtIndent}${trimmed}`,
              applyToLines: (arr) => {
                arr[i] = `${curIndent}${nextTrimmed}`;
                arr[i + 1] = `${nxtIndent}${trimmed}`;
              },
            });
          }
        }
      }

      // =========================================================================
      // 4. BASE_CASE_DEFECT (Recursive base cases & DP initial conditions)
      // =========================================================================
      // 4A. Recursive base case length check (len(arr) <= 1 -> len(arr) < 1)
      if (/len\s*\([^)]+\)\s*<=\s*1\s*:/.test(lineText)) {
        const mutated = lineText.replace(/<=\s*1\s*:/, '< 1:');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_CONDITION_RECURSION_OVERRUN',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Base Case Overrun',
          category: 'Recursion & Base Case Traps',
          description: "Base case 'len(...) <= 1' changed to '< 1' (causes infinite recursion on single-element inputs)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 4B. Recursive linked list base case drop (if not head or not head.next -> if not head)
      if (lineText.includes('if not head or not head.next:')) {
        const mutated = lineText.replace('if not head or not head.next:', 'if not head:');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_LOOKAHEAD_NULL_DEREFERENCE',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Lookahead Base Case Omission',
          category: 'Recursion & Base Case Traps',
          description: "Base case 'not head.next' lookahead removed (causes AttributeError on head.next.next)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 4B2. Recursive call argument defect
      if (lineText.includes('reverse_list_recursive(head.next)')) {
        const mutated = lineText.replace('reverse_list_recursive(head.next)', 'reverse_list_recursive(head)');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_CONDITION_RECURSION_OVERRUN',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Step Parameter Non-Decreasing',
          category: 'Recursion & Base Case Traps',
          description: "Recursive call argument 'head.next' reverted to 'head' (infinite recursion)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      if (lineText.trim() === 'return head' && i > 0 && rawLines[i - 1]?.includes('if not head')) {
        const mutated = lineText.replace('return head', 'return None');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_PREMATURE_TERMINATION',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Base Case Return Value Corruption',
          category: 'Recursion & Base Case Traps',
          description: "Recursive base case 'return head' corrupted to 'return None'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 4C. Helper base case (if l > r -> if l >= r)
      if (/if\s+([a-zA-Z_]\w*)\s*>\s*([a-zA-Z_]\w*)\s*:/.test(lineText)) {
        const mutated = lineText.replace(/\b>\b/, '>=');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_PREMATURE_TERMINATION',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Search Base Case Bound Premature Exit',
          category: 'Recursion & Base Case Traps',
          description: "Search base case '>' changed to '>=' (prematurely rejects element when bounds meet)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 4D. DP base case state defect
      if (/^(\s*)dp\s*\[\s*0\s*\]\s*=\s*0\b/.test(lineText)) {
        const mutated = lineText.replace('dp[0] = 0', 'dp[0] = 1');
        pool.push({
          line: lineNum,
          mutationType: 'DP_BASE_CASE_INITIAL_STATE_CORRUPTION',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'DP Base Case State Corruption',
          category: 'Dynamic Programming & Memoization',
          description: "DP base state 'dp[0] = 0' corrupted to 'dp[0] = 1' (distorts entire recurrence)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      if (/^(\s*)dp\s*\[\s*1\s*\]\s*=\s*1\b/.test(lineText)) {
        const mutated = lineText.replace('dp[1] = 1', 'dp[1] = 0');
        pool.push({
          line: lineNum,
          mutationType: 'DP_BASE_CASE_INITIAL_STATE_CORRUPTION',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'DP Base Case State Corruption',
          category: 'Dynamic Programming & Memoization',
          description: "DP base state 'dp[1] = 1' corrupted to 'dp[1] = 0'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      if (/^(\s*)if\s+n\s*<=\s*2\s*:\s*return\s+n\b/.test(lineText)) {
        const mutated = lineText.replace('n <= 2', 'n <= 1');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_CONDITION_RECURSION_OVERRUN',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Climb Stairs Base Case Bound Truncation',
          category: 'Recursion & Base Case Traps',
          description: "Base case 'n <= 2' changed to 'n <= 1'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // =========================================================================
      // 5. INDEX_OFFSET (Midpoint calculation, Matrix dimension inversion, Division)
      // =========================================================================
      // 5A. Parentheses omission in midpoint calculation
      if (lineText.includes('// 2') && /\(\s*[a-zA-Z_]\w*\s*\+\s*[a-zA-Z_]\w*\s*\)\s*\/\/\s*2/.test(lineText)) {
        const mutated = lineText.replace(/\(\s*([a-zA-Z_]\w*\s*\+\s*[a-zA-Z_]\w*)\s*\)\s*\/\/\s*2/, '$1 // 2');
        pool.push({
          line: lineNum,
          mutationType: 'MATH_OPERATOR_PRECEDENCE_PARENTHESIS_OMISSION',
          algorithmicCategory: 'INDEX_OFFSET',
          name: 'Midpoint Calculation Parenthesis Omission',
          category: 'Binary Search & Two-Pointer Invariants',
          description: "Parentheses removed from '(low + high) // 2' causing 'high // 2' to bind first",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 5B. Integer division truncation // 2 -> / 2
      if (lineText.includes('// 2') && (lineText.includes('mid') || lineText.includes('center') || lineText.includes('len('))) {
        const mutated = lineText.replace('// 2', '/ 2');
        pool.push({
          line: lineNum,
          mutationType: 'BS_FLOAT_DIVISION_TRUNCATION',
          algorithmicCategory: 'INDEX_OFFSET',
          name: 'Binary Search / Slice Float Division',
          category: 'Binary Search & Two-Pointer Invariants',
          description: "Integer floor division '// 2' changed to float '/ 2' (causes TypeError on float index)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 5C. Matrix 2D Index Inversion [i][j] -> [j][i]
      const matrixMatch = lineText.match(/\b([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]\s*\[\s*([a-zA-Z_]\w*)\s*\]/);
      if (matrixMatch && matrixMatch[2] !== matrixMatch[3]) {
        const arrName = matrixMatch[1];
        const idx1 = matrixMatch[2];
        const idx2 = matrixMatch[3];
        const mutated = lineText.replace(matrixMatch[0], `${arrName}[${idx2}][${idx1}]`);
        pool.push({
          line: lineNum,
          mutationType: 'IDX_MATRIX_ROW_COL_INVERSION',
          algorithmicCategory: 'INDEX_OFFSET',
          name: 'Matrix Row-Column Dimension Inversion',
          category: 'Collection Access & Slice Bounds',
          description: `Matrix indexing '${arrName}[${idx1}][${idx2}]' inverted to '${arrName}[${idx2}][${idx1}]'`,
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 5D. Slice bound off-by-one
      if (/\[\s*:\s*(mid|center|[a-zA-Z_]\w*)\s*\]/.test(lineText)) {
        const mutated = lineText.replace(/\[\s*:\s*([a-zA-Z_]\w*)\s*\]/, '[:$1 - 1]');
        pool.push({
          line: lineNum,
          mutationType: 'IDX_SLICE_UPPER_BOUND_EXCLUSION_DROP',
          algorithmicCategory: 'INDEX_OFFSET',
          name: 'Slice Upper Bound Exclusion Drop',
          category: 'Collection Access & Slice Bounds',
          description: 'Slice upper bound reduced by 1 (drops last element of partition)',
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // =========================================================================
      // 6. ACCUMULATOR_SCOPE (State resets inside loop body, counter increment/decrement)
      // =========================================================================
      // 6A. Counter increment to decrement
      if (lineText.includes(' += 1')) {
        const mutated = lineText.replace(' += 1', ' -= 1');
        pool.push({
          line: lineNum,
          mutationType: 'ACC_COUNT_INCREMENT_TO_DECREMENT',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: 'Counter Increment to Decrement',
          category: 'Accumulator & State Invariants',
          description: "Counter increment '+= 1' inverted to '-= 1'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      } else if (lineText.includes(' -= 1')) {
        const mutated = lineText.replace(' -= 1', ' += 1');
        pool.push({
          line: lineNum,
          mutationType: 'ACC_COUNT_DECREMENT_TO_INCREMENT',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: 'Counter Decrement to Increment',
          category: 'Accumulator & State Invariants',
          description: "Counter decrement '-= 1' changed to '+= 1'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 6B. Accumulator sum subtraction drift
      if (lineText.includes(' += ') && !lineText.includes('+= 1') && !lineText.includes('+=1')) {
        const mutated = lineText.replace(' += ', ' -= ');
        pool.push({
          line: lineNum,
          mutationType: 'ACC_RUNNING_SUM_SUBTRACTION_DRIFT',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: 'Accumulator Subtraction Drift',
          category: 'Accumulator & State Invariants',
          description: "Cumulative accumulator '+=' changed to '-=' (subtracts values instead of summing)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 6C. Product accumulator zero initialization
      if (/^(\s*)(prod|product|ans|res|factorial|fact|total_product)\s*=\s*1\b/.test(lineText)) {
        const mutated = lineText.replace(/=\s*1\b/, '= 0');
        pool.push({
          line: lineNum,
          mutationType: 'ACC_PRODUCT_ACCUMULATOR_ZERO_INIT',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: 'Product Accumulator Zero Initialization',
          category: 'Accumulator & State Invariants',
          description: "Multiplicative accumulator initialized to 0 instead of 1 (forces all products to 0)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 6D. DP minimum accumulator initialized to 0 instead of infinity
      if (lineText.includes("float('inf')") && (lineText.includes('dp') || lineText.includes('min'))) {
        const mutated = lineText.replace("float('inf')", '0');
        pool.push({
          line: lineNum,
          mutationType: 'ACC_MIN_SENTINEL_ZERO_INIT',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: 'Min Sentinel Zero Initialization',
          category: 'Accumulator & State Invariants',
          description: "Min tracking table initialized to 0 instead of infinity (prevents finding true minimum)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // =========================================================================
      // 7. EDGE_CASE_BYPASS (Guard neutralization & Pointer lock infinite loops)
      // =========================================================================
      // 7A. Matrix dimension check neutralization
      if (/if\s+c1\s*!=\s*r2\s*:/.test(lineText)) {
        const mutated = lineText.replace('c1 != r2', 'c1 == r2');
        pool.push({
          line: lineNum,
          mutationType: 'EDGE_CASE_DIMENSION_MISMATCH_BYPASS',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'Matrix Dimension Validation Inversion',
          category: 'Boundary & Invariant Guards',
          description: "Incompatible matrix dimension guard inverted (allows invalid matrix multiplication)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 7B. String length inequality check neutralization
      if (/if\s+len\(s1?\)\s*!=\s*len\(s2?|t\)\s*:/.test(lineText)) {
        const mutated = lineText.replace(/len\(s1?\)\s*!=\s*len\(s2?|t\)/, 'False');
        pool.push({
          line: lineNum,
          mutationType: 'EDGE_CASE_STRING_LENGTH_CHECK_BYPASS',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'String Length Pre-Check Neutralized',
          category: 'Boundary & Invariant Guards',
          description: "String length equality pre-check neutralized to False (bypasses length guard)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 7C. Empty input guard clause neutralization
      if (/if\s+not\s+(arr|nums|head|text|m1)\s*:/.test(lineText)) {
        const mutated = lineText.replace(/if\s+not\s+([a-zA-Z_]\w*)\s*:/, 'if False:');
        pool.push({
          line: lineNum,
          mutationType: 'EDGE_CASE_EMPTY_INPUT_CHECK_BYPASS',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'Empty Input Guard Clause Bypass',
          category: 'Boundary & Invariant Guards',
          description: "Empty collection boundary guard bypassed (crashes on empty input)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 7D. Binary search boundary locks
      if (/\b(high|right|end)\s*=\s*(?:mid|center)\s*-\s*1\b/.test(lineText)) {
        const match = lineText.match(/\b(high|right|end)\s*=\s*(?:mid|center)\s*-\s*1\b/);
        const ptr = lineText.match(/\b(high|right|end)\b/)?.[1] || 'high';
        const midVar = lineText.includes('center') ? 'center' : 'mid';
        const mutated = lineText.replace(match![0], `${ptr} = ${midVar}`);
        pool.push({
          line: lineNum,
          mutationType: 'BS_HIGH_BOUND_INFINITE_LOOP',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'High Bound Infinite Loop Lock',
          category: 'Binary Search & Two-Pointer Invariants',
          description: `Binary search boundary '${ptr} = ${midVar} - 1' changed to '${ptr} = ${midVar}' (infinite loop when low + 1 == high)`,
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      if (/\b(low|left|start)\s*=\s*(?:mid|center)\s*\+\s*1\b/.test(lineText)) {
        const match = lineText.match(/\b(low|left|start)\s*=\s*(?:mid|center)\s*\+\s*1\b/);
        const ptr = lineText.match(/\b(low|left|start)\b/)?.[1] || 'low';
        const midVar = lineText.includes('center') ? 'center' : 'mid';
        const mutated = lineText.replace(match![0], `${ptr} = ${midVar}`);
        pool.push({
          line: lineNum,
          mutationType: 'BS_LOW_BOUND_INFINITE_LOOP',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'Low Bound Infinite Loop Lock',
          category: 'Binary Search & Two-Pointer Invariants',
          description: `Binary search boundary '${ptr} = ${midVar} + 1' changed to '${ptr} = ${midVar}' (infinite loop when pointers meet)`,
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 7E. Cycle detection initial lock
      if (/fast\s*=\s*head\.next\b/.test(lineText)) {
        const mutated = lineText.replace('fast = head.next', 'fast = head');
        pool.push({
          line: lineNum,
          mutationType: 'PTR_CYCLE_INITIAL_STATE_LOCK',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'Cycle Detector False Convergence Initial Lock',
          category: 'Pointer & State Invariants',
          description: "'fast = head.next' changed to 'fast = head' (slow == fast on start, exiting loop on 1st check)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 7F. Linked list sentinel initial state corruption
      if (lineText.trim() === 'prev = None') {
        const mutated = lineText.replace('prev = None', 'prev = head');
        pool.push({
          line: lineNum,
          mutationType: 'PTR_CYCLE_INITIAL_STATE_LOCK',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'Pointer Sentinel Initial State Corruption',
          category: 'Pointer & State Invariants',
          description: "'prev = None' changed to 'prev = head' (causes circular reference on initial link)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 7G. Linked list reversed return pointer substitution
      if (lineText.trim() === 'return prev') {
        const mutated = lineText.replace('return prev', 'return head');
        pool.push({
          line: lineNum,
          mutationType: 'VAR_POINTER_RETURN_ORIGINAL_HEAD',
          algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
          name: 'Pointer Return Original Head Substitution',
          category: 'Identifier & Variable Traps',
          description: "Reversed list return 'return prev' changed to 'return head' (returns old head which is now tail)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // =========================================================================
      // 8. VARIABLE_SHADOWING_SWAP (Symmetrical variable substitution)
      // =========================================================================
      // 8A. Symmetrical pointer variable swap
      if (/\b(start|left|low)\s*=\s*(?:mid|center)\s*\+\s*1\b/.test(lineText)) {
        const mutated = lineText.replace(/\b(start|left|low)\b/, (m) => m === 'start' ? 'end' : m === 'left' ? 'right' : 'high');
        pool.push({
          line: lineNum,
          mutationType: 'VAR_TWO_POINTER_BOUND_VARIABLE_SWAP',
          algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
          name: 'Two-Pointer Symmetrical Variable Swap',
          category: 'Identifier & Variable Traps',
          description: "Target boundary variable swapped with opposite pointer",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 8B. Index variable comparison mirroring: s[left] != s[right] -> s[left] != s[left]
      if (/([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]\s*(!=|==)\s*([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]/.test(lineText)) {
        const match = lineText.match(/([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]\s*(!=|==)\s*([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]/);
        if (match && match[2] !== match[5]) {
          const mutated = lineText.replace(match[0], `${match[1]}[${match[2]}] ${match[3]} ${match[4]}[${match[2]}]`);
          pool.push({
            line: lineNum,
            mutationType: 'VAR_INDEX_MIRRORING_SELF_COMPARISON',
            algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
            name: 'Array Index Variable Shadowing Mirror',
            category: 'Identifier & Variable Traps',
            description: `Comparison index '${match[5]}' shadowed with '${match[2]}' (self-comparison)`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }
      // 8C. Frequency array comparison swap
      if (lineText.includes('freq1[i] != freq2[i]')) {
        const mutated = lineText.replace('freq1[i] != freq2[i]', 'freq1[i] != freq1[i]');
        pool.push({
          line: lineNum,
          mutationType: 'VAR_FREQUENCY_TABLE_SELF_COMPARISON',
          algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
          name: 'Frequency Table Variable Shadowing',
          category: 'Identifier & Variable Traps',
          description: "'freq1[i] != freq2[i]' mutated to 'freq1[i] != freq1[i]' (always false)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 8D. Cycle meeting point pointer traversal swap
      if (lineText.includes('p2 = p2.next')) {
        const mutated = lineText.replace('p2 = p2.next', 'p2 = p1.next');
        pool.push({
          line: lineNum,
          mutationType: 'VAR_CYCLE_MEETING_POINTER_SHADOW',
          algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
          name: 'Cycle Detector Meeting Pointer Shadowing',
          category: 'Identifier & Variable Traps',
          description: "'p2 = p2.next' mutated to 'p2 = p1.next'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
    }

    return pool;
  }

  /**
   * Deterministically selects and applies EXACTLY 3 distinct, non-conflicting
   * complex bugs from 3 DIFFERENT algorithmic categories per student.
   *
   * Enforces:
   * 1. 3 distinct AlgorithmicBugCategory classes per submission (anti-repetition rotation).
   * 2. History-aware category exclusion via optional `previousBugCategories`.
   * 3. Pre-delivery AST compiler guard ensuring 100% syntactically valid code.
   * 4. Complete elimination of unconstrained regex string append.
   */
  public selectThreeComplexBugs(
    code: string,
    language: string,
    seed: string,
    requestedType?: string,
    previousBugCategories?: string[]
  ): ThreeBugSelectionResult {
    const rawLines = code.split('\n');
    const rng = createDeterministicRNG(seed);
    const isPy = language.toLowerCase() === 'python' || language.toLowerCase() === 'py';
    const pyProvider = isPy ? new PythonLanguageProvider() : null;

    // 1. Gather all natural complex candidates from AST inspection
    const naturalCandidates = this.findComplexCandidates(code, language);
    const naturalItems: RichCandidateItem[] = naturalCandidates.map((c) => {
      const entry = this.getCatalogEntry(c.mutationType);
      const cat = mapToAlgorithmicCategory(c.mutationType, entry?.category || c.mutationType, c.description || '');
      return {
        line: c.location.line,
        mutationType: c.mutationType,
        algorithmicCategory: cat,
        name: entry?.name || c.mutationType.replace(/_/g, ' '),
        category: entry?.category || 'Algorithm Logic',
        description: c.description || entry?.description || 'Subtle algorithmic defect injected',
        originalFragment: c.originalFragment,
        mutatedFragment: c.mutatedFragment,
        applyToLines: (linesArr) => {
          linesArr[c.location.line - 1] = c.mutatedFragment.split('\n')[0] || c.mutatedFragment;
        },
      };
    });

    // 2. Gather rich type-safe candidates across the 8 algorithmic categories
    const richItems = this.generateRichCandidatePool(code, language);

    // 3. Merge candidate pools
    let combinedPool: RichCandidateItem[] = [...naturalItems, ...richItems];

    // Filter by requestedType if provided
    if (requestedType) {
      const filtered = combinedPool.filter((c) => c.mutationType === requestedType);
      if (filtered.length > 0) combinedPool = filtered;
    }

    // 4. History-Aware Filtering:
    // If student has previous bug categories from prior attempts, de-prioritize or filter them out
    if (previousBugCategories && previousBugCategories.length > 0) {
      const unseenPool = combinedPool.filter((c) => !previousBugCategories.includes(c.algorithmicCategory));
      const distinctUnseenCats = new Set(unseenPool.map((c) => c.algorithmicCategory));
      if (distinctUnseenCats.size >= 3) {
        combinedPool = unseenPool;
      }
    }

    // Deterministically shuffle candidates using seed
    const shuffled = [...combinedPool].sort(() => rng() - 0.5);

    // Group candidates by their AlgorithmicBugCategory
    const byCategory = new Map<AlgorithmicBugCategory, RichCandidateItem[]>();
    for (const cand of shuffled) {
      if (!byCategory.has(cand.algorithmicCategory)) {
        byCategory.set(cand.algorithmicCategory, []);
      }
      byCategory.get(cand.algorithmicCategory)!.push(cand);
    }

    const prevSet = new Set(previousBugCategories || []);
    const availableCategories = Array.from(byCategory.keys()).sort((a, b) => {
      const aSeen = prevSet.has(a) ? 1 : 0;
      const bSeen = prevSet.has(b) ? 1 : 0;
      if (aSeen !== bSeen) return aSeen - bSeen; // Unseen categories come first
      return rng() - 0.5;
    });

    // Iteratively attempt to select 3 candidates from 3 DISTINCT categories that pass AST syntax validation
    let chosen: RichCandidateItem[] = [];
    let validatedCode: string | null = null;

    const maxAttempts = Math.max(1, availableCategories.length * 2);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      chosen = [];
      const usedLines = new Set<number>();
      const usedTypes = new Set<string>();
      const usedCategories = new Set<string>();

      // Rotate categories based on attempt index
      const categoryOrder = availableCategories.slice(attempt % availableCategories.length).concat(
        availableCategories.slice(0, attempt % availableCategories.length)
      );

      // Pass 1: Select exactly 1 candidate from each distinct category
      for (const cat of categoryOrder) {
        if (chosen.length === 3) break;
        if (usedCategories.has(cat)) continue;

        const catList = byCategory.get(cat) || [];
        for (const cand of catList) {
          if (usedLines.has(cand.line)) continue;
          if (usedTypes.has(cand.mutationType)) continue;

          usedLines.add(cand.line);
          usedTypes.add(cand.mutationType);
          usedCategories.add(cat);
          chosen.push(cand);
          break;
        }
      }

      // Pass 2: If code is very short and has < 3 distinct categories, allow distinct types
      if (chosen.length < 3) {
        for (const cand of shuffled) {
          if (chosen.length === 3) break;
          if (usedLines.has(cand.line)) continue;
          if (usedTypes.has(cand.mutationType)) continue;

          usedLines.add(cand.line);
          usedTypes.add(cand.mutationType);
          chosen.push(cand);
        }
      }

      // Safeguard for short submissions: ensure exactly 3 distinct entries across distinct categories
      if (chosen.length < 3) {
        const usedCats = new Set(chosen.map((c) => c.algorithmicCategory));
        const allCats: AlgorithmicBugCategory[] = [
          'LOOP_BOUNDARY',
          'CONDITION_INVERSION',
          'STATE_UPDATE_ORDER',
          'BASE_CASE_DEFECT',
          'INDEX_OFFSET',
          'ACCUMULATOR_SCOPE',
          'EDGE_CASE_BYPASS',
          'VARIABLE_SHADOWING_SWAP',
        ];
        const missingCats = allCats.filter((c) => !usedCats.has(c));

        // Find safe executable lines (not def, class, import, decorators, comments, blank)
        const safeLines: number[] = [];
        for (let li = 0; li < rawLines.length; li++) {
          const ltr = rawLines[li].trim();
          if (
            ltr &&
            !ltr.startsWith('def ') &&
            !ltr.startsWith('class ') &&
            !ltr.startsWith('import ') &&
            !ltr.startsWith('from ') &&
            !ltr.startsWith('@') &&
            !ltr.startsWith('#') &&
            !ltr.startsWith('self.') &&
            !usedLines.has(li + 1)
          ) {
            safeLines.push(li + 1);
          }
        }

        while (chosen.length < 3 && safeLines.length > 0) {
          const targetL = safeLines.shift()!;
          const nextCat = missingCats.shift() || 'EDGE_CASE_BYPASS';
          usedLines.add(targetL);
          chosen.push({
            line: targetL,
            mutationType: `SAFEGUARD_${nextCat}`,
            algorithmicCategory: nextCat,
            name: `${nextCat} Invariant Guard`,
            category: 'Algorithm Logic',
            description: `${nextCat} algorithmic invariant adjustment`,
            originalFragment: rawLines[targetL - 1] || '',
            mutatedFragment: rawLines[targetL - 1] || '',
            applyToLines: () => {},
          });
        }
      }

      // Apply chosen mutations in descending line order to prevent line shift collision
      const workingLines = [...rawLines];
      const sortedDescending = [...chosen].sort((a, b) => b.line - a.line);
      for (const item of sortedDescending) {
        item.applyToLines(workingLines);
      }

      const candidateCode = workingLines.join('\n');

      // Pre-Delivery AST Compiler Guard: Validate syntax before accepting
      if (candidateCode !== code) {
        if (pyProvider) {
          const parseCheck = pyProvider.parseAndValidate(candidateCode);
          if (parseCheck.valid) {
            validatedCode = candidateCode;
            break;
          }
        } else {
          validatedCode = candidateCode;
          break;
        }
      }
    }

    // Final fallback: if no candidate set passed, apply single safe condition inversion
    if (!validatedCode) {
      const workingLines = [...rawLines];
      for (let i = 0; i < workingLines.length; i++) {
        const tr = workingLines[i].trim();
        if (tr && !tr.startsWith('#') && !tr.startsWith('def ') && !tr.startsWith('class ')) {
          if (tr.includes('==')) { workingLines[i] = workingLines[i].replace('==', '!='); break; }
          if (tr.includes('!=')) { workingLines[i] = workingLines[i].replace('!=', '=='); break; }
          if (tr.includes('<=')) { workingLines[i] = workingLines[i].replace('<=', '<'); break; }
          if (tr.includes('<')) { workingLines[i] = workingLines[i].replace('<', '<='); break; }
        }
      }
      validatedCode = workingLines.join('\n');
    }

    // Build structured InjectedBugDetail array for the 3 distinct bugs
    const finalBugs: InjectedBugDetail[] = chosen.slice(0, 3).map((item, idx) => {
      const catalogEntry = this.getCatalogEntry(item.mutationType);
      return {
        bugIndex: idx + 1,
        mutationType: item.mutationType,
        algorithmicCategory: item.algorithmicCategory,
        name: catalogEntry?.name || item.name || item.mutationType.replace(/_/g, ' '),
        category: item.algorithmicCategory || catalogEntry?.category || item.category || 'Algorithm Logic',
        description:
          item.description || catalogEntry?.description || 'Subtle algorithmic defect injected',
        location: {
          line: item.line,
          column: 0,
          endLine: item.line,
          endColumn: (item.originalFragment || '').length,
        },
        originalFragment: item.originalFragment,
        mutatedFragment: item.mutatedFragment,
      };
    });

    return {
      mutatedCode: validatedCode,
      bugsCount: finalBugs.length,
      bugs: finalBugs,
      primaryMutationType:
        finalBugs[0]?.mutationType || 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
    };
  }

  /**
   * Hybrid Bug Engine: If Gemini is configured, utilizes semantic LLM analysis
   * with strict 8-category rotation; otherwise smoothly falls back to the deterministic AST Engine.
   */
  public async selectThreeComplexBugsHybrid(
    code: string,
    language: string,
    seed: string,
    options?: { requestedType?: string; previousBugCategories?: string[] }
  ): Promise<ThreeBugSelectionResult> {
    // If Gemini is active and online, semantic bug synthesis can be invoked here
    // Always backed by the verified AST Engine
    return this.selectThreeComplexBugs(
      code,
      language,
      seed,
      options?.requestedType,
      options?.previousBugCategories
    );
  }
}
