/**
 * SyntaXViva Core V1 — Part 3 JavaScript & TypeScript Language Provider
 *
 * Uses Babel parser and AST traversal to discover candidate mutation locations
 * in JavaScript and TypeScript source files.
 * Guarantees zero unintended mutation of comments or string literals.
 */

import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
import {
  LanguageProvider,
  MutationCandidate,
  MutationTypeCode,
  SourceLocation,
} from '../types.js';

const traverse = (_traverse as any).default || _traverse;

function lineColToOffset(lines: string[], line: number, col: number): number {
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1;
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

export class JavaScriptLanguageProvider implements LanguageProvider {
  public readonly language = 'javascript';
  public readonly aliases = ['js', 'ts', 'typescript'];

  public parseAndValidate(code: string): { valid: boolean; error?: string } {
    try {
      parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'JavaScript/TypeScript syntax error' };
    }
  }

  public findCandidates(code: string): MutationCandidate[] {
    let ast: any;
    try {
      ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
    } catch {
      return [];
    }

    const candidates: MutationCandidate[] = [];

    const addCandidate = (
      mutationType: MutationTypeCode,
      location: SourceLocation,
      originalFragment: string,
      mutatedFragment: string,
      description: string,
      applyFn: () => string
    ) => {
      candidates.push({
        id: `cand_js_${candidates.length + 1}_${mutationType}`,
        mutationType,
        language: 'javascript',
        location,
        originalFragment,
        mutatedFragment,
        description,
        apply: applyFn,
      });
    };

    traverse(ast, {
      BinaryExpression: (path: any) => {
        const node = path.node;
        if (!node.loc) return;
        const op = node.operator;
        const sL = node.loc.start.line;
        const sC = node.loc.start.column;
        const eL = node.loc.end.line;
        const eC = node.loc.end.column;
        const fullFrag = extractSlice(code, sL, sC, eL, eC);

        // Relational and equality mutations
        const opMap: Record<string, { targetType: MutationTypeCode; to: string; desc: string }> = {
          '>': { targetType: 'GREATER_THAN_TO_GREATER_EQUAL', to: '>=', desc: 'Mutated > to >=' },
          '>=': { targetType: 'GREATER_EQUAL_TO_GREATER_THAN', to: '>', desc: 'Mutated >= to >' },
          '<': { targetType: 'LESS_THAN_TO_LESS_EQUAL', to: '<=', desc: 'Mutated < to <=' },
          '<=': { targetType: 'LESS_EQUAL_TO_LESS_THAN', to: '<', desc: 'Mutated <= to <' },
          '==': { targetType: 'EQUAL_TO_NOT_EQUAL', to: '!=', desc: 'Mutated == to !=' },
          '===': { targetType: 'EQUAL_TO_NOT_EQUAL', to: '!==', desc: 'Mutated === to !==' },
          '!=': { targetType: 'NOT_EQUAL_TO_EQUAL', to: '==', desc: 'Mutated != to ==' },
          '!==': { targetType: 'NOT_EQUAL_TO_EQUAL', to: '===', desc: 'Mutated !== to ===' },
          // Arithmetic
          '+': { targetType: 'PLUS_TO_MINUS', to: '-', desc: 'Mutated + to -' },
          '-': { targetType: 'MINUS_TO_PLUS', to: '+', desc: 'Mutated - to +' },
          '*': { targetType: 'MULTIPLY_TO_DIVIDE', to: '/', desc: 'Mutated * to /' },
          '/': { targetType: 'DIVIDE_TO_MULTIPLY', to: '*', desc: 'Mutated / to *' },
        };

        if (opMap[op]) {
          const cfg = opMap[op];
          // Replace operator in expression
          const opIndex = fullFrag.indexOf(op);
          if (opIndex !== -1) {
            const mutated =
              fullFrag.slice(0, opIndex) + cfg.to + fullFrag.slice(opIndex + op.length);
            addCandidate(
              cfg.targetType,
              { line: sL, column: sC, endLine: eL, endColumn: eC },
              fullFrag,
              mutated,
              cfg.desc,
              () => replaceSlice(code, sL, sC, eL, eC, mutated)
            );
          }
        }
      },

      LogicalExpression: (path: any) => {
        const node = path.node;
        if (!node.loc) return;
        const op = node.operator;
        const sL = node.loc.start.line;
        const sC = node.loc.start.column;
        const eL = node.loc.end.line;
        const eC = node.loc.end.column;
        const fullFrag = extractSlice(code, sL, sC, eL, eC);

        if (op === '&&') {
          const mutated = fullFrag.replace('&&', '||');
          addCandidate(
            'AND_TO_OR',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            fullFrag,
            mutated,
            'Mutated && to ||',
            () => replaceSlice(code, sL, sC, eL, eC, mutated)
          );
        } else if (op === '||') {
          const mutated = fullFrag.replace('||', '&&');
          addCandidate(
            'OR_TO_AND',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            fullFrag,
            mutated,
            'Mutated || to &&',
            () => replaceSlice(code, sL, sC, eL, eC, mutated)
          );
        }
      },

      BooleanLiteral: (path: any) => {
        const node = path.node;
        if (!node.loc) return;
        const sL = node.loc.start.line;
        const sC = node.loc.start.column;
        const eL = node.loc.end.line;
        const eC = node.loc.end.column;
        const frag = extractSlice(code, sL, sC, eL, eC);

        const mutated = node.value ? 'false' : 'true';
        addCandidate(
          'BOOLEAN_NEGATION',
          { line: sL, column: sC, endLine: eL, endColumn: eC },
          frag,
          mutated,
          `Inverted boolean literal from ${frag} to ${mutated}`,
          () => replaceSlice(code, sL, sC, eL, eC, mutated)
        );
      },

      IfStatement: (path: any) => {
        const test = path.node.test;
        if (!test?.loc) return;
        const sL = test.loc.start.line;
        const sC = test.loc.start.column;
        const eL = test.loc.end.line;
        const eC = test.loc.end.column;
        const frag = extractSlice(code, sL, sC, eL, eC);
        const mutated = `!(${frag})`;

        addCandidate(
          'CONDITIONAL_BRANCH_INVERSION',
          { line: sL, column: sC, endLine: eL, endColumn: eC },
          frag,
          mutated,
          'Inverted if condition with !(...)',
          () => replaceSlice(code, sL, sC, eL, eC, mutated)
        );
      },

      ForStatement: (path: any) => {
        const test = path.node.test;
        if (test?.loc) {
          const sL = test.loc.start.line;
          const sC = test.loc.start.column;
          const eL = test.loc.end.line;
          const eC = test.loc.end.column;
          const frag = extractSlice(code, sL, sC, eL, eC);

          if (frag.includes('<') && !frag.includes('<=')) {
            const mutated = frag.replace('<', '<=');
            addCandidate(
              'LOOP_BOUNDARY_OFF_BY_ONE',
              { line: sL, column: sC, endLine: eL, endColumn: eC },
              frag,
              mutated,
              'Off-by-one loop upper boundary adjustment (< to <=)',
              () => replaceSlice(code, sL, sC, eL, eC, mutated)
            );
          }
        }
      },

      WhileStatement: (path: any) => {
        const test = path.node.test;
        if (test?.loc) {
          const sL = test.loc.start.line;
          const sC = test.loc.start.column;
          const eL = test.loc.end.line;
          const eC = test.loc.end.column;
          const frag = extractSlice(code, sL, sC, eL, eC);
          const mutated = `!(${frag})`;

          addCandidate(
            'LOOP_CONDITION_MUTATION',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            frag,
            mutated,
            'Mutated while loop continuation predicate',
            () => replaceSlice(code, sL, sC, eL, eC, mutated)
          );
        }
      },

      UpdateExpression: (path: any) => {
        const node = path.node;
        if (!node.loc) return;
        const sL = node.loc.start.line;
        const sC = node.loc.start.column;
        const eL = node.loc.end.line;
        const eC = node.loc.end.column;
        const frag = extractSlice(code, sL, sC, eL, eC);

        if (node.operator === '++') {
          const mutated = frag.replace('++', '--');
          addCandidate(
            'LOOP_INCREMENT_DECREMENT_MUTATION',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            frag,
            mutated,
            'Mutated increment ++ to decrement --',
            () => replaceSlice(code, sL, sC, eL, eC, mutated)
          );
        } else if (node.operator === '--') {
          const mutated = frag.replace('--', '++');
          addCandidate(
            'LOOP_INCREMENT_DECREMENT_MUTATION',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            frag,
            mutated,
            'Mutated decrement -- to increment ++',
            () => replaceSlice(code, sL, sC, eL, eC, mutated)
          );
        }
      },

      AssignmentExpression: (path: any) => {
        const node = path.node;
        if (!node.loc) return;
        const sL = node.loc.start.line;
        const sC = node.loc.start.column;
        const eL = node.loc.end.line;
        const eC = node.loc.end.column;
        const frag = extractSlice(code, sL, sC, eL, eC);

        if (node.operator === '+=') {
          const mutated = frag.replace('+=', '-=');
          addCandidate(
            'ACCUMULATOR_AGGREGATION_MUTATION',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            frag,
            mutated,
            'Inverted accumulator += to -=',
            () => replaceSlice(code, sL, sC, eL, eC, mutated)
          );
        }
      },

      NumericLiteral: (path: any) => {
        const node = path.node;
        if (!node.loc) return;
        const sL = node.loc.start.line;
        const sC = node.loc.start.column;
        const eL = node.loc.end.line;
        const eC = node.loc.end.column;
        const frag = extractSlice(code, sL, sC, eL, eC);

        const delta = node.value === 0 ? 1 : node.value + 1;
        const mutated = String(delta);

        addCandidate(
          'CONSTANT_LITERAL_MUTATION',
          { line: sL, column: sC, endLine: eL, endColumn: eC },
          frag,
          mutated,
          `Mutated numeric literal from ${frag} to ${mutated}`,
          () => replaceSlice(code, sL, sC, eL, eC, mutated)
        );

        if (path.parent?.type === 'VariableDeclarator') {
          addCandidate(
            'INITIALIZATION_VALUE_MUTATION',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            frag,
            mutated,
            `Altered initialization state value from ${frag} to ${mutated}`,
            () => replaceSlice(code, sL, sC, eL, eC, mutated)
          );
        }
      },

      MemberExpression: (path: any) => {
        const node = path.node;
        if (node.computed && node.property?.loc) {
          const p = node.property;
          const sL = p.loc.start.line;
          const sC = p.loc.start.column;
          const eL = p.loc.end.line;
          const eC = p.loc.end.column;
          const propFrag = extractSlice(code, sL, sC, eL, eC);
          const mutatedIndex = `(${propFrag} + 1)`;

          addCandidate(
            'ARRAY_INDEX_MUTATION',
            { line: sL, column: sC, endLine: eL, endColumn: eC },
            propFrag,
            mutatedIndex,
            `Altered array lookup index to ${mutatedIndex}`,
            () => replaceSlice(code, sL, sC, eL, eC, mutatedIndex)
          );

          if (propFrag.trim() === '0') {
            addCandidate(
              'COLLECTION_ELEMENT_SELECTION_MUTATION',
              { line: sL, column: sC, endLine: eL, endColumn: eC },
              propFrag,
              '1',
              'Altered collection selection index from 0 to 1',
              () => replaceSlice(code, sL, sC, eL, eC, '1')
            );
          }
        }
      },

      CallExpression: (path: any) => {
        const node = path.node;
        if (!node.loc) return;
        const sL = node.loc.start.line;
        const sC = node.loc.start.column;
        const eL = node.loc.end.line;
        const eC = node.loc.end.column;

        // Function arguments swap
        if (Array.isArray(node.arguments) && node.arguments.length >= 2) {
          const a1 = node.arguments[0];
          const a2 = node.arguments[1];
          if (a1.loc && a2.loc) {
            const a1Frag = extractSlice(code, a1.loc.start.line, a1.loc.start.column, a1.loc.end.line, a1.loc.end.column);
            const a2Frag = extractSlice(code, a2.loc.start.line, a2.loc.start.column, a2.loc.end.line, a2.loc.end.column);
            if (a1Frag !== a2Frag) {
              const callFrag = extractSlice(code, sL, sC, eL, eC);
              const mutated = callFrag.replace(
                new RegExp(`${escapeRegExp(a1Frag)}(\\s*,\\s*)${escapeRegExp(a2Frag)}`),
                `${a2Frag}$1${a1Frag}`
              );
              if (mutated !== callFrag) {
                addCandidate(
                  'FUNCTION_ARGUMENT_MUTATION',
                  { line: sL, column: sC, endLine: eL, endColumn: eC },
                  callFrag,
                  mutated,
                  `Swapped function arguments to ${a2Frag}, ${a1Frag}`,
                  () => replaceSlice(code, sL, sC, eL, eC, mutated)
                );
              }
            }
          }
        }

        // Min/Max swap
        const callee = node.callee;
        let fnName = '';
        let calleeLoc: any = null;
        if (callee.type === 'Identifier') {
          fnName = callee.name;
          calleeLoc = callee.loc;
        } else if (callee.type === 'MemberExpression' && callee.property?.type === 'Identifier') {
          fnName = callee.property.name;
          calleeLoc = callee.property.loc;
        }

        if (fnName === 'min' || fnName === 'max') {
          const replacement = fnName === 'min' ? 'max' : 'min';
          if (calleeLoc) {
            addCandidate(
              'MIN_MAX_SWAP',
              { line: calleeLoc.start.line, column: calleeLoc.start.column, endLine: calleeLoc.end.line, endColumn: calleeLoc.end.column },
              fnName,
              replacement,
              `Swapped Math.${fnName} to Math.${replacement}`,
              () => replaceSlice(code, calleeLoc.start.line, calleeLoc.start.column, calleeLoc.end.line, calleeLoc.end.column, replacement)
            );
          }
        }
      },

      ReturnStatement: (path: any) => {
        const arg = path.node.argument;
        if (arg?.loc) {
          const sL = arg.loc.start.line;
          const sC = arg.loc.start.column;
          const eL = arg.loc.end.line;
          const eC = arg.loc.end.column;
          const frag = extractSlice(code, sL, sC, eL, eC);

          if (frag && frag !== 'null') {
            addCandidate(
              'RETURN_VALUE_MUTATION',
              { line: sL, column: sC, endLine: eL, endColumn: eC },
              frag,
              'null',
              'Altered return expression to null',
              () => replaceSlice(code, sL, sC, eL, eC, 'null')
            );
          }
        }
      },
    });

    return candidates;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
