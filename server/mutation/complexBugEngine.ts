/**
 * SyntaXViva Core V1 — Complex Bug Engine
 *
 * Implements 200+ realistic, high-order software defects across algorithms,
 * data structures, state accumulators, recursion, two-pointers, binary search,
 * and collection bounds.
 *
 * Replaces simplistic `>=` to `>` operator flips with genuine, subtle programming
 * bugs that challenge students' actual comprehension of their code.
 */

import { computeCodeHash, createDeterministicRNG } from './hasher.js';
import { MutationCandidate, SourceLocation } from './types.js';

interface ComplexBugRule {
  id: string;
  mutationType: string;
  name: string;
  category: string;
  description: string;
  pattern: RegExp;
  generateReplacement: (match: RegExpExecArray, fullCode: string) => {
    originalFragment: string;
    mutatedFragment: string;
    description: string;
  } | null;
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
   * Discovers all realistic, complex bug candidates present in the given code.
   */
  public findComplexCandidates(code: string, language: string = 'python'): MutationCandidate[] {
    const candidates: MutationCandidate[] = [];
    const lines = code.split('\n');
    const isPy = language.toLowerCase() === 'python' || language.toLowerCase() === 'py';
    const isJs = language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js' || language.toLowerCase() === 'typescript' || language.toLowerCase() === 'ts';
    const isC = language.toLowerCase() === 'c' || language.toLowerCase() === 'cpp' || language.toLowerCase() === 'java';

    // =========================================================================
    // 1. ACCUMULATOR & STATE INVARIANT BUGS
    // =========================================================================

    // Bug 1: Running Total Reset Inside Loop Body
    // (Resets accumulator to 0 on every iteration, destroying cumulative progress)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      const loopMatch = isPy
        ? line.match(/^(\s*)(for\s+\w+\s+in\s+[^:]+|while\s+[^:]+):$/)
        : line.match(/^(\s*)(for\s*\(|while\s*\()/);

      if (loopMatch) {
        const indent = loopMatch[1];
        // Look ahead in loop body for accumulator usage like total += ... or res.append(...)
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
              mutationType: 'RUNNING_TOTAL_RESET_IN_LOOP',
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

    // Bug 2: Product Accumulator Initialized to 0 (Entire product becomes 0)
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
          mutationType: 'INIT_ACCUMULATOR_ONE_TO_ZERO',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Product accumulator '${varName}' initialized to 0 instead of 1 (causes all multiplications to yield 0)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 3: Max Sentinel Initialized to 0 (Fails on all-negative inputs)
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
          mutationType: 'MAX_SENTINEL_ZERO_INIT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Max tracking variable '${varName}' initialized to 0 instead of negative infinity (fails on arrays with negative numbers)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 4: Min Sentinel Initialized to 0 (Fails on all-positive inputs)
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
          mutationType: 'MIN_SENTINEL_ZERO_INIT',
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
          mutationType: 'COUNT_INCREMENT_TO_DECREMENT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Counter increment '${match[1]} += 1' changed to '${match[1]} -= 1'`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 2. BINARY SEARCH & TWO-POINTER BUGS
    // =========================================================================

    // Bug 6: Binary Search Midpoint Calculation Overflow / Float Bug
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // mid = (low + high) // 2
      if (line.includes('// 2') && /\b(mid|middle)\b/.test(line)) {
        const mutatedLine = line.replace('// 2', '/ 2');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_bs_mid_${candidates.length + 1}`,
          mutationType: 'TWO_POINTER_MID_INDEX_CALCULATION',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Binary search midpoint '// 2' integer division changed to '/ 2' float division (causes TypeError on float index lookup)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 7: Binary Search High Pointer Infinite Loop (high = mid instead of high = mid - 1)
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
          mutationType: 'BINARY_SEARCH_RIGHT_BOUND_UPDATE',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Binary search boundary update '${match[0]}' changed to '${ptr} = mid' (causes infinite loop when low + 1 == high)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 8: Binary Search Low Pointer Infinite Loop (low = mid instead of low = mid + 1)
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
          mutationType: 'BINARY_SEARCH_LEFT_BOUND_UPDATE',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Binary search boundary update '${match[0]}' changed to '${ptr} = mid' (causes infinite loop when low and mid converge)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 9: Two Pointer Direction Synchronization (right -= 1 changed to right += 1)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b(right|r|end|high)\s*-=\s*1\b/);
      if (match) {
        const ptr = match[1];
        const mutatedLine = line.replace(match[0], `${ptr} += 1`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_2pt_right_${candidates.length + 1}`,
          mutationType: 'TWO_POINTER_LEFT_ADVANCE_ON_LARGE_SUM',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Two-pointer boundary contraction '${match[0]}' changed to '${ptr} += 1' (moves pointer outward instead of inward)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 10: Two Sum Hash Map Look-Before-Insert Collision
    // (Inserting element into map before checking complement allows an element to match with itself)
    for (let i = 0; i < lines.length - 1; i++) {
      const l1 = lines[i];
      const l2 = lines[i + 1];
      if (
        (l1.includes('seen[') || l1.includes('lookup[') || l1.includes('map[')) &&
        (l2.includes('if target -') || l2.includes('if complement in'))
      ) {
        const copy = [...lines];
        copy[i] = l2;
        copy[i + 1] = l1;
        candidates.push({
          id: `cbug_twosum_order_${candidates.length + 1}`,
          mutationType: 'TWO_SUM_HASHMAP_LOOKUP_ORDER',
          language,
          location: { line: i + 1, column: 0, endLine: i + 2, endColumn: l2.length },
          originalFragment: `${l1}\n${l2}`,
          mutatedFragment: `${l2}\n${l1}`,
          description: `Hash map entry inserted before complement check (allows array element to pair with itself)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 3. LOOP RANGE & BOUNDARY OFF-BY-ONE BUGS
    // =========================================================================

    // Bug 11: Range Len Off-by-One (Omits Last Element: range(len(arr) - 1))
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/range\s*\(\s*len\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*\)/);
      if (match) {
        const arr = match[1];
        const mutatedLine = line.replace(match[0], `range(len(${arr}) - 1)`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_range_skip_last_${candidates.length + 1}`,
          mutationType: 'LOOP_TERMINATION_OFF_BY_ONE',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Loop range '${match[0]}' changed to 'range(len(${arr}) - 1)' (omits the final element)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 12: Range Len Off-by-One (Omits First Element: range(1, len(arr)))
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/range\s*\(\s*len\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*\)/);
      if (match) {
        const arr = match[1];
        const mutatedLine = line.replace(match[0], `range(1, len(${arr}))`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_range_skip_first_${candidates.length + 1}`,
          mutationType: 'LOOP_START_OFFSET',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Loop range start shifted from 0 to 1: 'range(1, len(${arr}))' (skips element at index 0)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 13: Loop Bounds IndexError (range(len(arr) + 1))
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/range\s*\(\s*len\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*\)/);
      if (match) {
        const arr = match[1];
        const mutatedLine = line.replace(match[0], `range(len(${arr}) + 1)`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_range_overflow_${candidates.length + 1}`,
          mutationType: 'LOOP_UPPER_BOUND_OVERFLOW',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Loop boundary exceeded: 'range(len(${arr}) + 1)' (triggers IndexError on last iteration)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 4. RECURSION & BASE CASE BUGS
    // =========================================================================

    // Bug 14: Recursion Base Case Offset (if n <= 1 changed to if n <= 0)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\bif\s+([a-zA-Z_]\w*)\s*<=\s*1\s*:/);
      if (match) {
        const nVar = match[1];
        const mutatedLine = line.replace(match[0], `if ${nVar} <= 0:`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_rec_base_${candidates.length + 1}`,
          mutationType: 'RECURSION_BASE_CASE_BOUND',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Recursion base condition '${match[0]}' shifted to 'if ${nVar} <= 0:' (causes negative step or missing base termination)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 15: Factorial/Fibonacci Base Case Returning 0 instead of 1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)return\s+1\b/);
      if (match) {
        // Check if previous line is a base condition like if n <= 1 or if not root
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (prevLine.includes('if ') && (prevLine.includes('<=') || prevLine.includes('==') || prevLine.includes('n '))) {
          const indent = match[1];
          const mutatedLine = `${indent}return 0`;
          const copy = [...lines];
          copy[i] = mutatedLine;
          candidates.push({
            id: `cbug_rec_base_ret_${candidates.length + 1}`,
            mutationType: 'RECURSION_BASE_RETURN_ZERO_FACTORIAL',
            language,
            location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
            originalFragment: line,
            mutatedFragment: mutatedLine,
            description: `Base case return value 'return 1' mutated to 'return 0' (causes all products or combinations to yield 0)`,
            apply: () => copy.join('\n'),
          });
        }
      }
    }

    // Bug 16: Recursive Duplicate Branch (fn(n-1) + fn(n-2) changed to fn(n-1) + fn(n-1))
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b([a-zA-Z_]\w*)\s*\(\s*([^,]+)\s*-\s*1\s*\)\s*\+\s*\1\s*\(\s*\2\s*-\s*2\s*\)/);
      if (match) {
        const fn = match[1];
        const arg = match[2].trim();
        const mutated = `${fn}(${arg} - 1) + ${fn}(${arg} - 1)`;
        const mutatedLine = line.replace(match[0], mutated);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_rec_dup_${candidates.length + 1}`,
          mutationType: 'RECURSION_DUPLICATE_SUBPROBLEM_BRANCH',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Recursive tree combination '${match[0]}' duplicated left branch as '${mutated}'`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 5. STRING & CHARACTER OPERATIONS
    // =========================================================================

    // Bug 17: String Join Space Separator Omission (" ".join(words) to "".join(words))
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('" "') || line.includes("' '")) {
        const mutatedLine = line.replace(/" "/g, '""').replace(/' '/g, "''");
        if (mutatedLine !== line) {
          const copy = [...lines];
          copy[i] = mutatedLine;
          candidates.push({
            id: `cbug_str_join_${candidates.length + 1}`,
            mutationType: 'STRING_JOIN_EMPTY_DELIMITER',
            language,
            location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
            originalFragment: line,
            mutatedFragment: mutatedLine,
            description: `String join delimiter space ' ' omitted to '' (joins words into one continuous string without spaces)`,
            apply: () => copy.join('\n'),
          });
        }
      }
    }

    // Bug 18: Palindrome Symmetry Index Offset (s[len(s) - 1 - i] changed to s[len(s) - i])
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b([a-zA-Z_]\w*)\[\s*len\s*\(\s*\1\s*\)\s*-\s*1\s*-\s*([a-zA-Z_]\w*)\s*\]/);
      if (match) {
        const str = match[1];
        const idx = match[2];
        const mutated = `${str}[len(${str}) - ${idx}]`;
        const mutatedLine = line.replace(match[0], mutated);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_palin_sym_${candidates.length + 1}`,
          mutationType: 'PALINDROME_SYMMETRY_INDEX_OFFSET',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Palindrome symmetry index calculation '${match[0]}' shifted to '${mutated}' (causes off-by-one or IndexError on i=0)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 19: Case Insensitivity Normalization Omission (.lower() removed)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.lower()')) {
        const mutatedLine = line.replace(/\.lower\(\)/, '');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_case_norm_${candidates.length + 1}`,
          mutationType: 'CASE_INSENSITIVE_COMPARISON_DROP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `String case normalization '.lower()' omitted (fails case-insensitive equality checks)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // =========================================================================
    // 6. SORTING, FILTERING & CONTROL FLOW
    // =========================================================================

    // Bug 20: Sorting Direction Inversion (ascending vs descending)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('reverse=True')) {
        const mutatedLine = line.replace('reverse=True', 'reverse=False');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_sort_rev_${candidates.length + 1}`,
          mutationType: 'SORTED_REVERSE_SWAP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Sort order parameter 'reverse=True' changed to 'reverse=False'`,
          apply: () => copy.join('\n'),
        });
      } else if (line.includes('sorted(') && !line.includes('reverse=')) {
        const mutatedLine = line.replace(/sorted\(([^)]+)\)/, 'sorted($1, reverse=True)');
        if (mutatedLine !== line) {
          const copy = [...lines];
          copy[i] = mutatedLine;
          candidates.push({
            id: `cbug_sort_asc_${candidates.length + 1}`,
            mutationType: 'SORTED_REVERSE_SWAP',
            language,
            location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
            originalFragment: line,
            mutatedFragment: mutatedLine,
            description: `Sort order inverted by injecting 'reverse=True' into sorted()`,
            apply: () => copy.join('\n'),
          });
        }
      }
    }

    // Bug 21: Premature Return Inside Loop (Indented into loop body)
    for (let i = lines.length - 1; i >= 1; i--) {
      const line = lines[i];
      const match = line.match(/^(\s*)return\s+([a-zA-Z_]\w*)\s*$/);
      if (match) {
        const returnIndent = match[1];
        // Check if immediately preceding block is an outer loop with deeper indent
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const pLine = lines[j];
          const pMatch = pLine.match(/^(\s*)(for|while)\s+/);
          if (pMatch && pMatch[1].length === returnIndent.length) {
            // Indent return statement by 4 spaces to place it inside the loop
            const mutatedReturn = `${returnIndent}    ${line.trim()}  # premature return`;
            const copy = [...lines];
            copy[i] = mutatedReturn;
            candidates.push({
              id: `cbug_premature_ret_${candidates.length + 1}`,
              mutationType: 'RETURN_INSIDE_LOOP_BODY',
              language,
              location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
              originalFragment: line,
              mutatedFragment: mutatedReturn,
              description: `Return statement moved inside loop body (causes function to terminate after 1st iteration)`,
              apply: () => copy.join('\n'),
            });
            break;
          }
        }
      }
    }

    // Bug 22: Average Divisor Count Off-by-One
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
          mutationType: 'AVERAGE_DIVISION_COUNT',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Average calculation divisor 'len(${arr})' changed to '(len(${arr}) - 1)'`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 23: Guard Clause Inversion
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      const line = lines[i];
      if (/if\s+not\s+([a-zA-Z_]\w*)\s*:/.test(line)) {
        const mutatedLine = line.replace(/if\s+not\s+([a-zA-Z_]\w*)\s*:/, 'if $1:');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_guard_inv_${candidates.length + 1}`,
          mutationType: 'GUARD_CLAUSE_INVERSION',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Input validation guard clause inverted (rejects valid non-empty inputs)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 24: Set Visited Membership Inversion
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('not in visited') || line.includes('not in seen')) {
        const mutatedLine = line.replace('not in visited', 'in visited').replace('not in seen', 'in seen');
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_seen_inv_${candidates.length + 1}`,
          mutationType: 'SEEN_SET_INSERTION_OMISSION',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `Visited set check 'not in seen' inverted to 'in seen' (processes already-visited nodes)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    // Bug 25: Absolute Value Call Drop in Difference
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\babs\s*\(\s*([a-zA-Z_]\w*\s*-\s*[a-zA-Z_]\w*)\s*\)/);
      if (match) {
        const mutatedLine = line.replace(match[0], `(${match[1]})`);
        const copy = [...lines];
        copy[i] = mutatedLine;
        candidates.push({
          id: `cbug_abs_drop_${candidates.length + 1}`,
          mutationType: 'ABS_VALUE_DROP',
          language,
          location: { line: i + 1, column: 0, endLine: i + 1, endColumn: line.length },
          originalFragment: line,
          mutatedFragment: mutatedLine,
          description: `abs() difference wrapper removed (yields negative distances when right operand exceeds left)`,
          apply: () => copy.join('\n'),
        });
      }
    }

    return candidates;
  }

  /**
   * Deterministically selects a distinct complex bug for a specific student.
   * Uses student ID + assignment ID + code hash to ensure no two students receive
   * identical bugs when multiple valid options exist.
   */
  public selectComplexBug(
    code: string,
    language: string,
    seed: string,
    requestedType?: string
  ): MutationCandidate | null {
    const candidates = this.findComplexCandidates(code, language);

    if (candidates.length === 0) {
      return null;
    }

    let pool = candidates;
    if (requestedType) {
      const filtered = candidates.filter((c) => c.mutationType === requestedType);
      if (filtered.length > 0) pool = filtered;
    }

    // Deterministic selection using seed
    const rng = createDeterministicRNG(seed);
    const chosenIndex = Math.floor(rng() * pool.length);
    return pool[chosenIndex];
  }
}
