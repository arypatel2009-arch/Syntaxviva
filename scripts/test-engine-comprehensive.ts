function mutateCodeSimulated(code: string): { original: string; mutated: string; bugs: any[] } {
  const rawLines = code.split('\n');
  const chosen: Array<{
    line: number;
    mutationType: string;
    originalFragment: string;
    mutatedFragment: string;
    description: string;
    applyToLines: (linesArr: string[]) => void;
  }> = [];

  const usedLines = new Set<number>();
  const usedMutationTypes = new Set<string>();

  const eligibleLineIndices: number[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const text = rawLines[i].trim();
    if (
      text &&
      !text.startsWith('#') &&
      !text.startsWith('//') &&
      !text.startsWith('import ') &&
      !text.startsWith('from ')
    ) {
      eligibleLineIndices.push(i);
    }
  }

  for (const lineIdx of eligibleLineIndices) {
    if (chosen.length === 3) break;
    const lineNum = lineIdx + 1;
    if (usedLines.has(lineNum)) continue;

    const lineText = rawLines[lineIdx];

    // 1. Modulo / Parity Predicate (e.g. `n % 2 == 0` -> `n % 2 != 0`)
    if (
      !usedMutationTypes.has('MATH_NEGATIVE_MODULO_REMAINDER_POLARITY_TRAP') &&
      /%\s*\d+\s*(?:==|!=)\s*\d+/.test(lineText)
    ) {
      const mutated = lineText.includes('==')
        ? lineText.replace('==', '!=')
        : lineText.replace('!=', '==');
      if (mutated !== lineText) {
        usedLines.add(lineNum);
        usedMutationTypes.add('MATH_NEGATIVE_MODULO_REMAINDER_POLARITY_TRAP');
        chosen.push({
          line: lineNum,
          mutationType: 'MATH_NEGATIVE_MODULO_REMAINDER_POLARITY_TRAP',
          originalFragment: lineText,
          mutatedFragment: mutated,
          description: `Modulo parity comparison inverted`,
          applyToLines: (arr) => { arr[lineIdx] = mutated; },
        });
        continue;
      }
    }

    // 2. Branch Output String Inversion (e.g. `print("Even")` -> `print("Odd")`)
    if (
      !usedMutationTypes.has('FLOW_CONDITIONAL_TERNARY_CONSEQUENT_ALTERNATE_SWAP') &&
      /print\s*\(\s*(["'])(.+?)\1\s*\)/.test(lineText)
    ) {
      const mutated = lineText.replace(/print\s*\(\s*(["'])(.+?)\1\s*\)/, (_m, q, content) => {
        let swapped = content;
        if (content.toLowerCase() === 'even') swapped = content === 'Even' ? 'Odd' : 'odd';
        else if (content.toLowerCase() === 'odd') swapped = content === 'Odd' ? 'Even' : 'even';
        else if (content.toLowerCase() === 'true') swapped = content === 'True' ? 'False' : 'false';
        else if (content.toLowerCase() === 'false') swapped = content === 'False' ? 'True' : 'true';
        else if (content.toLowerCase() === 'yes') swapped = content === 'Yes' ? 'No' : 'no';
        else if (content.toLowerCase() === 'no') swapped = content === 'No' ? 'Yes' : 'yes';
        else if (content.toLowerCase() === 'pass') swapped = content === 'Pass' ? 'Fail' : 'fail';
        else if (content.toLowerCase() === 'fail') swapped = content === 'Fail' ? 'Pass' : 'pass';
        else swapped = content + ' (corrupted)';
        return `print(${q}${swapped}${q})`;
      });

      if (mutated !== lineText) {
        usedLines.add(lineNum);
        usedMutationTypes.add('FLOW_CONDITIONAL_TERNARY_CONSEQUENT_ALTERNATE_SWAP');
        chosen.push({
          line: lineNum,
          mutationType: 'FLOW_CONDITIONAL_TERNARY_CONSEQUENT_ALTERNATE_SWAP',
          originalFragment: lineText,
          mutatedFragment: mutated,
          description: `Branch output value inverted`,
          applyToLines: (arr) => { arr[lineIdx] = mutated; },
        });
        continue;
      }
    }

    // 3. Input conversion / Assignment value shift (e.g. `n = int(input())` -> `n = int(input()) + 1`)
    if (
      !usedMutationTypes.has('ACC_RUNNING_COUNT_OFF_BY_ONE_INITIALIZATION') &&
      /=\s*(?:int|float)\s*\([^)]+\)/.test(lineText)
    ) {
      const mutated = lineText.replace(/(=(?:\s*)(?:int|float)\s*\([^)]+\))/, '$1 + 1');
      if (mutated !== lineText) {
        usedLines.add(lineNum);
        usedMutationTypes.add('ACC_RUNNING_COUNT_OFF_BY_ONE_INITIALIZATION');
        chosen.push({
          line: lineNum,
          mutationType: 'ACC_RUNNING_COUNT_OFF_BY_ONE_INITIALIZATION',
          originalFragment: lineText,
          mutatedFragment: mutated,
          description: `Input value arithmetic offset by +1 (causes calculation parity drift)`,
          applyToLines: (arr) => { arr[lineIdx] = mutated; },
        });
        continue;
      }
    }

    // 4. Threshold inequality (e.g. `>=` -> `>`)
    if (
      !usedMutationTypes.has('FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID') &&
      /(?:if|elif)\s+[^:]*>=/.test(lineText)
    ) {
      const mutated = lineText.replace(/>=/, '>');
      if (mutated !== lineText) {
        usedLines.add(lineNum);
        usedMutationTypes.add('FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID');
        chosen.push({
          line: lineNum,
          mutationType: 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID',
          originalFragment: lineText,
          mutatedFragment: mutated,
          description: `Threshold operator changed from inclusive '>=' to strict '>'`,
          applyToLines: (arr) => { arr[lineIdx] = mutated; },
        });
        continue;
      }
    }

    // 5. Early return
    if (
      !usedMutationTypes.has('FLOW_EARLY_RETURN_NONE_INSIDE_NESTED_IF') &&
      lineText.trim().startsWith('return ')
    ) {
      const mutated = lineText.replace(/return\s+(.+)$/, 'return None');
      if (mutated !== lineText) {
        usedLines.add(lineNum);
        usedMutationTypes.add('FLOW_EARLY_RETURN_NONE_INSIDE_NESTED_IF');
        chosen.push({
          line: lineNum,
          mutationType: 'FLOW_EARLY_RETURN_NONE_INSIDE_NESTED_IF',
          originalFragment: lineText,
          mutatedFragment: mutated,
          description: `Return statement modified to return None`,
          applyToLines: (arr) => { arr[lineIdx] = mutated; },
        });
        continue;
      }
    }
  }

  // Fallback if still under 3:
  if (chosen.length < 3) {
    for (const lineIdx of eligibleLineIndices) {
      if (chosen.length === 3) break;
      const lineNum = lineIdx + 1;
      if (usedLines.has(lineNum)) continue;

      const lineText = rawLines[lineIdx];
      let mutated = lineText;
      let mutType = 'DEFENSIVE_NONE_INPUT_UNHANDLED_EXCEPTION';
      let desc = 'Boundary condition altered';

      if (lineText.includes('int(input())')) {
        mutated = lineText.replace('int(input())', 'int(input()) + 1');
        mutType = 'ACC_RUNNING_COUNT_OFF_BY_ONE_INITIALIZATION';
        desc = 'Input value shifted by +1';
      } else if (lineText.includes('== 0')) {
        mutated = lineText.replace('== 0', '!= 0');
        mutType = 'FLOW_GUARD_CLAUSE_INVERSION_REJECTS_VALID';
        desc = 'Zero parity comparison inverted';
      } else if (lineText.includes('print(')) {
        mutated = lineText.replace(/(["'])(.+?)\1/, (_m, q, c) => `${q}${c === 'Even' ? 'Odd' : 'Even'}${q}`);
        mutType = 'FLOW_CONDITIONAL_TERNARY_CONSEQUENT_ALTERNATE_SWAP';
        desc = 'Output literal value swapped';
      } else if (lineText.includes('else:')) {
        mutated = lineText.replace('else:', 'elif False:');
        mutType = 'FLOW_ELSE_IF_CONVERTED_TO_INDEPENDENT_IF';
        desc = 'Else branch converted to unreachable predicate';
      } else if (/\b\d+\b/.test(lineText)) {
        mutated = lineText.replace(/\b(\d+)\b/, (d) => String(Number(d) + 1));
        mutType = 'ACC_RUNNING_COUNT_OFF_BY_ONE_INITIALIZATION';
        desc = 'Numeric literal incremented by 1';
      }

      if (mutated !== lineText && !usedMutationTypes.has(mutType)) {
        usedLines.add(lineNum);
        usedMutationTypes.add(mutType);
        chosen.push({
          line: lineNum,
          mutationType: mutType,
          originalFragment: lineText,
          mutatedFragment: mutated,
          description: desc,
          applyToLines: (arr) => { arr[lineIdx] = mutated; },
        });
      }
    }
  }

  const workingLines = [...rawLines];
  const sorted = [...chosen].sort((a, b) => b.line - a.line);
  for (const c of sorted) {
    c.applyToLines(workingLines);
  }

  return {
    original: code,
    mutated: workingLines.join('\n'),
    bugs: chosen,
  };
}

const evenOdd = `n = int(input())

if n % 2 == 0:
    print("Even")
else:
    print("Odd")`;

const res = mutateCodeSimulated(evenOdd);
console.log('--- Even/Odd Mutation Test ---');
console.log('Original:\n' + res.original);
console.log('\nMutated:\n' + res.mutated);
console.log('\nIdentical?:', res.original === res.mutated);
console.log('\nBugs count:', res.bugs.length);
for (const b of res.bugs) {
  console.log(`- Line ${b.line}: "${b.originalFragment}" -> "${b.mutatedFragment}" (${b.mutationType})`);
}
