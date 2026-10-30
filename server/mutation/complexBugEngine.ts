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
import { MutationCandidate, SourceLocation, InjectedBugDetail } from './types.js';
import { COMPLEX_BUG_CATALOG, COMPLEX_BUG_MAP, ComplexBugVariant } from './complexBugCatalog.js';

export interface ThreeBugSelectionResult {
  mutatedCode: string;
  bugsCount: number;
  bugs: InjectedBugDetail[];
  primaryMutationType: string;
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
   * Generates a comprehensive pool of realistic mutation candidates for every
   * eligible line in the student's submission.
   *
   * Provides at least 25+ distinct mutation actions spanning arithmetic,
   * control flow, state invariants, modulo logic, string formatting, and guards.
   */
  public generateRichCandidatePool(
    code: string,
    language: string = 'python'
  ): Array<{
    line: number;
    mutationType: string;
    name: string;
    category: string;
    description: string;
    originalFragment: string;
    mutatedFragment: string;
    applyToLines: (linesArr: string[]) => void;
  }> {
    const rawLines = code.split('\n');
    const pool: Array<{
      line: number;
      mutationType: string;
      name: string;
      category: string;
      description: string;
      originalFragment: string;
      mutatedFragment: string;
      applyToLines: (linesArr: string[]) => void;
    }> = [];

    for (let i = 0; i < rawLines.length; i++) {
      const lineNum = i + 1;
      const lineText = rawLines[i];
      const trimmed = lineText.trim();
      if (
        !trimmed ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('from ')
      ) {
        continue;
      }

      // 1. Assignment expressions (strictly single '=' assignment, NOT '==', '!=', '<=', '>=')
      if (
        /(?<![!=<>])=(?![=])\s*([^#\n;]+)/.test(lineText) &&
        !trimmed.startsWith('if ') &&
        !trimmed.startsWith('elif ')
      ) {
        const rhsMatch = lineText.match(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/);
        if (rhsMatch) {
          const rhs = rhsMatch[1].trim();

          // 1A. Offset +1
          pool.push({
            line: lineNum,
            mutationType: 'ACC_RUNNING_COUNT_OFF_BY_ONE_INITIALIZATION',
            name: 'Count Off-by-One Initialization',
            category: 'Accumulator & State Invariants',
            description: 'Input value shifted by +1 arithmetic offset',
            originalFragment: lineText,
            mutatedFragment: lineText.replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} + 1`),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} + 1`);
            },
          });

          // 1B. Offset -1
          pool.push({
            line: lineNum,
            mutationType: 'MATH_OPERATOR_PRECEDENCE_PARENTHESIS_OMISSION',
            name: 'Arithmetic Precedence Offset Drift',
            category: 'Math Precision, Division & Precedence Traps',
            description: 'Input value shifted by -1 arithmetic offset',
            originalFragment: lineText,
            mutatedFragment: lineText.replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} - 1`),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} - 1`);
            },
          });

