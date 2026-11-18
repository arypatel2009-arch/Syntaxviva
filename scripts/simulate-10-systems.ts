import { createDeterministicRNG } from '../server/mutation/hasher.ts';

interface MutationCandidateItem {
  line: number;
  mutationType: string;
  name: string;
  category: string;
  description: string;
  originalFragment: string;
  mutatedFragment: string;
  apply: (linesArr: string[]) => void;
}

export function getAllCandidatePool(code: string, language: string = 'python'): MutationCandidateItem[] {
  const rawLines = code.split('\n');
  const pool: MutationCandidateItem[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const lineText = rawLines[i];
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      continue;
    }

    // 1. Assignment expressions (strictly single '=' assignment, NOT '==', '!=', '<=', '>=')
    if (/(?<![!=<>])=(?![=])\s*([^#\n;]+)/.test(lineText) && !trimmed.startsWith('if ') && !trimmed.startsWith('elif ')) {
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
          apply: (arr) => { arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} + 1`); },
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
          apply: (arr) => { arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} - 1`); },
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
          apply: (arr) => { arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= ${expr} * 2`); },
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
            apply: (arr) => { arr[i] = arr[i].replace(/(?<![!=<>])=(?![=])\s*([^#\n;]+)/, (_m, expr) => `= -(${expr})`); },
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
        mutatedFragment: lineText.includes('==') ? lineText.replace('==', '!=') : lineText.replace('!=', '=='),
        apply: (arr) => { arr[i] = arr[i].includes('==') ? arr[i].replace('==', '!=') : arr[i].replace('!=', '=='); },
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
          apply: (arr) => { arr[i] = arr[i].replace('== 0', '== 1'); },
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
          apply: (arr) => { arr[i] = arr[i].replace('% 2', '% 3'); },
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
          apply: (arr) => { arr[i] = arr[i].replace('== 0', '> 0'); },
        });
      }
    }

    // 3. String Output & Print statements (e.g. `print("Even")`, `print("Odd")`)
    if (/(?:print|console\.log|println|cout)\s*[<(]/.test(lineText) && /(["'])(.+?)\1/.test(lineText)) {
      // 3A. Word Swap (Even <-> Odd, True <-> False, etc.)
      const swappedText = lineText.replace(/(["'])(.+?)\1/, (_m, q, content) => {
        let sw = content;
        if (content.toLowerCase() === 'even') sw = content === 'Even' ? 'Odd' : 'odd';
        else if (content.toLowerCase() === 'odd') sw = content === 'Odd' ? 'Even' : 'even';
        else if (content.toLowerCase() === 'true') sw = content === 'True' ? 'False' : 'false';
        else if (content.toLowerCase() === 'false') sw = content === 'False' ? 'True' : 'true';
        else if (content.toLowerCase() === 'yes') sw = content === 'Yes' ? 'No' : 'no';
        else if (content.toLowerCase() === 'no') sw = content === 'No' ? 'Yes' : 'yes';
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
          apply: (arr) => { arr[i] = swappedText; },
        });
      }

      // 3B. Casing Mismatch (e.g. "even" vs "Even")
      const casedText = lineText.replace(/(["'])(.+?)\1/, (_m, q, content) => {
        const cased = content === content.toLowerCase() ? content.toUpperCase() : content.toLowerCase();
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
          apply: (arr) => { arr[i] = casedText; },
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
        apply: (arr) => { arr[i] = trailedText; },
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
          apply: (arr) => { arr[i] = noneText; },
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
        apply: (arr) => { arr[i] = arr[i].replace('else:', 'elif False:'); },
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
        apply: (arr) => { arr[i] = arr[i].replace('else:', 'elif not True:'); },
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
        apply: (arr) => { arr[i] = arr[i].replace(/0\s*<=\s*([a-zA-Z_]\w*)\s*<=\s*100/, '0 < $1 < 100'); },
      });
    }

    // 6. General Comparison Thresholds (>=, <=, >, <, ==, !=)
    if (/(?:if|elif)\s+[^:]*(?:>=|<=|>|<|==|!=)/.test(lineText) && !pool.some(p => p.line === lineNum && p.mutationType.includes('MODULO'))) {
      if (lineText.includes('>=')) {
        pool.push({
          line: lineNum,
          mutationType: 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
          name: 'Input Guard Clause Inversion',
          category: 'Control Flow, Premature Returns & Guards',
          description: "Inclusive '>=' replaced by strict '>'",
          originalFragment: lineText,
          mutatedFragment: lineText.replace('>=', '>'),
          apply: (arr) => { arr[i] = arr[i].replace('>=', '>'); },
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
          apply: (arr) => { arr[i] = arr[i].replace('<=', '<'); },
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
          apply: (arr) => { arr[i] = arr[i].replace('==', '!='); },
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
          apply: (arr) => { arr[i] = arr[i].replace(' and ', ' or '); },
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
        apply: (arr) => { arr[i] = arr[i].replace(/^(\s*)return\s+.+$/, '$1return None'); },
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
        apply: (arr) => {
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
        apply: (arr) => { arr[i] = arr[i].replace(' += 1', ' -= 1'); },
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
        apply: (arr) => { arr[i] = arr[i].replace(' += ', ' -= '); },
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
        mutatedFragment: lineText.includes(' // ') ? lineText.replace(' // ', ' / ') : lineText.replace(' / ', ' // '),
        apply: (arr) => {
          arr[i] = arr[i].includes(' // ') ? arr[i].replace(' // ', ' / ') : arr[i].replace(' / ', ' // ');
        },
      });
    }
  }

  return pool;
}

export function selectThreeDiverseBugs(code: string, seed: string) {
  const rawLines = code.split('\n');
  const pool = getAllCandidatePool(code);
  const rng = createDeterministicRNG(seed);

  // Deterministically shuffle candidate actions
  const shuffledPool = [...pool].sort(() => rng() - 0.5);

  const chosen: MutationCandidateItem[] = [];
  const usedLines = new Set<number>();
  const usedTypes = new Set<string>();

  for (const item of shuffledPool) {
    if (chosen.length === 3) break;
    if (usedLines.has(item.line)) continue;
    if (usedTypes.has(item.mutationType)) continue;

    usedLines.add(item.line);
    usedTypes.add(item.mutationType);
    chosen.push(item);
  }

  // Fallback if code has very few lines and chosen < 3
  if (chosen.length < 3) {
    for (const item of shuffledPool) {
      if (chosen.length === 3) break;
      if (usedTypes.has(item.mutationType)) continue;
      usedTypes.add(item.mutationType);
      chosen.push(item);
    }
  }

  const workingLines = [...rawLines];
  const sortedDesc = [...chosen].sort((a, b) => b.line - a.line);
  for (const c of sortedDesc) {
    c.apply(workingLines);
  }

  return {
    code: workingLines.join('\n'),
    bugs: chosen,
  };
}

// TEST 1: Even / Odd on 10 Systems
const evenOdd = `n = int(input())

if n % 2 == 0:
    print("Even")
else:
    print("Odd")`;

console.log('=== TEST 1: Even/Odd Program on 10 Different Systems/Students ===');
const uniqueKeysEvenOdd = new Set<string>();
const uniqueCodesEvenOdd = new Set<string>();

for (let i = 1; i <= 10; i++) {
  const seed = `student_system_${i}_even_odd`;
  const res = selectThreeDiverseBugs(evenOdd, seed);
  const key = res.bugs.map(b => `L${b.line}:${b.mutationType}`).join(' | ');
  uniqueKeysEvenOdd.add(key);
  uniqueCodesEvenOdd.add(res.code);

  console.log(`\n[System ${i} - Seed: ${seed}]`);
  console.log('Mutated Code Preview:\n' + res.code);
  console.log('Injected 3 Bugs:');
  for (const b of res.bugs) {
    console.log(`  - Line ${b.line} [${b.category}]: ${b.name} (${b.mutationType})`);
  }
}

console.log(`\nEven/Odd Result: ${uniqueKeysEvenOdd.size} / 10 Unique Bug Combinations`);

// TEST 2: Grade Calculator on 10 Systems
const gradeCalc = `# Student Grade Calculator
def calculate_grade(marks):
    if marks >= 80:
        return "A"
    elif marks >= 60:
        return "B"
    elif marks >= 40:
        return "C"
    else:
        return "Fail"

marks = float(input("Enter student marks (0 to 100): "))

if 0 <= marks <= 100:
    grade = calculate_grade(marks)
    print(f"Total Marks: {marks}/100")
    print(f"Grade: {grade}")
else:
    print("Invalid input! Please enter marks between 0 and 100.")`;

console.log('\n=== TEST 2: Grade Calculator Program on 10 Different Systems/Students ===');
const uniqueKeysGrade = new Set<string>();
for (let i = 1; i <= 10; i++) {
  const seed = `student_system_${i}_grade_calc`;
  const res = selectThreeDiverseBugs(gradeCalc, seed);
  const key = res.bugs.map(b => `L${b.line}:${b.mutationType}`).join(' | ');
  uniqueKeysGrade.add(key);
}
console.log(`Grade Calculator Result: ${uniqueKeysGrade.size} / 10 Unique Bug Combinations`);
