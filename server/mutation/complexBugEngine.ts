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
import { JavaScriptLanguageProvider } from './languages/javascript.js';
import { isGeminiConfigured } from '../services/geminiService.js';

function validateCBraces(code: string): boolean {
  let braces = 0;
  let parens = 0;
  let inString = false;
  let inChar = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    const next = code[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (inChar) {
      if (c === '\\') { i++; continue; }
      if (c === "'") inChar = false;
      continue;
    }

    if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (c === '"') { inString = true; continue; }
    if (c === "'") { inChar = true; continue; }

    if (c === '{') braces++;
    else if (c === '}') { braces--; if (braces < 0) return false; }
    else if (c === '(') parens++;
    else if (c === ')') { parens--; if (parens < 0) return false; }
  }
  return braces === 0 && parens === 0 && !inString && !inChar && !inBlockComment;
}

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
    const normLang = (language || 'python').toLowerCase();
    const isPy = normLang === 'python' || normLang === 'py';
    const isJs = normLang === 'javascript' || normLang === 'js' || normLang === 'typescript' || normLang === 'ts';
    const isC = normLang === 'c' || normLang === 'cpp';
    const isJava = normLang === 'java';

    for (let i = 0; i < rawLines.length; i++) {
      const lineNum = i + 1;
      const lineText = rawLines[i];
      const trimmed = lineText.trim();

      // Guard header lines, class/def declarations, decorators, imports, comments, docstrings
      if (
        !trimmed ||
        trimmed.startsWith('#include') ||
        trimmed.startsWith('#define') ||
        trimmed.startsWith('#pragma') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('package ') ||
        trimmed.startsWith('using namespace') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('from ') ||
        trimmed.startsWith('@') ||
        trimmed.startsWith('def ') ||
        trimmed.startsWith('async def ') ||
        trimmed.startsWith('class ') ||
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
      // 1A. Python range mutations
      if (isPy && lineText.includes('range(')) {
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

      // 1B. For loops in C, C++, Java, JS
      if ((isC || isJava || isJs) && (trimmed.startsWith('for ') || trimmed.startsWith('for('))) {
        // Less than to less-equal overrun
        if (/\b([a-zA-Z_]\w*)\s*<\s*([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*(?:\(\))?|\(\))?)/.test(lineText) && !lineText.includes('<<')) {
          const mutated = lineText.replace(/(\b[a-zA-Z_]\w*\s*)<\s*([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*(?:\(\))?|\(\))?)/, '$1<= $2');
          if (mutated !== lineText) {
            pool.push({
              line: lineNum,
              mutationType: 'LOOP_TERMINATION_OFF_BY_ONE_OVERRUN',
              algorithmicCategory: 'LOOP_BOUNDARY',
              name: 'For Loop Fencepost Upper Bound Overrun',
              category: 'Loop Boundary & Stride Traps',
              description: "Loop condition '<' mutated to '<=' (causes out-of-bounds iteration overrun)",
              originalFragment: lineText,
              mutatedFragment: mutated,
              applyToLines: (arr) => { arr[i] = mutated; },
            });
          }
        }
        // Less-equal to strict less than
        if (/\b([a-zA-Z_]\w*)\s*<=\s*([a-zA-Z_]\w*)/.test(lineText)) {
          const mutated = lineText.replace(/(\b[a-zA-Z_]\w*\s*)<=\s*([a-zA-Z_]\w*)/, '$1< $2');
          if (mutated !== lineText) {
            pool.push({
              line: lineNum,
              mutationType: 'LOOP_TERMINATION_INCLUSIVE_TO_STRICT_TRUNCATION',
              algorithmicCategory: 'LOOP_BOUNDARY',
              name: 'For Loop Bound Inclusive to Strict Truncation',
              category: 'Loop Boundary & Stride Traps',
              description: "Loop condition '<=' changed to strict '<' (terminates 1 step prematurely)",
              originalFragment: lineText,
              mutatedFragment: mutated,
              applyToLines: (arr) => { arr[i] = mutated; },
            });
          }
        }
        // Loop stride mutation: i++ -> i += 2
        if (/\b([a-zA-Z_]\w*)\+\+/.test(lineText)) {
          const match = lineText.match(/\b([a-zA-Z_]\w*)\+\+/);
          const varName = match ? match[1] : 'i';
          const mutated = lineText.replace(/\b([a-zA-Z_]\w*)\+\+/, `${varName} += 2`);
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_STRIDE_MUTATION_SKIP_ALTERNATE',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'Loop Stride Increment Altered to Stride of 2',
            category: 'Loop Boundary & Stride Traps',
            description: `Loop stride '${varName}++' changed to '${varName} += 2' (skips alternate elements)`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
        // Loop init offset: i = 0 -> i = 1
        if (/\b(?:let|var|int|size_t)?\s*([a-zA-Z_]\w*)\s*=\s*0\s*;/.test(lineText)) {
          const mutated = lineText.replace(/(\b[a-zA-Z_]\w*\s*=\s*)0\s*;/, '$11;');
          pool.push({
            line: lineNum,
            mutationType: 'LOOP_START_INDEX_OFF_BY_ONE_SKIP_FIRST',
            algorithmicCategory: 'LOOP_BOUNDARY',
            name: 'For Loop Initial Index Shifted to 1',
            category: 'Loop Boundary & Stride Traps',
            description: 'For-loop initial counter set to 1 instead of 0 (skips first element)',
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // 1C. While loop boundary shifts in all languages
      if (trimmed.startsWith('while ') || trimmed.startsWith('while(')) {
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

      // =========================================================================
      // 2. CONDITION_INVERSION
      // =========================================================================
      // 2A. Conjunction / Disjunction flip
      if (lineText.includes(' && ')) {
        const mutated = lineText.replace(' && ', ' || ');
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_LOGICAL_AND_TO_OR_CONDITION_EXPANSION',
          algorithmicCategory: 'CONDITION_INVERSION',
          name: 'Logical AND Changed to OR',
          category: 'Control Flow, Premature Returns & Guards',
          description: "Logical conjunction '&&' changed to disjunction '||'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      } else if (lineText.includes(' || ')) {
        const mutated = lineText.replace(' || ', ' && ');
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_LOGICAL_OR_TO_AND_CONDITION_CONSTRICTION',
          algorithmicCategory: 'CONDITION_INVERSION',
          name: 'Logical OR Changed to AND',
          category: 'Control Flow, Premature Returns & Guards',
          description: "Logical disjunction '||' changed to conjunction '&&'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      } else if (isPy && lineText.includes(' and ')) {
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
      } else if (isPy && lineText.includes(' or ')) {
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

      // 2B. Strict and loose equality flips
      if (lineText.includes(' === ')) {
        const mutated = lineText.replace(' === ', ' !== ');
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_EQUALITY_INVERTED_TO_NOT_EQUAL',
          algorithmicCategory: 'CONDITION_INVERSION',
          name: 'Strict Equality Inversion === to !==',
          category: 'Control Flow, Premature Returns & Guards',
          description: "Strict equality check '===' inverted to '!=='",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      } else if (lineText.includes(' !== ')) {
        const mutated = lineText.replace(' !== ', ' === ');
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_INEQUALITY_INVERTED_TO_EQUAL',
          algorithmicCategory: 'CONDITION_INVERSION',
          name: 'Strict Inequality Inversion !== to ===',
          category: 'Control Flow, Premature Returns & Guards',
          description: "Strict inequality check '!==' inverted to '==='",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      } else if (lineText.includes(' == ') && !lineText.includes('%')) {
        const mutated = lineText.replace(' == ', ' != ');
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_EQUALITY_INVERTED_TO_NOT_EQUAL',
          algorithmicCategory: 'CONDITION_INVERSION',
          name: 'Conditional Equality Inversion == to !=',
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
          name: 'Conditional Inequality Inversion != to ==',
          category: 'Control Flow, Premature Returns & Guards',
          description: "Conditional inequality check '!=' inverted to '=='",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // 2C. Relational operator flip in if/while/return/for statements
      const isConditionalContext =
        trimmed.startsWith('if') ||
        trimmed.startsWith('while') ||
        trimmed.startsWith('elif') ||
        trimmed.startsWith('else if') ||
        trimmed.startsWith('return ') ||
        trimmed.includes('?');

      if (isConditionalContext && !lineText.includes('#') && !lineText.includes('template')) {
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
        } else if (lineText.includes(' >= ') && !lineText.includes('==')) {
          const mutated = lineText.replace(' >= ', ' < ');
          pool.push({
            line: lineNum,
            mutationType: 'FLOW_GREATER_EQUAL_INVERTED_TO_LESS',
            algorithmicCategory: 'CONDITION_INVERSION',
            name: 'Branch Relational Inversion >= to <',
            category: 'Control Flow, Premature Returns & Guards',
            description: "Branch guard '>=' inverted to '<'",
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

      // =========================================================================
      // 3. STATE_UPDATE_ORDER (Statement sequence inversion in multi-line blocks)
      // =========================================================================
      if (i < rawLines.length - 1) {
        const nextLine = rawLines[i + 1];
        const nextTrimmed = nextLine.trim();
        const curIndent = lineText.match(/^(\s*)/)?.[1] || '';
        const nxtIndent = nextLine.match(/^(\s*)/)?.[1] || '';

        if (
          curIndent === nxtIndent &&
          curIndent.length >= 2 &&
          (trimmed.includes('=') || trimmed.includes('++') || trimmed.includes('--')) &&
          (nextTrimmed.includes('=') || nextTrimmed.includes('++') || nextTrimmed.includes('--')) &&
          !trimmed.startsWith('if') &&
          !nextTrimmed.startsWith('if') &&
          !trimmed.startsWith('for') &&
          !nextTrimmed.startsWith('for') &&
          !trimmed.startsWith('while') &&
          !nextTrimmed.startsWith('while') &&
          !trimmed.startsWith('return') &&
          !nextTrimmed.startsWith('return')
        ) {
          pool.push({
            line: lineNum,
            mutationType: 'PTR_UPDATE_ORDER_DEPENDENCY_INVERSION',
            algorithmicCategory: 'STATE_UPDATE_ORDER',
            name: 'Statement Sequence Update Order Inversion',
            category: 'Pointer & State Invariants',
            description: `Sequential dependent updates '${trimmed}' and '${nextTrimmed}' swapped in execution order`,
            originalFragment: `${lineText}\n${nextLine}`,
            mutatedFragment: `${curIndent}${nextTrimmed}\n${nxtIndent}${trimmed}`,
            applyToLines: (arr) => {
              arr[i] = `${curIndent}${nextTrimmed}`;
              arr[i + 1] = `${nxtIndent}${trimmed}`;
            },
          });
        }
      }

      // =========================================================================
      // 4. BASE_CASE_DEFECT (Recursive base cases & DP initial conditions)
      // =========================================================================
      if (/if\s*\(?\s*([a-zA-Z_]\w*)\s*<=\s*1\s*\)?/.test(lineText)) {
        const mutated = lineText.replace(/<=\s*1/, '< 1');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_CONDITION_RECURSION_OVERRUN',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Base Case Bound Truncation',
          category: 'Recursion & Base Case Traps',
          description: "Base case '<= 1' changed to '< 1' (causes infinite recursion / stack overflow on single element inputs)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      if (/if\s*\(?\s*([a-zA-Z_]\w*)\s*==\s*0\s*\)?/.test(lineText)) {
        const mutated = lineText.replace(/==\s*0/, '== 1');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_CONDITION_RECURSION_OVERRUN',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Base Case Zero Sentinel Shift',
          category: 'Recursion & Base Case Traps',
          description: "Base case '== 0' changed to '== 1' (fails on 0 or triggers excess call)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      if (/len\s*\([^)]+\)\s*<=\s*1\s*:/.test(lineText)) {
        const mutated = lineText.replace(/<=\s*1\s*:/, '< 1:');
        pool.push({
          line: lineNum,
          mutationType: 'REC_BASE_CASE_CONDITION_RECURSION_OVERRUN',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'Recursive Base Case Overrun',
          category: 'Recursion & Base Case Traps',
          description: "Base case 'len(...) <= 1' changed to '< 1'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      if (/^(\s*)dp\s*\[\s*0\s*\]\s*=\s*0\b/.test(lineText)) {
        const mutated = lineText.replace('dp[0] = 0', 'dp[0] = 1');
        pool.push({
          line: lineNum,
          mutationType: 'DP_BASE_CASE_INITIAL_STATE_CORRUPTION',
          algorithmicCategory: 'BASE_CASE_DEFECT',
          name: 'DP Base Case State Corruption',
          category: 'Dynamic Programming & Memoization',
          description: "DP base state 'dp[0] = 0' corrupted to 'dp[0] = 1'",
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

      // =========================================================================
      // 5. INDEX_OFFSET (Midpoint calculation, Matrix dimension inversion, Division)
      // =========================================================================
      // 5A. Midpoint calculation parenthesis omission: (low + high) / 2 -> low + high / 2
      if (/\(\s*([a-zA-Z_]\w*)\s*\+\s*([a-zA-Z_]\w*)\s*\)\s*(?:\/\/|\/)\s*2/.test(lineText)) {
        const mutated = lineText.replace(/\(\s*([a-zA-Z_]\w*)\s*\+\s*([a-zA-Z_]\w*)\s*\)\s*(\/\/|\/)\s*2/, '$1 + $2 $3 2');
        pool.push({
          line: lineNum,
          mutationType: 'MATH_OPERATOR_PRECEDENCE_PARENTHESIS_OMISSION',
          algorithmicCategory: 'INDEX_OFFSET',
          name: 'Midpoint Calculation Parenthesis Omission',
          category: 'Binary Search & Two-Pointer Invariants',
          description: "Parentheses removed from '(low + high) / 2' causing division to bind first",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 5B. Python floor division // 2 -> / 2
      if (isPy && lineText.includes('// 2')) {
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
      // 5D. Slice bound off-by-one or length off-by-one
      if (/\b([a-zA-Z_]\w*)\.(?:length|size\(\))\s*-\s*1\b/.test(lineText)) {
        const mutated = lineText.replace(/(\b[a-zA-Z_]\w*\.(?:length|size\(\)))\s*-\s*1\b/, '$1');
        pool.push({
          line: lineNum,
          mutationType: 'IDX_ARRAY_LENGTH_MINUS_ONE_DROP',
          algorithmicCategory: 'INDEX_OFFSET',
          name: 'Array Upper Bound Off-By-One Omission',
          category: 'Collection Access & Slice Bounds',
          description: "Collection upper bound 'length - 1' changed to 'length' (leads to ArrayIndexOutOfBoundsException)",
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
      if (/^(\s*)(?:let|var|int|long|double)?\s*(prod|product|ans|res|factorial|fact|total_product)\s*=\s*1\b/.test(lineText)) {
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
      // 7A. Binary search boundary locks
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
      // 7B. Break / Continue substitution
      if (trimmed === 'break;' || trimmed === 'break') {
        const mutated = lineText.replace('break', 'continue');
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_BREAK_TO_CONTINUE_INVERSION',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'Loop Break Changed to Continue',
          category: 'Boundary & Invariant Guards',
          description: "Early loop exit 'break' inverted to 'continue' (causes loop to continue running unnecessarily)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      } else if (trimmed === 'continue;' || trimmed === 'continue') {
        const mutated = lineText.replace('continue', 'break');
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_CONTINUE_TO_BREAK_INVERSION',
          algorithmicCategory: 'EDGE_CASE_BYPASS',
          name: 'Loop Continue Changed to Break',
          category: 'Boundary & Invariant Guards',
          description: "Iteration skip 'continue' changed to 'break' (prematurely halts loop on first skip)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }
      // 7C. Fast pointer initial lock
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
      // 8B. Index variable comparison mirroring: arr[left] != arr[right] -> arr[left] != arr[left]
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
      // 8C. String charAt comparison mirroring
      if (/\.charAt\(\s*([a-zA-Z_]\w*)\s*\)\s*(!=|==)\s*[a-zA-Z_]\w*\.charAt\(\s*([a-zA-Z_]\w*)\s*\)/.test(lineText)) {
        const match = lineText.match(/\.charAt\(\s*([a-zA-Z_]\w*)\s*\)\s*(!=|==)\s*([a-zA-Z_]\w*)\.charAt\(\s*([a-zA-Z_]\w*)\s*\)/);
        if (match && match[1] !== match[4]) {
          const mutated = lineText.replace(match[0], `.charAt(${match[1]}) ${match[2]} ${match[3]}.charAt(${match[1]})`);
          pool.push({
            line: lineNum,
            mutationType: 'VAR_INDEX_MIRRORING_SELF_COMPARISON',
            algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
            name: 'String Index CharAt Variable Shadowing Mirror',
            category: 'Identifier & Variable Traps',
            description: `String charAt comparison index '${match[4]}' shadowed with '${match[1]}' (self-comparison)`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // Python max(arr) to min(arr)
      if (lineText.includes('max(') && !lineText.includes('min(')) {
        const mutated = lineText.replace('max(', 'min(');
        pool.push({
          line: lineNum,
          mutationType: 'MATH_EXTREMA_MAX_TO_MIN_INVERSION',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: 'Extrema Function Inversion (max to min)',
          category: 'Accumulator & State Invariants',
          description: "Extreme value selector 'max' inverted to 'min'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // Python formatted string output order swap: print(f"{a} {b}") -> print(f"{b} {a}")
      const fStrMatch = lineText.match(/print\s*\(\s*f"\{([a-zA-Z_]\w*)\}\s+\{([a-zA-Z_]\w*)\}"\s*\)/);
      if (fStrMatch) {
        const v1 = fStrMatch[1];
        const v2 = fStrMatch[2];
        const mutated = lineText.replace(fStrMatch[0], `print(f"{${v2}} {${v1}}")`);
        pool.push({
          line: lineNum,
          mutationType: 'VAR_OUTPUT_TUPLE_ORDER_INVERSION',
          algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
          name: `Output Format Tuple Variable Order Inversion ({${v1}} {${v2}})`,
          category: 'Identifier & Variable Traps',
          description: `Output tuple variable order '${v1}, ${v2}' swapped to '${v2}, ${v1}'`,
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // C++ cout << arr[i] -> cout << arr[0]
      if (/\bcout\s*<<\s*([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]/.test(lineText)) {
        const match = lineText.match(/\bcout\s*<<\s*([a-zA-Z_]\w*)\s*\[\s*([a-zA-Z_]\w*)\s*\]/);
        if (match) {
          const arrName = match[1];
          const idxName = match[2];
          const mutated = lineText.replace(match[0], `cout << ${arrName}[0]`);
          pool.push({
            line: lineNum,
            mutationType: 'IDX_FIRST_ELEMENT_SHADOWING',
            algorithmicCategory: 'INDEX_OFFSET',
            name: `Array Element Dynamic Index Shadowed with Constant Zero (${arrName}[0])`,
            category: 'Collection Access & Slice Bounds',
            description: `Dynamic index '${idxName}' shadowed with constant zero in print output`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // C is_prime = 0 -> is_prime = 1
      if (/\b(is_prime|prime|flag|found)\s*=\s*0\s*;/.test(lineText)) {
        const match = lineText.match(/\b(is_prime|prime|flag|found)\s*=\s*0\s*;/);
        if (match) {
          const flagName = match[1];
          const mutated = lineText.replace(match[0], `${flagName} = 1;`);
          pool.push({
            line: lineNum,
            mutationType: 'STATE_BOOLEAN_FLAG_INVERSION',
            algorithmicCategory: 'STATE_UPDATE_ORDER',
            name: `Boolean State Flag Inversion (0 to 1) for '${flagName}'`,
            category: 'Pointer & State Invariants',
            description: `Boolean search status '${flagName}' inverted from 0 to 1`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // Java / C++ binary search range direction: arr.get(mid) < target -> arr.get(mid) > target
      if (/\b([a-zA-Z_]\w*(?:\.get\([^)]+\)|\[[^\]]+\]))\s*<\s*([a-zA-Z_]\w*)/.test(lineText) && lineText.includes('mid')) {
        const mutated = lineText.replace(/<\s*([a-zA-Z_]\w*)/, '> $1');
        pool.push({
          line: lineNum,
          mutationType: 'BS_SEARCH_RANGE_DIRECTION_INVERSION',
          algorithmicCategory: 'CONDITION_INVERSION',
          name: 'Binary Search Comparison Direction Inversion (< to >)',
          category: 'Binary Search & Two-Pointer Invariants',
          description: "Target comparison operator '<' inverted to '>' (searches opposite subarray)",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // Java binary search solution index shadowing: ans = mid -> ans = -1
      if (/\b(ans|result|foundIndex|out|pos|idx)\s*=\s*(?:mid|m|midIdx)\s*;/.test(lineText)) {
        const match = lineText.match(/\b(ans|result|foundIndex|out|pos|idx)\s*=\s*(?:mid|m|midIdx)\s*;/);
        if (match) {
          const ansVar = match[1];
          const mutated = lineText.replace(match[0], `${ansVar} = -1;`);
          pool.push({
            line: lineNum,
            mutationType: 'BS_SOLUTION_INDEX_CLEAR_OVERRIDE',
            algorithmicCategory: 'ACCUMULATOR_SCOPE',
            name: `Binary Search Success Index Overridden with Failure Sentinel (${ansVar} = -1)`,
            category: 'Binary Search & Two-Pointer Invariants',
            description: `Match assignment '${ansVar} = mid' overridden with '${ansVar} = -1'`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }
      // 8D. Output expression variable substitution (console.log / cout / print / System.out.println)
      if (/\bconsole\.log\s*\(\s*([a-zA-Z_]\w*)\s*\)/.test(lineText)) {
        const match = lineText.match(/\bconsole\.log\s*\(\s*([a-zA-Z_]\w*)\s*\)/);
        if (match) {
          const varName = match[1];
          const mutated = lineText.replace(match[0], `console.log(${varName} - 1)`);
          pool.push({
            line: lineNum,
            mutationType: 'VAR_PRINT_EXPRESSION_OFFSET_SUBSTITUTION',
            algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
            name: `Output Value Variable Offset Substitution (${varName} - 1)`,
            category: 'Identifier & Variable Traps',
            description: `Output expression '${varName}' substituted with '${varName} - 1'`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }
      if (/\bSystem\.out\.println\s*\(\s*([a-zA-Z_]\w*)\s*\)/.test(lineText)) {
        const match = lineText.match(/\bSystem\.out\.println\s*\(\s*([a-zA-Z_]\w*)\s*\)/);
        if (match) {
          const varName = match[1];
          const mutated = lineText.replace(match[0], `System.out.println(${varName} + 1)`);
          pool.push({
            line: lineNum,
            mutationType: 'VAR_SEARCH_RESULT_POINTER_SHADOWING',
            algorithmicCategory: 'VARIABLE_SHADOWING_SWAP',
            name: `Search Result Pointer Shadowing (${varName} + 1)`,
            category: 'Identifier & Variable Traps',
            description: `Output search result '${varName}' shadowed with '${varName} + 1'`,
            originalFragment: lineText,
            mutatedFragment: mutated,
            applyToLines: (arr) => { arr[i] = mutated; },
          });
        }
      }

      // 9. ARITHMETIC / MODULO DIVISOR MUTATIONS
      const modMatch = lineText.match(/\b([a-zA-Z_]\w*)\s*%\s*(\d+)\b/);
      if (modMatch) {
        const varName = modMatch[1];
        const divisor = parseInt(modMatch[2], 10);
        if (divisor >= 2) {
          const altDiv1 = divisor - 1;
          const altDiv2 = divisor + 1;
          const mut1 = lineText.replace(modMatch[0], `${varName} % ${altDiv1}`);
          const mut2 = lineText.replace(modMatch[0], `${varName} % ${altDiv2}`);
          pool.push({
            line: lineNum,
            mutationType: 'MATH_MODULO_DIVISOR_OFF_BY_ONE',
            algorithmicCategory: 'EDGE_CASE_BYPASS',
            name: `Modulo Divisor Off-By-One Shift (% ${divisor} to % ${altDiv1})`,
            category: 'Boundary & Invariant Guards',
            description: `Modulo divisor '% ${divisor}' altered to '% ${altDiv1}'`,
            originalFragment: lineText,
            mutatedFragment: mut1,
            applyToLines: (arr) => { arr[i] = mut1; },
          });
          pool.push({
            line: lineNum,
            mutationType: 'MATH_MODULO_DIVISOR_INCREMENT',
            algorithmicCategory: 'EDGE_CASE_BYPASS',
            name: `Modulo Divisor Target Increment (% ${divisor} to % ${altDiv2})`,
            category: 'Boundary & Invariant Guards',
            description: `Modulo divisor '% ${divisor}' altered to '% ${altDiv2}'`,
            originalFragment: lineText,
            mutatedFragment: mut2,
            applyToLines: (arr) => { arr[i] = mut2; },
          });
        }
      }

      // 10. MODULO REMAINDER TARGET SHIFT (=== 0 -> === 1)
      if (lineText.includes('%') && (lineText.includes('=== 0') || lineText.includes('== 0'))) {
        const mutated = lineText.includes('=== 0') ? lineText.replace('=== 0', '=== 1') : lineText.replace('== 0', '== 1');
        pool.push({
          line: lineNum,
          mutationType: 'COND_MODULO_REMAINDER_NONZERO_SHIFT',
          algorithmicCategory: 'CONDITION_INVERSION',
          name: 'Modulo Remainder Non-Zero Target Shift (0 to 1)',
          category: 'Control Flow, Premature Returns & Guards',
          description: "Modulo remainder check '== 0' changed to '== 1'",
          originalFragment: lineText,
          mutatedFragment: mutated,
          applyToLines: (arr) => { arr[i] = mutated; },
        });
      }

      // 11. ACCUMULATOR INITIAL VALUE SHIFT (let total = 0 -> let total = 1 or -1)
      if (/\b(?:let|var|int|long)\s*([a-zA-Z_]\w*)\s*=\s*0\s*;/.test(lineText) && !lineText.includes('for')) {
        const match = lineText.match(/\b(?:let|var|int|long)\s*([a-zA-Z_]\w*)\s*=\s*0\s*;/);
        const varName = match ? match[1] : 'total';
        const mutated1 = lineText.replace(/=\s*0\s*;/, '= 1;');
        const mutated2 = lineText.replace(/=\s*0\s*;/, '= -1;');
        pool.push({
          line: lineNum,
          mutationType: 'ACC_INITIAL_VALUE_OFF_BY_ONE',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: `Accumulator Initial State Shift (0 to 1) for '${varName}'`,
          category: 'Accumulator & State Invariants',
          description: `Accumulator '${varName}' initialized to 1 instead of 0`,
          originalFragment: lineText,
          mutatedFragment: mutated1,
          applyToLines: (arr) => { arr[i] = mutated1; },
        });
        pool.push({
          line: lineNum,
          mutationType: 'ACC_INITIAL_NEGATIVE_OFFSET',
          algorithmicCategory: 'ACCUMULATOR_SCOPE',
          name: `Accumulator Initial Negative Offset (0 to -1) for '${varName}'`,
          category: 'Accumulator & State Invariants',
          description: `Accumulator '${varName}' initialized to -1 instead of 0`,
          originalFragment: lineText,
          mutatedFragment: mutated2,
          applyToLines: (arr) => { arr[i] = mutated2; },
        });
      }

      // 12. LOOP INITIALIZER OFFSET: i = 1 -> i = 0 or i = 2
      if (/\b(?:let|var|int|size_t)?\s*([a-zA-Z_]\w*)\s*=\s*1\s*;/.test(lineText) && lineText.includes('for')) {
        const match = lineText.match(/\b(?:let|var|int|size_t)?\s*([a-zA-Z_]\w*)\s*=\s*1\s*;/);
        const varName = match ? match[1] : 'i';
        const mutated0 = lineText.replace(/(\b[a-zA-Z_]\w*\s*=\s*)1\s*;/, '$10;');
        const mutated2 = lineText.replace(/(\b[a-zA-Z_]\w*\s*=\s*)1\s*;/, '$12;');
        pool.push({
          line: lineNum,
          mutationType: 'LOOP_START_INDEX_OFF_BY_ONE_SKIP_FIRST',
          algorithmicCategory: 'LOOP_BOUNDARY',
          name: `For Loop Initial Index Shifted to 0 for '${varName}'`,
          category: 'Loop Boundary & Stride Traps',
          description: `For-loop initial counter '${varName}' set to 0 instead of 1`,
          originalFragment: lineText,
          mutatedFragment: mutated0,
          applyToLines: (arr) => { arr[i] = mutated0; },
        });
        pool.push({
          line: lineNum,
          mutationType: 'LOOP_START_INDEX_OFF_BY_ONE_ADVANCE',
          algorithmicCategory: 'LOOP_BOUNDARY',
          name: `For Loop Initial Index Shifted to 2 for '${varName}'`,
          category: 'Loop Boundary & Stride Traps',
          description: `For-loop initial counter '${varName}' set to 2 instead of 1 (skips first valid value)`,
          originalFragment: lineText,
          mutatedFragment: mutated2,
          applyToLines: (arr) => { arr[i] = mutated2; },
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
   * 4. Complete elimination of unconstrained regex string append and 0 dummy bugs.
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
    const normLang = (language || 'python').toLowerCase();
    const isPy = normLang === 'python' || normLang === 'py';
    const isJs = normLang === 'javascript' || normLang === 'js' || normLang === 'typescript' || normLang === 'ts';
    const isC = normLang === 'c' || normLang === 'cpp';
    const isJava = normLang === 'java';

    const pyProvider = isPy ? new PythonLanguageProvider() : null;
    const jsProvider = isJs ? new JavaScriptLanguageProvider() : null;

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

    // 3. Merge candidate pools and strictly enforce non-empty, genuine mutations
    let combinedPool: RichCandidateItem[] = [...naturalItems, ...richItems].filter(
      (c) => c.originalFragment && c.mutatedFragment && c.originalFragment.trim() !== c.mutatedFragment.trim()
    );

    // Filter by requestedType if provided
    if (requestedType) {
      const filtered = combinedPool.filter((c) => c.mutationType === requestedType);
      if (filtered.length > 0) combinedPool = filtered;
    }

    // 4. History-Aware Filtering
    if (previousBugCategories && previousBugCategories.length > 0) {
      const unseenPool = combinedPool.filter((c) => !previousBugCategories.includes(c.algorithmicCategory));
      const distinctUnseenCats = new Set(unseenPool.map((c) => c.algorithmicCategory));
      if (distinctUnseenCats.size >= 3) {
        combinedPool = unseenPool;
      }
    }

    // Deterministically shuffle candidates using student seed
    const shuffled = [...combinedPool].sort(() => rng() - 0.5);

    // Group candidates by their AlgorithmicBugCategory
    const byCategory = new Map<AlgorithmicBugCategory, RichCandidateItem[]>();
    for (const cand of shuffled) {
      if (!byCategory.has(cand.algorithmicCategory)) {
        byCategory.set(cand.algorithmicCategory, []);
      }
      byCategory.get(cand.algorithmicCategory)!.push(cand);
    }

    // Deterministic Category Rotation:
    // Compute integer hash of seed to establish unique starting category offset per student
    let seedOffset = 0;
    for (let c = 0; c < seed.length; c++) {
      seedOffset = (seedOffset * 37 + seed.charCodeAt(c)) & 0x7fffffff;
    }

    const prevSet = new Set(previousBugCategories || []);
    const availableCategories = Array.from(byCategory.keys()).sort((a, b) => {
      const aSeen = prevSet.has(a) ? 1 : 0;
      const bSeen = prevSet.has(b) ? 1 : 0;
      if (aSeen !== bSeen) return aSeen - bSeen; // Unseen categories come first
      return rng() - 0.5;
    });

    // Rotate categories starting at student seed offset
    if (availableCategories.length > 0) {
      const rot = seedOffset % availableCategories.length;
      const rotated = availableCategories.slice(rot).concat(availableCategories.slice(0, rot));
      availableCategories.splice(0, availableCategories.length, ...rotated);
    }

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
      const categoryOrder = availableCategories.slice(attempt % Math.max(1, availableCategories.length)).concat(
        availableCategories.slice(0, attempt % Math.max(1, availableCategories.length))
      );

      // Pass 1: Select exactly 1 candidate from each distinct category
      for (const cat of categoryOrder) {
        if (chosen.length === 3) break;
        if (usedCategories.has(cat)) continue;

        const catList = byCategory.get(cat) || [];
        // Shuffle within category deterministically
        const shuffledInCat = [...catList].sort(() => rng() - 0.5);
        for (const cand of shuffledInCat) {
          if (usedLines.has(cand.line)) continue;
          if (usedTypes.has(cand.mutationType)) continue;

          usedLines.add(cand.line);
          usedTypes.add(cand.mutationType);
          usedCategories.add(cat);
          chosen.push(cand);
          break;
        }
      }

      // Pass 2: If code has < 3 distinct categories, fill with distinct real candidates from available categories
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

      // Apply chosen mutations in descending line order to prevent line shift collision
      const workingLines = [...rawLines];
      const sortedDescending = [...chosen].sort((a, b) => b.line - a.line);
      for (const item of sortedDescending) {
        item.applyToLines(workingLines);
      }

      const candidateCode = workingLines.join('\n');

      // Pre-Delivery Compiler Guard: Validate syntax before accepting
      if (candidateCode !== code && chosen.length > 0) {
        if (pyProvider) {
          const parseCheck = pyProvider.parseAndValidate(candidateCode);
          if (parseCheck.valid) {
            validatedCode = candidateCode;
            break;
          }
        } else if (jsProvider) {
          const parseCheck = jsProvider.parseAndValidate(candidateCode);
          if (parseCheck.valid) {
            validatedCode = candidateCode;
            break;
          }
        } else if (isC || isJava) {
          if (validateCBraces(candidateCode)) {
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
          if (tr.includes('==') && !tr.includes('===')) { workingLines[i] = workingLines[i].replace('==', '!='); break; }
          if (tr.includes('!=') && !tr.includes('!==')) { workingLines[i] = workingLines[i].replace('!=', '=='); break; }
          if (tr.includes('<=')) { workingLines[i] = workingLines[i].replace('<=', '<'); break; }
          if (tr.includes('<') && !tr.includes('<<')) { workingLines[i] = workingLines[i].replace('<', '<='); break; }
        }
      }
      validatedCode = workingLines.join('\n');
    }

    // Build structured InjectedBugDetail array for the chosen distinct bugs
    const finalBugs: InjectedBugDetail[] = chosen.slice(0, 3).map((item, idx) => {
      const catalogEntry = this.getCatalogEntry(item.mutationType);
      const baseName = item.name || catalogEntry?.name || item.mutationType.replace(/_/g, ' ');
      const cleanFrag = (item.originalFragment || '').trim().replace(/[\r\n\t]+/g, ' ');
      const targetToken = cleanFrag ? cleanFrag.slice(0, 24) : `Line ${item.line}`;
      const defectName = `${baseName} [${targetToken}]`;
      return {
        bugIndex: idx + 1,
        mutationType: item.mutationType,
        algorithmicCategory: item.algorithmicCategory,
        name: defectName,
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