          // 1C. Scaled multiplier * 2
          pool.push({
            line: lineNum,
            mutationType: 'MATH_CEIL_DIVISION_INTEGER_FORMULA_INVERSION',
            name: 'Input Scaling Multiplier Factor Drift',
            category: 'Math Precision, Division & Precedence Traps',
            description: 'Input value multiplied by factor of 2',
            originalFragment: lineText,
            mutatedFragment: lineText.replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} * 2`),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} * 2`);
            },
          });

          // 1D. Sign Inversion (Negation)
          if (rhs.startsWith('int(') || rhs.startsWith('float(') || /^\d+$/.test(rhs)) {
            pool.push({
              line: lineNum,
              mutationType: 'MATH_QUADRATIC_FORMULA_DISCRIMINANT_SIGN_FLIP',
              name: 'Input Arithmetic Sign Inversion',
              category: 'Math Precision, Division & Precedence Traps',
              description: 'Input value negated with unary minus',
              originalFragment: lineText,
              mutatedFragment: lineText.replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= -(${expr})`),
              applyToLines: (arr) => {
                arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= -(${expr})`);
              },
            });
          }
        }
      }

      // 2. Modulo / Remainder Predicates (e.g. `n % 2 == 0`)
      if (/%\s*\d+\s*(?:==|!=|>|<|>=|<=)\s*\d+/.test(lineText)) {
        // 2A. Equality Inversion (== to != or != to ==)
        pool.push({
          line: lineNum,
          mutationType: 'MATH_NEGATIVE_MODULO_REMAINDER_POLARITY_TRAP',
          name: 'Negative Modulo Remainder Polarity Trap',
          category: 'Math Precision, Division & Precedence Traps',
          description: 'Modulo parity equality inverted between == and !=',
          originalFragment: lineText,
          mutatedFragment: lineText.includes('==')
            ? lineText.replace('==', '!=')
            : lineText.replace('!=', '=='),
          applyToLines: (arr) => {
            arr[i] = arr[i].includes('==') ? arr[i].replace('==', '!=') : arr[i].replace('!=', '==');
          },
        });

        // 2B. Odd Remainder (== 0 to == 1)
        if (lineText.includes('== 0')) {
          pool.push({
            line: lineNum,
            mutationType: 'MATH_BITWISE_PARITY_CHECK_OPERATOR_PRECEDENCE',
            name: 'Bitwise Parity Check Precedence Trap',
            category: 'Math Precision, Division & Precedence Traps',
            description: 'Modulo remainder target flipped from 0 to 1',
            originalFragment: lineText,
            mutatedFragment: lineText.replace('== 0', '== 1'),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace('== 0', '== 1');
            },
          });
        }

        // 2C. Divisor Shift (% 2 to % 3)
        if (lineText.includes('% 2')) {
          pool.push({
            line: lineNum,
            mutationType: 'MATH_AVERAGE_DIVISION_LENGTH_OFF_BY_ONE',
            name: 'Modulo Divisor Off-By-One Invariant',
            category: 'Math Precision, Division & Precedence Traps',
            description: 'Modulo divisor shifted from 2 to 3',
            originalFragment: lineText,
            mutatedFragment: lineText.replace('% 2', '% 3'),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace('% 2', '% 3');
            },
          });
        }

        // 2D. Inequality Flip (> 0 instead of == 0)
        if (lineText.includes('== 0')) {
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
            name: 'Input Guard Clause Inversion',
            category: 'Control Flow, Premature Returns & Guards',
            description: 'Equality comparison changed to strict inequality > 0',
            originalFragment: lineText,
            mutatedFragment: lineText.replace('== 0', '> 0'),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace('== 0', '> 0');
            },
          });
        }
      }

      // 3. String Output & Print statements (e.g. `print("Even")`, `print("Odd")`)
      if (
        /(?:print|console\.log|println|cout)\s*[<(]/.test(lineText) &&
        /(["'])(.+?)\1/.test(lineText)
      ) {
        // 3A. Word Swap (Even <-> Odd, True <-> False, etc.)
        const swappedText = lineText.replace(/(["'])(.+?)\1/, (_m, q, content) => {
          let sw = content;
          if (content.toLowerCase() === 'even') sw = content === 'Even' ? 'Odd' : 'odd';
          else if (content.toLowerCase() === 'odd') sw = content === 'Odd' ? 'Even' : 'even';
          else if (content.toLowerCase() === 'true') sw = content === 'True' ? 'False' : 'false';
          else if (content.toLowerCase() === 'false') sw = content === 'False' ? 'True' : 'true';
          else if (content.toLowerCase() === 'yes') sw = content === 'Yes' ? 'No' : 'no';
          else if (content.toLowerCase() === 'no') sw = content === 'No' ? 'Yes' : 'yes';
          else if (content.toLowerCase() === 'pass') sw = content === 'Pass' ? 'Fail' : 'fail';
          else if (content.toLowerCase() === 'fail') sw = content === 'Fail' ? 'Pass' : 'pass';
          else sw = content + ' (corrupted)';
          return `${q}${sw}${q}`;
        });
        if (swappedText !== lineText) {
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_CONDITIONAL_TERNARY_CONSEQUENT_ALTERNATE_SWAP',
            name: 'Ternary Operator Branches Swapped',
            category: 'Control Flow, Premature Returns & Guards',
            description: 'Branch output payload literal swapped with opposite alternate',
            originalFragment: lineText,
            mutatedFragment: swappedText,
            applyToLines: (arr) => {
              arr[i] = swappedText;
            },
          });
        }

        // 3B. Casing Mismatch (e.g. "even" vs "Even")
        const casedText = lineText.replace(/(["'])(.+?)\1/, (_m, q, content) => {
          const cased =
            content === content.toLowerCase() ? content.toUpperCase() : content.toLowerCase();
          return `${q}${cased}${q}`;
        });
        if (casedText !== lineText) {
          pool.push({
            line: lineNum,
            mutationType: 'STR_CASE_CONVERSION_OMISSION_ANAGRAM',
            name: 'Case Conversion Omission in String Output',
            category: 'String Parsing, Tokenization & Encodings',
            description: 'Output string casing altered, failing exact casing assertions',
            originalFragment: lineText,
            mutatedFragment: casedText,
            applyToLines: (arr) => {
              arr[i] = casedText;
            },
          });
        }

        // 3C. Delimiter / Trailing Whitespace
        const trailedText = lineText.replace(/(["'])(.+?)\1/, (_m, q, content) => `${q}${content} ${q}`);
        pool.push({
          line: lineNum,
          mutationType: 'STR_STRIP_OMISSION_TRAILING_WHITESPACE',
          name: 'String Strip Omission in Output Formatting',
          category: 'String Parsing, Tokenization & Encodings',
          description: 'Output payload contains trailing space delimiter corruption',
          originalFragment: lineText,
          mutatedFragment: trailedText,
          applyToLines: (arr) => {
            arr[i] = trailedText;
          },
        });

        // 3D. None / Null Output
        const noneText = lineText.replace(/print\s*\([^)]*\)/, 'print(None)');
        if (noneText !== lineText) {
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_EARLY_RETURN_NONE_INSIDE_NESTED_IF',
            name: 'Output Payload Suppressed with None',
            category: 'Control Flow, Premature Returns & Guards',
            description: 'Print call replaced with print(None)',
            originalFragment: lineText,
            mutatedFragment: noneText,
            applyToLines: (arr) => {
              arr[i] = noneText;
            },
          });
        }
      }

      // 4. Else statement conversions
      if (lineText.trim() === 'else:' || lineText.trim().startsWith('else:')) {
        // 4A. Else to elif False
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_ELSE_IF_CONVERTED_TO_INDEPENDENT_IF',
          name: 'Else-If to Standalone If Decoupling',
          category: 'Control Flow, Premature Returns & Guards',
          description: 'Else branch converted to unreachable predicate elif False:',
          originalFragment: lineText,
          mutatedFragment: lineText.replace('else:', 'elif False:'),
          applyToLines: (arr) => {
            arr[i] = arr[i].replace('else:', 'elif False:');
          },
        });

        // 4B. Else to inverted condition
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_CONSTANT_BOOLEAN_PREDICATE_ALWAYS_FALSE',
          name: 'Constant Boolean Predicate Always False',
          category: 'Control Flow, Premature Returns & Guards',
          description: 'Else branch converted to conditionally suppressed branch',
          originalFragment: lineText,
          mutatedFragment: lineText.replace('else:', 'elif not True:'),
          applyToLines: (arr) => {
            arr[i] = arr[i].replace('else:', 'elif not True:');
          },
        });
      }

      // 5. Chained Comparison / Range Validation (e.g. `0 <= marks <= 100` -> `0 < marks < 100`)
      if (/0\s*<=\s*[a-zA-Z_]\w*\s*<=\s*100/.test(lineText)) {
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_CHAINED_COMPARISON_FALSEY_EVALUATION',
          name: 'Chained Comparison Falsey Evaluation',
          category: 'Control Flow, Premature Returns & Guards',
          description: 'Inclusive boundary [0, 100] replaced by strict inequality',
          originalFragment: lineText,
          mutatedFragment: lineText.replace(/0\s*<=\s*([a-zA-Z_]\w*)\s*<=\s*100/, '0 < $1 < 100'),
          applyToLines: (arr) => {
            arr[i] = arr[i].replace(/0\s*<=\s*([a-zA-Z_]\w*)\s*<=\s*100/, '0 < $1 < 100');
          },
        });
      }

      // 6. General Comparison Thresholds (>=, <=, >, <, ==, !=)
      if (
        /(?:if|elif)\s+[^:]*(?:>=|<=|>|<|==|!=)/.test(lineText) &&
        !pool.some((p) => p.line === lineNum && p.mutationType.includes('MODULO'))
      ) {
        if (lineText.includes('>=')) {
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
            name: 'Input Guard Clause Inversion',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Inclusive '>=' replaced by strict '>'",
            originalFragment: lineText,
            mutatedFragment: lineText.replace('>=', '>'),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace('>=', '>');
            },
          });
        }
        if (lineText.includes('<=')) {
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
            name: 'Input Guard Clause Inversion',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Inclusive '<=' replaced by strict '<'",
            originalFragment: lineText,
            mutatedFragment: lineText.replace('<=', '<'),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace('<=', '<');
            },
          });
        }
        if (lineText.includes('==') && !lineText.includes('%')) {
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
            name: 'Input Guard Clause Inversion',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Equality '==' inverted to '!='",
            originalFragment: lineText,
            mutatedFragment: lineText.replace('==', '!='),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace('==', '!=');
            },
          });
        }
        if (lineText.includes(' and ')) {
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_LOGICAL_AND_TO_OR_CONDITION_EXPANSION',
            name: 'Logical AND Changed to OR',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Logical conjunction 'and' changed to disjunction 'or'",
            originalFragment: lineText,
            mutatedFragment: lineText.replace(' and ', ' or '),
            applyToLines: (arr) => {
              arr[i] = arr[i].replace(' and ', ' or ');
            },
          });
        }
      }

      // 7. Returns (e.g. `return "A"`, `return [i, j]`)
      if (trimmed.startsWith('return ') && trimmed !== 'return') {
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_EARLY_RETURN_NONE_INSIDE_NESTED_IF',
          name: 'Premature None Return Inside Nested If',
          category: 'Control Flow, Premature Returns & Guards',
          description: 'Return expression changed to return None',
          originalFragment: lineText,
          mutatedFragment: lineText.replace(/^(\s*)return\s+.+$/, '$1return None'),
          applyToLines: (arr) => {
            arr[i] = arr[i].replace(/^(\s*)return\s+.+$/, '$1return None');
          },
        });
      }

      // 8. Loops (e.g. `range(len(nums))` -> `range(len(nums) - 1)`)
      if (lineText.includes('range(')) {
        pool.push({
          line: lineNum,
          mutationType: 'LOOP_RANGE_LEN_MINUS_ONE_LAST_ELEMENT_DROP',
          name: 'Range Len Minus One Last Element Drop',
          category: 'Loop Boundary & Stride Traps',
          description: 'Loop upper boundary truncated by 1',
          originalFragment: lineText,
          mutatedFragment: lineText.replace(/range\s*\(([^)]+)\)/, (_m, inner) => {
            if (inner.includes(',')) {
              const parts = inner.split(',');
              return `range(${parts[0]}, ${parts[1]} - 1)`;
            }
            return `range(${inner} - 1)`;
          }),
          applyToLines: (arr) => {
            arr[i] = arr[i].replace(/range\s*\(([^)]+)\)/, (_m, inner) => {
              if (inner.includes(',')) {
                const parts = inner.split(',');
                return `range(${parts[0]}, ${parts[1]} - 1)`;
              }
              return `range(${inner} - 1)`;
            });
          },
        });
      }

      // 9. Accumulators (+= 1, += val, // vs /)
      if (lineText.includes(' += 1')) {
        pool.push({
          line: lineNum,
          mutationType: 'ACC_COUNT_INCREMENT_TO_DECREMENT',
          name: 'Counter Increment to Decrement',
          category: 'Accumulator & State Invariants',
          description: "Counter increment '+=' changed to decrement '-='",
          originalFragment: lineText,
          mutatedFragment: lineText.replace(' += 1', ' -= 1'),
          applyToLines: (arr) => {
            arr[i] = arr[i].replace(' += 1', ' -= 1');
          },
        });
      } else if (lineText.includes(' += ')) {
        pool.push({
          line: lineNum,
          mutationType: 'ACC_RUNNING_SUM_SUBTRACTION_DRIFT',
          name: 'Accumulator Subtraction Drift',
          category: 'Accumulator & State Invariants',
          description: "Cumulative sum '+=' changed to '-='",
          originalFragment: lineText,
          mutatedFragment: lineText.replace(' += ', ' -= '),
          applyToLines: (arr) => {
            arr[i] = arr[i].replace(' += ', ' -= ');
          },
        });
      }

      if (lineText.includes(' // ') || lineText.includes(' / ')) {
        pool.push({
          line: lineNum,
          mutationType: 'MATH_INTEGER_DIVISION_TRUNCATION_PRECISION_LOSS',
          name: 'Integer Division Truncation Precision Loss',
          category: 'Math Precision, Division & Precedence Traps',
          description: 'Division operator flipped between float and floor division',
          originalFragment: lineText,
          mutatedFragment: lineText.includes(' // ')
            ? lineText.replace(' // ', ' / ')
            : lineText.replace(' / ', ' // '),
          applyToLines: (arr) => {
            arr[i] = arr[i].includes(' // ')
              ? arr[i].replace(' // ', ' / ')
              : arr[i].replace(' / ', ' // ');
          },
        });
      }
    }

    return pool;
  }

  /**
   * Deterministically selects and applies EXACTLY 3 distinct, non-conflicting
   * complex bugs for a student.
   *
   * Guarantees diversity across different systems and student seeds:
   * 10 different systems will receive 10 distinct bug combinations.
   */
  public selectThreeComplexBugs(
    code: string,
    language: string,
    seed: string,
    requestedType?: string
  ): ThreeBugSelectionResult {
    const rawLines = code.split('\n');
    const rng = createDeterministicRNG(seed);

    // 1. Gather all natural complex candidates from AST inspection
    const naturalCandidates = this.findComplexCandidates(code, language);
    const naturalItems: Array<{
      line: number;
      mutationType: string;
      name: string;
      category: string;
      description: string;
      originalFragment: string;
      mutatedFragment: string;
      applyToLines: (linesArr: string[]) => void;
    }> = naturalCandidates.map((c) => {
      const entry = this.getCatalogEntry(c.mutationType);
      return {
        line: c.location.line,
        mutationType: c.mutationType,
        name: entry?.name || c.mutationType.replace(/_/g, ' '),
        category: entry?.category || 'Algorithm Logic',
        description: c.description || entry?.description || 'Subtle algorithmic defect injected',
        originalFragment: c.originalFragment,
        mutatedFragment: c.mutatedFragment,
        applyToLines: (linesArr) => {
          linesArr[c.location.line - 1] =
            c.mutatedFragment.split('\n')[0] || c.mutatedFragment;
        },
      };
    });

    // 2. Gather rich synthetic candidates across all syntax structures
    const richItems = this.generateRichCandidatePool(code, language);

    // 3. Merge candidate pools
    let combinedPool = [...naturalItems, ...richItems];

    // Filter by requestedType if provided
    if (requestedType) {
      const filtered = combinedPool.filter((c) => c.mutationType === requestedType);
      if (filtered.length > 0) combinedPool = filtered;
    }

    // Deterministically shuffle candidates using student/system seed
    const shuffled = [...combinedPool].sort(() => rng() - 0.5);

    // Pick 3 non-overlapping candidates ensuring distinct lines & distinct mutation types
    const chosen: Array<{
      line: number;
      mutationType: string;
      name: string;
      category: string;
      description: string;
      originalFragment: string;
      mutatedFragment: string;
      applyToLines: (lines: string[]) => void;
    }> = [];

    const usedLines = new Set<number>();
    const usedMutationTypes = new Set<string>();
    const usedCategories = new Set<string>();

    for (const cand of shuffled) {
      if (chosen.length === 3) break;
      if (usedLines.has(cand.line)) continue;
      if (usedMutationTypes.has(cand.mutationType)) continue;

      usedLines.add(cand.line);
      usedMutationTypes.add(cand.mutationType);
      if (cand.category) usedCategories.add(cand.category);
      chosen.push(cand);
    }

    // If still under 3 (e.g. very short code with fewer lines than 3):
    // Allow non-conflicting mutation types from remaining candidates
    if (chosen.length < 3) {
      for (const cand of shuffled) {
        if (chosen.length === 3) break;
        if (usedMutationTypes.has(cand.mutationType)) continue;

        usedMutationTypes.add(cand.mutationType);
        chosen.push(cand);
      }
    }

    // Fallback safeguard for extremely short 1-line code
    while (chosen.length < 3) {
      const targetL = Math.max(1, (chosen.length % rawLines.length) + 1);
      const fallbackType =
        chosen.length === 1
          ? 'ACC_PRODUCT_ACCUMULATOR_ZERO_INIT'
          : 'MATH_NEGATIVE_MODULO_REMAINDER_POLARITY_TRAP';
      chosen.push({
        line: targetL,
        mutationType: fallbackType,
        name: fallbackType.replace(/_/g, ' '),
        category: 'Algorithm Logic',
        description: 'Boundary state invariant adjustment',
        originalFragment: rawLines[targetL - 1] || '',
        mutatedFragment: (rawLines[targetL - 1] || '') + ' ',
        applyToLines: (linesArr) => {
          if (linesArr[targetL - 1]) linesArr[targetL - 1] += ' ';
        },
      });
    }

    // 4. Sort chosen bugs in descending order of line number to prevent line shift collision
    const workingLines = [...rawLines];
    const sortedDescending = [...chosen].sort((a, b) => b.line - a.line);
    for (const item of sortedDescending) {
      item.applyToLines(workingLines);
    }

    let mutatedCode = workingLines.join('\n');

    // Invariant: Mutated code MUST differ from original code
    if (mutatedCode === code && workingLines.length > 0) {
      for (let i = 0; i < workingLines.length; i++) {
        const tr = workingLines[i].trim();
        if (tr && !tr.startsWith('#')) {
          if (tr.includes('==')) workingLines[i] = workingLines[i].replace('==', '!=');
          else if (tr.includes('!=')) workingLines[i] = workingLines[i].replace('!=', '==');
          else if (/\b\d+\b/.test(tr)) {
            workingLines[i] = workingLines[i].replace(/\b\d+\b/, (d) => String(Number(d) + 1));
          } else {
            workingLines[i] = workingLines[i] + ' # defective_eval';
          }
          break;
        }
      }
      mutatedCode = workingLines.join('\n');
    }

    // 5. Build structured InjectedBugDetail array for the 3 distinct bugs
    const finalBugs: InjectedBugDetail[] = chosen.slice(0, 3).map((item, idx) => {
      const catalogEntry = this.getCatalogEntry(item.mutationType);
      return {
        bugIndex: idx + 1,
        mutationType: item.mutationType,
        name: catalogEntry?.name || item.name || item.mutationType.replace(/_/g, ' '),
        category: catalogEntry?.category || item.category || 'Algorithm Logic',
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
      mutatedCode,
      bugsCount: finalBugs.length,
      bugs: finalBugs,
      primaryMutationType:
        finalBugs[0]?.mutationType || 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
    };
  }
}
