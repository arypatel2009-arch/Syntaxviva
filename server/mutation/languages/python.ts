/**
 * SyntaXViva Core V1 — Part 3 Python Language Provider
 *
 * Uses py-ast to perform deterministic AST analysis of Python source code.
 * Discovers valid candidate locations for all 27 mutation types,
 * ensuring comments and string literals are NEVER modified.
 */

// @ts-ignore
import { parse as pyParse } from 'py-ast';
import {
  LanguageProvider,
  MutationCandidate,
  MutationTypeCode,
  SourceLocation,
} from '../types.js';

interface ASTNode {
  nodeType: string;
  lineno?: number;
  col_offset?: number;
  end_lineno?: number;
  end_col_offset?: number;
  [key: string]: any;
}

/**
 * Converts 1-indexed line and 0-indexed column coordinates to string slice index.
 */
function lineColToOffset(lines: string[], line: number, col: number): number {
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for \n
  }
  return offset + col;
}

function replaceSlice(
  code: string,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
  replacement: string
): string {
  const lines = code.split('\n');
  const startIdx = lineColToOffset(lines, startLine, startCol);
  const endIdx = lineColToOffset(lines, endLine, endCol);
  return code.slice(0, startIdx) + replacement + code.slice(endIdx);
}

function extractSlice(
  code: string,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number
): string {
  const lines = code.split('\n');
  const startIdx = lineColToOffset(lines, startLine, startCol);
  const endIdx = lineColToOffset(lines, endLine, endCol);
  return code.slice(startIdx, endIdx);
}

export class PythonLanguageProvider implements LanguageProvider {
  public readonly language = 'python';
  public readonly aliases = ['py', 'python3'];

  public parseAndValidate(code: string): { valid: boolean; error?: string } {
    try {
      pyParse(code);
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'Python syntax error' };
    }
  }

  public findCandidates(code: string): MutationCandidate[] {
    let tree: ASTNode;
    try {
      tree = pyParse(code) as ASTNode;
    } catch {
      return [];
    }

    const candidates: MutationCandidate[] = [];
    const lines = code.split('\n');

    // Collect all variables in scopes for variable swaps
    const functionScopes: Array<{ name: string; vars: string[] }> = [];

    // Helper to walk the AST
    function walk(node: ASTNode, parent?: ASTNode) {
      if (!node || typeof node !== 'object') return;

      // Track function scopes
      if (node.nodeType === 'FunctionDef') {
        const localVars: string[] = [];
        if (node.args?.args) {
          for (const arg of node.args.args) {
            if (arg.arg) localVars.push(arg.arg);
          }
        }
        functionScopes.push({ name: node.name, vars: localVars });
      }

      // Check for node candidates
      checkNode(node, parent);

      // Recurse into children
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const val = node[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === 'object' && item.nodeType) {
              walk(item, node);
            }
          }
        } else if (val && typeof val === 'object' && val.nodeType) {
          walk(val, node);
        }
      }

      if (node.nodeType === 'FunctionDef') {
        functionScopes.pop();
      }
    }

    function addCandidate(
      mutationType: MutationTypeCode,
      location: SourceLocation,
      originalFragment: string,
      mutatedFragment: string,
      description: string,
      applyFn: () => string
    ) {
      candidates.push({
        id: `cand_py_${candidates.length + 1}_${mutationType}`,
        mutationType,
        language: 'python',
        location,
        originalFragment,
        mutatedFragment,
        description,
        apply: applyFn,
      });
    }

    function checkNode(node: ASTNode, parent?: ASTNode) {
      if (!node.lineno || node.col_offset === undefined) return;
      const startLine = node.lineno;
      const startCol = node.col_offset;
      const endLine = node.end_lineno ?? startLine;
      const endCol = node.end_col_offset ?? startCol;

      // 1-6. Comparisons
      if (node.nodeType === 'Compare' && Array.isArray(node.ops) && node.ops.length === 1) {
        const op = node.ops[0];
        const opType = op.nodeType;
        const compText = extractSlice(code, startLine, startCol, endLine, endCol);

        const map: Record<string, { targetType: MutationTypeCode; from: string; to: string; desc: string }> = {
          Gt: { targetType: 'GREATER_THAN_TO_GREATER_EQUAL', from: '>', to: '>=', desc: 'Mutated > to >=' },
          GtE: { targetType: 'GREATER_EQUAL_TO_GREATER_THAN', from: '>=', to: '>', desc: 'Mutated >= to >' },
          Lt: { targetType: 'LESS_THAN_TO_LESS_EQUAL', from: '<', to: '<=', desc: 'Mutated < to <=' },
          LtE: { targetType: 'LESS_EQUAL_TO_LESS_THAN', from: '<=', to: '<', desc: 'Mutated <= to <' },
          Eq: { targetType: 'EQUAL_TO_NOT_EQUAL', from: '==', to: '!=', desc: 'Mutated == to !=' },
          NotEq: { targetType: 'NOT_EQUAL_TO_EQUAL', from: '!=', to: '==', desc: 'Mutated != to ==' },
        };

        if (map[opType]) {
          const cfg = map[opType];
          // Find operator between left and comparator
          const opMatchIndex = compText.indexOf(cfg.from);
          if (opMatchIndex !== -1) {
            const mutatedCompText =
              compText.slice(0, opMatchIndex) + cfg.to + compText.slice(opMatchIndex + cfg.from.length);
            addCandidate(
              cfg.targetType,
              { line: startLine, column: startCol, endLine, endColumn: endCol },
              compText,
              mutatedCompText,
              cfg.desc,
              () => replaceSlice(code, startLine, startCol, endLine, endCol, mutatedCompText)
            );
          }
        }
      }

      // 7-10. Binary Arithmetic Operations
      if (node.nodeType === 'BinOp' && node.op) {
        const opType = node.op.nodeType;
        const binText = extractSlice(code, startLine, startCol, endLine, endCol);

        const binMap: Record<string, { targetType: MutationTypeCode; from: string; to: string; desc: string }> = {
          Add: { targetType: 'PLUS_TO_MINUS', from: '+', to: '-', desc: 'Mutated + to -' },
          Sub: { targetType: 'MINUS_TO_PLUS', from: '-', to: '+', desc: 'Mutated - to +' },
          Mult: { targetType: 'MULTIPLY_TO_DIVIDE', from: '*', to: '/', desc: 'Mutated * to /' },
          Div: { targetType: 'DIVIDE_TO_MULTIPLY', from: '/', to: '*', desc: 'Mutated / to *' },
          FloorDiv: { targetType: 'DIVIDE_TO_MULTIPLY', from: '//', to: '*', desc: 'Mutated // to *' },
        };

        if (binMap[opType]) {
          const cfg = binMap[opType];
          // Find operator symbol
          const opIdx = binText.indexOf(cfg.from);
          if (opIdx !== -1) {
            const mutatedBinText =
              binText.slice(0, opIdx) + cfg.to + binText.slice(opIdx + cfg.from.length);
            addCandidate(
              cfg.targetType,
              { line: startLine, column: startCol, endLine, endColumn: endCol },
              binText,
              mutatedBinText,
              cfg.desc,
              () => replaceSlice(code, startLine, startCol, endLine, endCol, mutatedBinText)
            );
          }
        }
      }

      // 11-12. Logical AND / OR
      if (node.nodeType === 'BoolOp' && node.op) {
        const opType = node.op.nodeType;
        const boolText = extractSlice(code, startLine, startCol, endLine, endCol);

        if (opType === 'And' && /\band\b/.test(boolText)) {
          const mutated = boolText.replace(/\band\b/, 'or');
          addCandidate(
            'AND_TO_OR',
            { line: startLine, column: startCol, endLine, endColumn: endCol },
            boolText,
            mutated,
            'Mutated and to or',
            () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
          );
        } else if (opType === 'Or' && /\bor\b/.test(boolText)) {
          const mutated = boolText.replace(/\bor\b/, 'and');
          addCandidate(
            'OR_TO_AND',
            { line: startLine, column: startCol, endLine, endColumn: endCol },
            boolText,
            mutated,
            'Mutated or to and',
            () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
          );
        }
      }

      // 13. Boolean Negation
      if (node.nodeType === 'Constant' && typeof node.value === 'boolean') {
        const frag = extractSlice(code, startLine, startCol, endLine, endCol);
        if (frag === 'True' || frag === 'False') {
          const mutated = frag === 'True' ? 'False' : 'True';
          addCandidate(
            'BOOLEAN_NEGATION',
            { line: startLine, column: startCol, endLine, endColumn: endCol },
            frag,
            mutated,
            `Inverted boolean literal ${frag} to ${mutated}`,
            () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
          );
        }
      }

      // 14. Conditional Branch Inversion
      if (node.nodeType === 'If' && node.test && node.test.lineno) {
        const testStartL = node.test.lineno;
        const testStartC = node.test.col_offset;
        const testEndL = node.test.end_lineno ?? testStartL;
        const testEndC = node.test.end_col_offset ?? testStartC;
        const testFrag = extractSlice(code, testStartL, testStartC, testEndL, testEndC);

        // Invert test condition safely with 'not (test)'
        if (testFrag && testFrag.trim().length > 0) {
          const mutatedTest = `not (${testFrag})`;
          addCandidate(
            'CONDITIONAL_BRANCH_INVERSION',
            { line: testStartL, column: testStartC, endLine: testEndL, endColumn: testEndC },
            testFrag,
            mutatedTest,
            'Inverted if condition with not (...)',
            () => replaceSlice(code, testStartL, testStartC, testEndL, testEndC, mutatedTest)
          );
        }
      }

      // 15. Loop Boundary Off-by-One
      if (
        node.nodeType === 'For' &&
        node.iter?.nodeType === 'Call' &&
        node.iter.func?.id === 'range' &&
        node.iter.args?.length >= 1
      ) {
        const lastArg = node.iter.args[node.iter.args.length - 1];
        if (lastArg.lineno && lastArg.col_offset !== undefined) {
          const aStartL = lastArg.lineno;
          const aStartC = lastArg.col_offset;
          const aEndL = lastArg.end_lineno ?? aStartL;
          const aEndC = lastArg.end_col_offset ?? aStartC;
          const argFrag = extractSlice(code, aStartL, aStartC, aEndL, aEndC);
          const mutatedArg = `(${argFrag} + 1)`;

          addCandidate(
            'LOOP_BOUNDARY_OFF_BY_ONE',
            { line: aStartL, column: aStartC, endLine: aEndL, endColumn: aEndC },
            argFrag,
            mutatedArg,
            'Off-by-one loop boundary adjustment',
            () => replaceSlice(code, aStartL, aStartC, aEndL, aEndC, mutatedArg)
          );
        }
      }

      // 16. Loop Condition Mutation
      if (node.nodeType === 'While' && node.test?.lineno) {
        const tStartL = node.test.lineno;
        const tStartC = node.test.col_offset;
        const tEndL = node.test.end_lineno ?? tStartL;
        const tEndC = node.test.end_col_offset ?? tStartC;
        const testFrag = extractSlice(code, tStartL, tStartC, tEndL, tEndC);

        let mutatedTest = testFrag;
        if (testFrag.includes('<=')) mutatedTest = testFrag.replace('<=', '<');
        else if (testFrag.includes('<')) mutatedTest = testFrag.replace('<', '<=');
        else if (testFrag.includes('>=')) mutatedTest = testFrag.replace('>=', '>');
        else if (testFrag.includes('>')) mutatedTest = testFrag.replace('>', '>=');
        else mutatedTest = `not (${testFrag})`;

        if (mutatedTest !== testFrag) {
          addCandidate(
            'LOOP_CONDITION_MUTATION',
            { line: tStartL, column: tStartC, endLine: tEndL, endColumn: tEndC },
            testFrag,
            mutatedTest,
            'Mutated while loop continuation predicate',
            () => replaceSlice(code, tStartL, tStartC, tEndL, tEndC, mutatedTest)
          );
        }
      }

      // 17 & 27. Loop Step / Accumulator Mutation (AugAssign)
      if (node.nodeType === 'AugAssign' && node.op) {
        const augText = extractSlice(code, startLine, startCol, endLine, endCol);
        if (augText.includes('+=') && node.op.nodeType === 'Add') {
          const mutated = augText.replace('+=', '-=');
          // Candidate for LOOP_INCREMENT_DECREMENT_MUTATION
          addCandidate(
            'LOOP_INCREMENT_DECREMENT_MUTATION',
            { line: startLine, column: startCol, endLine, endColumn: endCol },
            augText,
            mutated,
            'Mutated += step to -=',
            () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
          );
          // Candidate for ACCUMULATOR_AGGREGATION_MUTATION
          addCandidate(
            'ACCUMULATOR_AGGREGATION_MUTATION',
            { line: startLine, column: startCol, endLine, endColumn: endCol },
            augText,
            mutated,
            'Inverted accumulator addition to subtraction',
            () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
          );
        } else if (augText.includes('-=') && node.op.nodeType === 'Sub') {
          const mutated = augText.replace('-=', '+=');
          addCandidate(
            'LOOP_INCREMENT_DECREMENT_MUTATION',
            { line: startLine, column: startCol, endLine, endColumn: endCol },
            augText,
            mutated,
            'Mutated -= step to +=',
            () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
          );
        }
      }

      // 18. Variable Reference Swap
      if (node.nodeType === 'Name' && parent?.nodeType !== 'FunctionDef' && parent?.nodeType !== 'ClassDef') {
        const currentScope = functionScopes[functionScopes.length - 1];
        if (currentScope && currentScope.vars.length >= 2 && currentScope.vars.includes(node.id)) {
          const otherVar = currentScope.vars.find((v) => v !== node.id);
          if (otherVar) {
            const frag = extractSlice(code, startLine, startCol, endLine, endCol);
            if (frag === node.id) {
              addCandidate(
                'VARIABLE_REFERENCE_SWAP',
                { line: startLine, column: startCol, endLine, endColumn: endCol },
                frag,
                otherVar,
                `Swapped variable reference ${node.id} with ${otherVar}`,
                () => replaceSlice(code, startLine, startCol, endLine, endCol, otherVar)
              );
            }
          }
        }
      }

      // 19. Variable Swap
      if (node.nodeType === 'Assign' && node.targets?.length === 1 && node.value) {
        const currentScope = functionScopes[functionScopes.length - 1];
        if (currentScope && currentScope.vars.length >= 2) {
          const target = node.targets[0];
          if (target.nodeType === 'Name' && currentScope.vars.includes(target.id)) {
            const otherVar = currentScope.vars.find((v) => v !== target.id);
            if (otherVar) {
              const frag = extractSlice(code, startLine, startCol, endLine, endCol);
              const mutated = frag.replace(new RegExp(`\\b${target.id}\\b`), otherVar);
              if (mutated !== frag) {
                addCandidate(
                  'VARIABLE_SWAP',
                  { line: startLine, column: startCol, endLine, endColumn: endCol },
                  frag,
                  mutated,
                  `Swapped assignment target ${target.id} to ${otherVar}`,
                  () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
                );
              }
            }
          }
        }
      }

      // 20 & 21. Constant Literal & Initialization Value Mutation
      if (node.nodeType === 'Constant' && typeof node.value === 'number') {
        const numVal = node.value;
        const frag = extractSlice(code, startLine, startCol, endLine, endCol);
        if (frag === String(numVal)) {
          const delta = numVal === 0 ? 1 : numVal + 1;
          const mutated = String(delta);

          // Constant literal mutation
          addCandidate(
            'CONSTANT_LITERAL_MUTATION',
            { line: startLine, column: startCol, endLine, endColumn: endCol },
            frag,
            mutated,
            `Mutated numeric literal from ${frag} to ${mutated}`,
            () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
          );

          // If inside variable assignment, also valid initialization mutation
          if (parent?.nodeType === 'Assign') {
            addCandidate(
              'INITIALIZATION_VALUE_MUTATION',
              { line: startLine, column: startCol, endLine, endColumn: endCol },
              frag,
              mutated,
              `Altered initialization state value from ${frag} to ${mutated}`,
              () => replaceSlice(code, startLine, startCol, endLine, endCol, mutated)
            );
          }
        }
      }

      // 22 & 23. Array Index & Collection Element Selection Mutation
      if (node.nodeType === 'Subscript' && node.slice) {
        const sliceNode = node.slice;
        // If sliceNode is a Python Slice (e.g. [::-1] or [1:3]), it is a range/stride, not a discrete index scalar
        if (sliceNode.nodeType !== 'Slice' && sliceNode.lineno && sliceNode.col_offset !== undefined) {
          const sStartL = sliceNode.lineno;
          const sStartC = sliceNode.col_offset;
          const sEndL = sliceNode.end_lineno ?? sStartL;
          const sEndC = sliceNode.end_col_offset ?? sStartC;
          const sliceFrag = extractSlice(code, sStartL, sStartC, sEndL, sEndC);

          // Array index offset
          const mutatedIndex = `(${sliceFrag} + 1)`;
          addCandidate(
            'ARRAY_INDEX_MUTATION',
            { line: sStartL, column: sStartC, endLine: sEndL, endColumn: sEndC },
            sliceFrag,
            mutatedIndex,
            `Altered subscript index to ${mutatedIndex}`,
            () => replaceSlice(code, sStartL, sStartC, sEndL, sEndC, mutatedIndex)
          );

          // Collection element selection (e.g. 0 -> -1)
          if (sliceFrag.trim() === '0') {
            addCandidate(
              'COLLECTION_ELEMENT_SELECTION_MUTATION',
              { line: sStartL, column: sStartC, endLine: sEndL, endColumn: sEndC },
              sliceFrag,
              '-1',
              'Altered collection selection index from first (0) to last (-1)',
              () => replaceSlice(code, sStartL, sStartC, sEndL, sEndC, '-1')
            );
          } else if (sliceFrag.trim() === '-1') {
            addCandidate(
              'COLLECTION_ELEMENT_SELECTION_MUTATION',
              { line: sStartL, column: sStartC, endLine: sEndL, endColumn: sEndC },
              sliceFrag,
              '0',
              'Altered collection selection index from last (-1) to first (0)',
              () => replaceSlice(code, sStartL, sStartC, sEndL, sEndC, '0')
            );
          }
        }
      }

      // 24. Function Argument Mutation (exclude built-in I/O and type helpers like map, range, int, print)
      const excludedCallFns = new Set([
        'map', 'filter', 'isinstance', 'issubclass', 'getattr', 'setattr', 'hasattr',
        'open', 'print', 'input', 'int', 'float', 'str', 'range', 'enumerate', 'zip',
      ]);
      const callFnName = node.func?.id || node.func?.attr || '';
      if (
        node.nodeType === 'Call' &&
        !excludedCallFns.has(callFnName) &&
        Array.isArray(node.args) &&
        node.args.length >= 2
      ) {
        const arg1 = node.args[0];
        const arg2 = node.args[1];
        if (arg1.lineno && arg2.lineno) {
          const a1Frag = extractSlice(
            code,
            arg1.lineno,
            arg1.col_offset,
            arg1.end_lineno ?? arg1.lineno,
            arg1.end_col_offset ?? arg1.col_offset
          );
          const a2Frag = extractSlice(
            code,
            arg2.lineno,
            arg2.col_offset,
            arg2.end_lineno ?? arg2.lineno,
            arg2.end_col_offset ?? arg2.col_offset
          );

          if (a1Frag !== a2Frag) {
            const callFrag = extractSlice(code, startLine, startCol, endLine, endCol);
            const mutatedCall = callFrag.replace(
              new RegExp(`${escapeRegExp(a1Frag)}(\\s*,\\s*)${escapeRegExp(a2Frag)}`),
              `${a2Frag}$1${a1Frag}`
            );

            if (mutatedCall !== callFrag) {
              addCandidate(
                'FUNCTION_ARGUMENT_MUTATION',
                { line: startLine, column: startCol, endLine, endColumn: endCol },
                callFrag,
                mutatedCall,
                `Swapped positional arguments in call to ${a2Frag}, ${a1Frag}`,
                () => replaceSlice(code, startLine, startCol, endLine, endCol, mutatedCall)
              );
            }
          }
        }
      }

      // 25. Return Value Mutation
      if (node.nodeType === 'Return' && node.value && node.value.lineno) {
        const val = node.value;
        const vStartL = val.lineno;
        const vStartC = val.col_offset;
        const vEndL = val.end_lineno ?? vStartL;
        const vEndC = val.end_col_offset ?? vStartC;
        const valFrag = extractSlice(code, vStartL, vStartC, vEndL, vEndC);

        if (valFrag && valFrag !== 'None') {
          addCandidate(
            'RETURN_VALUE_MUTATION',
            { line: vStartL, column: vStartC, endLine: vEndL, endColumn: vEndC },
            valFrag,
            'None',
            'Altered return value expression to None',
            () => replaceSlice(code, vStartL, vStartC, vEndL, vEndC, 'None')
          );
        }
      }

      // 26. Min/Max Swap
      if (node.nodeType === 'Call' && node.func?.nodeType === 'Name') {
        const fnName = node.func.id;
        if (fnName === 'min' || fnName === 'max') {
          const fnStartL = node.func.lineno;
          const fnStartC = node.func.col_offset;
          const fnEndL = node.func.end_lineno ?? fnStartL;
          const fnEndC = node.func.end_col_offset ?? fnStartC;
          const replacement = fnName === 'min' ? 'max' : 'min';

          addCandidate(
            'MIN_MAX_SWAP',
            { line: fnStartL, column: fnStartC, endLine: fnEndL, endColumn: fnEndC },
            fnName,
            replacement,
            `Swapped built-in ${fnName}() to ${replacement}()`,
            () => replaceSlice(code, fnStartL, fnStartC, fnEndL, fnEndC, replacement)
          );
        }

        // 27. Accumulator Aggregation Mutation (e.g. sum(x) -> len(x))
        if (fnName === 'sum') {
          const fnStartL = node.func.lineno;
          const fnStartC = node.func.col_offset;
          const fnEndL = node.func.end_lineno ?? fnStartL;
          const fnEndC = node.func.end_col_offset ?? fnStartC;

          addCandidate(
            'ACCUMULATOR_AGGREGATION_MUTATION',
            { line: fnStartL, column: fnStartC, endLine: fnEndL, endColumn: fnEndC },
            'sum',
            'len',
            'Mutated aggregation sum() to len()',
            () => replaceSlice(code, fnStartL, fnStartC, fnEndL, fnEndC, 'len')
          );
        }
      }
    }

    walk(tree);
    return candidates;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
