import fs from 'fs';
import path from 'path';
import os from 'os';
import vm from 'vm';
import { spawn, spawnSync } from 'child_process';

export interface SandboxExecutionResult {
  status?: 'OK' | 'Compilation Error' | 'Runtime Error' | 'Time Limit Exceeded';
  message?: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  error?: string;
  durationMs: number;
}

const MAX_OUTPUT_BUFFER_BYTES = 64 * 1024; // 64 KB max output to prevent memory exhaustion
const DEFAULT_TIMEOUT_MS = 3000; // 3.0s per test case execution

let cachedPythonCmd: string | null = null;
function resolvePythonCommand(): string {
  if (cachedPythonCmd) return cachedPythonCmd;
  const candidates = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['--version'], { timeout: 2000, windowsHide: true });
      if (res.status === 0) {
        cachedPythonCmd = cmd;
        return cmd;
      }
    } catch {
      // try next
    }
  }
  cachedPythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  return cachedPythonCmd;
}

const compilerAvailabilityCache: Record<string, boolean> = {};
function isBinaryAvailable(bin: string): boolean {
  if (bin in compilerAvailabilityCache) {
    return compilerAvailabilityCache[bin];
  }
  try {
    const res = spawnSync(bin, ['--version'], { timeout: 2000, windowsHide: true });
    const ok = res.status === 0 || (res.error == null && res.status !== null);
    compilerAvailabilityCache[bin] = ok;
    return ok;
  } catch {
    compilerAvailabilityCache[bin] = false;
    return false;
  }
}

export interface LanguageConfigEntry {
  extension: string;
  isCompiled: boolean;
  compilerBin?: string;
  compileCmd?: (fileName: string, binaryName: string) => string;
  runCmd: (targetName: string) => string;
}

export const LANGUAGE_CONFIG: Record<string, LanguageConfigEntry> = {
  python: {
    extension: 'py',
    isCompiled: false,
    runCmd: (fileName: string) => `${resolvePythonCommand()} -u -B "${fileName}"`,
  },
  py: {
    extension: 'py',
    isCompiled: false,
    runCmd: (fileName: string) => `${resolvePythonCommand()} -u -B "${fileName}"`,
  },
  javascript: {
    extension: 'js',
    isCompiled: false,
    runCmd: (fileName: string) => `node --max-old-space-size=128 "${fileName}"`,
  },
  js: {
    extension: 'js',
    isCompiled: false,
    runCmd: (fileName: string) => `node --max-old-space-size=128 "${fileName}"`,
  },
  typescript: {
    extension: 'ts',
    isCompiled: false,
    runCmd: (fileName: string) => `node --max-old-space-size=128 "${fileName}"`,
  },
  ts: {
    extension: 'ts',
    isCompiled: false,
    runCmd: (fileName: string) => `node --max-old-space-size=128 "${fileName}"`,
  },
  cpp: {
    extension: 'cpp',
    isCompiled: true,
    compilerBin: 'g++',
    compileCmd: (fileName: string, binaryName: string) => `g++ "${fileName}" -O2 -o "${binaryName}"`,
    runCmd: (binaryName: string) =>
      process.platform === 'win32' ? `"${binaryName}.exe"` : `./"${binaryName}"`,
  },
  c: {
    extension: 'c',
    isCompiled: true,
    compilerBin: 'gcc',
    compileCmd: (fileName: string, binaryName: string) => `gcc "${fileName}" -O2 -o "${binaryName}"`,
    runCmd: (binaryName: string) =>
      process.platform === 'win32' ? `"${binaryName}.exe"` : `./"${binaryName}"`,
  },
  java: {
    extension: 'java',
    isCompiled: true,
    compilerBin: 'javac',
    compileCmd: (fileName: string, _binaryName: string) => `javac "${fileName}"`,
    runCmd: (binaryName: string) => `java "${binaryName}"`,
  },
};

function isStandalonePythonScript(code: string): boolean {
  const lines = code.split('\n');
  let inTripleQuote = false;
  let quoteChar = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!inTripleQuote) {
      if (trimmed.startsWith('"""')) {
        if (trimmed.length > 3 && trimmed.endsWith('"""')) continue;
        inTripleQuote = true;
        quoteChar = '"""';
        continue;
      }
      if (trimmed.startsWith("'''")) {
        if (trimmed.length > 3 && trimmed.endsWith("'''")) continue;
        inTripleQuote = true;
        quoteChar = "'''";
        continue;
      }
    } else {
      if (trimmed.includes(quoteChar)) {
        inTripleQuote = false;
      }
      continue;
    }

    if (trimmed.startsWith('#')) continue;

    const isIndented = line.startsWith(' ') || line.startsWith('\t');
    if (isIndented) continue;

    if (
      trimmed.startsWith('def ') ||
      trimmed.startsWith('async def ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('from ') ||
      trimmed.startsWith('@')
    ) {
      continue;
    }

    return true;
  }

  return false;
}

/**
 * Normalizes single-line or multi-line Python code into clean 4-space indented multi-line Python.
 * Handles single-line jammed Python without semicolons (e.g., `num1 = int(input()) num2 = int(input()) sum = num1 + num2 print(sum)`).
 */
export function normalizePythonSource(rawCode: string): string {
  if (!rawCode || !rawCode.trim()) return rawCode;
  const code = rawCode.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');

  interface ExtractedPyStmt {
    stmt: string;
    origIndent: number;
    wasJammed: boolean;
  }

  const splitSingleLinePython = (lineStr: string): ExtractedPyStmt[] => {
    const leadingSpaces = lineStr.match(/^\s*/)?.[0] || '';
    const origIndent = Math.round(leadingSpaces.length / 4);
    const trimmedLine = lineStr.trim();
    if (!trimmedLine) return [];
    if (trimmedLine.startsWith('#')) {
      return [{ stmt: trimmedLine, origIndent, wasJammed: false }];
    }

    let normalized = '';
    let inS = false;
    let inD = false;
    let pDepth = 0;

    for (let i = 0; i < trimmedLine.length; i++) {
      const ch = trimmedLine[i];
      const prev = i > 0 ? trimmedLine[i - 1] : '';

      if (ch === "'" && !inD && prev !== '\\') {
        inS = !inS;
        normalized += ch;
        continue;
      }
      if (ch === '"' && !inS && prev !== '\\') {
        inD = !inD;
        normalized += ch;
        continue;
      }
      if (inS || inD) {
        normalized += ch;
        continue;
      }

      if (ch === '#' && pDepth === 0) {
        normalized += trimmedLine.slice(i);
        break;
      }

      if (ch === '(' || ch === '[' || ch === '{') pDepth++;
      else if (ch === ')' || ch === ']' || ch === '}') pDepth = Math.max(0, pDepth - 1);

      if (pDepth === 0 && ch === ';') {
        normalized += '\n';
        while (i + 1 < trimmedLine.length && trimmedLine[i + 1] === ' ') i++;
        continue;
      }

      if (pDepth === 0 && ch === ':') {
        normalized += ':';
        let k = i + 1;
        while (k < trimmedLine.length && trimmedLine[k] === ' ') k++;
        if (k < trimmedLine.length && trimmedLine[k] !== '\n' && trimmedLine[k] !== '#') {
          normalized += '\n';
          i = k - 1;
        }
        continue;
      }

      normalized += ch;
    }

    const intermediate = normalized.split('\n');
    const rawStmts: string[] = [];

    for (const piece of intermediate) {
      const tPiece = piece.trim();
      if (!tPiece) continue;
      if (tPiece.startsWith('#')) {
        rawStmts.push(tPiece);
        continue;
      }

      const tokensSplit: string[] = [];
      let buf = '';
      let sQ = false;
      let dQ = false;
      let depth = 0;

      for (let i = 0; i < tPiece.length; i++) {
        const c = tPiece[i];
        const p = i > 0 ? tPiece[i - 1] : '';
        if (c === "'" && !dQ && p !== '\\') sQ = !sQ;
        else if (c === '"' && !sQ && p !== '\\') dQ = !dQ;
        else if (!sQ && !dQ) {
          if (c === '(' || c === '[' || c === '{') depth++;
          else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
        }

        if (!sQ && !dQ && depth === 0 && c === ' ' && buf.trim().length > 0) {
          const rest = tPiece.slice(i + 1).trimStart();
          const prevTrimmed = buf.trimEnd();
          const prevLastChar = prevTrimmed[prevTrimmed.length - 1] || '';
          const prevEndedStatement =
            /[0-9A-Za-z_)"'\]}]/.test(prevLastChar) &&
            !/\b(?:and|or|not|in|is|return|elif|if|while|for|def|class|import|from|except|with)$/.test(
              prevTrimmed
            );

          if (prevEndedStatement) {
            const startsAssignment =
              /^[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*\s*(?:[+\-*/%]?=|\/\/=|\*\*=)(?!=)/.test(rest);
            const startsCallOrKeyword =
              /^(?:(?:print|input|return|break|continue|pass|import|from|def|class|elif|while|except)\b|for\s+[A-Za-z_]\w*\s+in\b|(?:else|try|finally)\s*:|if\b[^:]+:)/.test(
                rest
              );

            if (startsAssignment || startsCallOrKeyword) {
              tokensSplit.push(buf.trim());
              buf = '';
              while (i + 1 < tPiece.length && tPiece[i + 1] === ' ') i++;
              continue;
            }
          }
        }
        buf += c;
      }
      if (buf.trim()) tokensSplit.push(buf.trim());
      rawStmts.push(...tokensSplit);
    }

    const wasJammed = rawStmts.length > 1;
    return rawStmts.map((stmt, idx) => ({
      stmt,
      origIndent: idx === 0 ? origIndent : 0,
      wasJammed: wasJammed || idx > 0,
    }));
  };

  const rawLines = code.split('\n');
  const nonEmptyRawLines = rawLines.filter((l) => l.trim().length > 0);
  const hadMultiLineIndentation =
    nonEmptyRawLines.length > 1 && nonEmptyRawLines.some((l) => /^ {2,}\S/.test(l));

  const allExtracted: Array<ExtractedPyStmt | null> = [];
  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      allExtracted.push(null);
      continue;
    }
    const pieces = splitSingleLinePython(rawLine);
    for (const p of pieces) {
      allExtracted.push(p);
    }
  }

  let lastNonEmptyIdx = -1;
  for (let i = allExtracted.length - 1; i >= 0; i--) {
    if (allExtracted[i] && !allExtracted[i]!.stmt.startsWith('#')) {
      lastNonEmptyIdx = i;
      break;
    }
  }

  interface PyBlockInfo {
    kind: string;
    indent: number;
    loopVar?: string;
    bodyCount: number;
  }

  const blockStack: PyBlockInfo[] = [];
  const finalPyLines: string[] = [];

  for (let idx = 0; idx < allExtracted.length; idx++) {
    const item = allExtracted[idx];
    if (!item) {
      if (finalPyLines.length > 0 && finalPyLines[finalPyLines.length - 1] !== '') {
        finalPyLines.push('');
      }
      continue;
    }

    const { stmt, origIndent, wasJammed } = item;

    if (stmt.startsWith('#')) {
      const commentIndent =
        blockStack.length > 0 ? blockStack[blockStack.length - 1].indent + 1 : origIndent;
      finalPyLines.push('    '.repeat(commentIndent) + stmt);
      continue;
    }

    // 1. Align elif / else: with the nearest open if / elif block
    if (/^(?:elif\b|else\s*:)/.test(stmt)) {
      let matchIdx = -1;
      for (let k = blockStack.length - 1; k >= 0; k--) {
        if (blockStack[k].kind === 'if' || blockStack[k].kind === 'elif') {
          matchIdx = k;
          break;
        }
      }
      if (matchIdx !== -1) {
        blockStack.length = matchIdx + 1;
        const targetIndent = blockStack[matchIdx].indent;
        blockStack[matchIdx] = {
          kind: stmt.startsWith('elif') ? 'elif' : 'else',
          indent: targetIndent,
          loopVar: blockStack[matchIdx].loopVar,
          bodyCount: 0,
        };
        finalPyLines.push('    '.repeat(targetIndent) + stmt);
        continue;
      }
    }

    // 2. Align except / finally: with the nearest open try / except block
    if (/^(?:except\b|finally\s*:)/.test(stmt)) {
      let matchIdx = -1;
      for (let k = blockStack.length - 1; k >= 0; k--) {
        if (blockStack[k].kind === 'try' || blockStack[k].kind === 'except') {
          matchIdx = k;
          break;
        }
      }
      if (matchIdx !== -1) {
        blockStack.length = matchIdx + 1;
        const targetIndent = blockStack[matchIdx].indent;
        blockStack[matchIdx] = {
          kind: stmt.startsWith('except') ? 'except' : 'finally',
          indent: targetIndent,
          loopVar: blockStack[matchIdx].loopVar,
          bodyCount: 0,
        };
        finalPyLines.push('    '.repeat(targetIndent) + stmt);
        continue;
      }
    }

    // 3. Determine indentation for regular statement or new block header
    if (blockStack.length > 0) {
      const top = blockStack[blockStack.length - 1];
      if (top.bodyCount > 0) {
        let dedentedFinalPrint = false;
        if (idx === lastNonEmptyIdx && /^print\s*\(/.test(stmt)) {
          let outerLoopIdx = -1;
          for (let k = 0; k < blockStack.length; k++) {
            if (blockStack[k].kind === 'for' || blockStack[k].kind === 'while') {
              outerLoopIdx = k;
              break;
            }
          }
          if (outerLoopIdx !== -1) {
            const loopVar = blockStack[outerLoopIdx].loopVar;
            const usesLoopVar =
              loopVar && new RegExp(`\\b${loopVar}\\b`).test(stmt.replace(/^print\s*\(/, ''));
            if (!usesLoopVar) {
              blockStack.length = outerLoopIdx;
              dedentedFinalPrint = true;
            }
          }
        }

        if (!dedentedFinalPrint && hadMultiLineIndentation && !wasJammed) {
          while (
            blockStack.length > 0 &&
            blockStack[blockStack.length - 1].bodyCount > 0 &&
            origIndent <= blockStack[blockStack.length - 1].indent
          ) {
            blockStack.pop();
          }
        }
      }
    }

    const currentIndent =
      blockStack.length > 0 ? blockStack[blockStack.length - 1].indent + 1 : 0;
    finalPyLines.push('    '.repeat(currentIndent) + stmt);

    for (const b of blockStack) {
      b.bodyCount += 1;
    }

    if (stmt.endsWith(':')) {
      const kwMatch = stmt.match(/^([A-Za-z_]\w*)\b/);
      const kind = kwMatch ? kwMatch[1] : 'block';
      const forVarMatch = stmt.match(/^for\s+([A-Za-z_]\w*)\s+in\b/);
      const inheritedLoopVar =
        blockStack.length > 0 ? blockStack[blockStack.length - 1].loopVar : undefined;
      blockStack.push({
        kind,
        indent: currentIndent,
        loopVar: forVarMatch ? forVarMatch[1] : inheritedLoopVar,
        bodyCount: 0,
      });
    } else if (/^(?:return|break|continue|pass|raise)\b/.test(stmt)) {
      if (blockStack.length > 0) {
        blockStack.pop();
      }
    }
  }

  return finalPyLines.join('\n').trim() + '\n';
}

/**
 * Transpiles Python source code into a deterministic Node VM script for ~1ms execution.
 */
function transpilePythonToJS(rawPyCode: string): {
  ok: boolean;
  jsCode?: string;
  compileError?: string;
  fallbackToProcess?: boolean;
} {
  const normalizedPy = normalizePythonSource(rawPyCode);
  const trimmed = normalizedPy.trim();
  if (!trimmed) {
    return { ok: false, compileError: 'SyntaxError: Empty Python source.' };
  }

  // Check balanced parentheses, brackets, braces, and string quotes
  let pDepth = 0;
  let bDepth = 0;
  let cDepth = 0;
  let inStr: string | null = null;
  let inComment = false;

  for (let i = 0; i < normalizedPy.length; i++) {
    const ch = normalizedPy[i];
    const next2 = normalizedPy.slice(i, i + 3);
    if (inComment) {
      if (ch === '\n') inComment = false;
      continue;
    }
    if (inStr) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (inStr.length === 3 && next2 === inStr) {
        inStr = null;
        i += 2;
        continue;
      }
      if (inStr.length === 1 && ch === inStr) {
        inStr = null;
        continue;
      }
      if (inStr.length === 1 && ch === '\n') {
        return { ok: false, compileError: 'SyntaxError: EOL while scanning string literal' };
      }
      continue;
    }

    if (ch === '#') {
      inComment = true;
      continue;
    }
    if (next2 === '"""' || next2 === "'''") {
      inStr = next2;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === '(') pDepth++;
    else if (ch === ')') pDepth--;
    else if (ch === '[') bDepth++;
    else if (ch === ']') bDepth--;
    else if (ch === '{') cDepth++;
    else if (ch === '}') cDepth--;

    if (pDepth < 0 || bDepth < 0 || cDepth < 0) {
      return {
        ok: false,
        compileError: `SyntaxError: unmatched '${ch}'`,
      };
    }
  }

  if (inStr) {
    return { ok: false, compileError: 'SyntaxError: unterminated string literal' };
  }
  if (pDepth !== 0 || bDepth !== 0 || cDepth !== 0) {
    return { ok: false, compileError: 'SyntaxError: unbalanced parentheses or brackets' };
  }

  // Strip triple-quoted docstrings
  const cleanedPy = normalizedPy.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, '');

  const transformPyExpr = (expr: string): string => {
    let out = expr.trim();
    if (!out) return out;

    // Convert f-strings: f"hello {x}" or f'hello {x}' -> `hello ${x}`
    out = out.replace(/\bf"((?:\\.|[^"\\])*)"/g, (_m, inner) => {
      return '`' + inner.replace(/\{([^{}]+)\}/g, '${$1}') + '`';
    });
    out = out.replace(/\bf'((?:\\.|[^'\\])*)'/g, (_m, inner) => {
      return '`' + inner.replace(/\{([^{}]+)\}/g, '${$1}') + '`';
    });

    // Mask string literals before keyword/operator replacements
    const maskedStrings: string[] = [];
    out = out.replace(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (m) => {
      const idx = maskedStrings.length;
      maskedStrings.push(m);
      return `__PY_STR_${idx}__`;
    });

    // Strip inline comments
    out = out.replace(/#[^\n]*$/g, '').trim();

    // List comprehensions: [expr for v in iter if cond]
    out = out.replace(
      /\[\s*([^\[\]]+?)\s+for\s+([A-Za-z_]\w*)\s+in\s+([^\[\]]+?)(?:\s+if\s+([^\[\]]+?))?\s*\]/g,
      (_m, itemExpr, vName, iterExpr, condExpr) => {
        const mappedItem = transformPyExpr(itemExpr);
        const mappedIter = transformPyExpr(iterExpr);
        if (condExpr) {
          const mappedCond = transformPyExpr(condExpr);
          return `Array.from(__py_iter(${mappedIter})).filter((${vName}) => (${mappedCond})).map((${vName}) => (${mappedItem}))`;
        }
        return `Array.from(__py_iter(${mappedIter})).map((${vName}) => (${mappedItem}))`;
      }
    );

    // Reverse slice: x[::-1]
    out = out.replace(/([A-Za-z_]\w*|\([^)]+\))\[\s*:\s*:\s*-1\s*\]/g, '__py_rev_slice($1)');
    // Standard slice: x[a:b]
    out = out.replace(
      /([A-Za-z_]\w*)\[\s*([^:\]]*)\s*:\s*([^:\]]*)\s*\]/g,
      (_m, obj, startIdx, endIdx) => {
        const sArg = startIdx.trim() ? startIdx.trim() : '0';
        const eArg = endIdx.trim() ? endIdx.trim() : 'undefined';
        return `__py_slice(${obj}, ${sArg}, ${eArg})`;
      }
    );
    // Negative indexing (including expressions like x[-1], x[-2], x[(-2 + 1)])
    out = out.replace(/([A-Za-z_]\w*)\[\s*(\(?-\d+[^:\]]*)\s*\]/g, '__py_idx($1, $2)');

    // Array repetition: [0] * n
    out = out.replace(/\[\s*([^\[\],]+)\s*\]\s*\*\s*([A-Za-z0-9_(\s+\-)]+)/g, 'new Array($2).fill($1)');

    // Python inline ternary: A if COND else B
    out = out.replace(
      /^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/,
      (_m, truePart, condPart, falsePart) => `((${condPart}) ? (${truePart}) : (${falsePart}))`
    );

    // Booleans and None
    out = out.replace(/\bTrue\b/g, 'true');
    out = out.replace(/\bFalse\b/g, 'false');
    out = out.replace(/\bNone\b/g, 'null');

    // Logical operators
    out = out.replace(/\band\b/g, '&&');
    out = out.replace(/\bor\b/g, '||');
    out = out.replace(/\bnot\s+/g, '!');

    // Membership operators: not in / in
    out = out.replace(
      /([A-Za-z0-9_().[\]]+)\s+not\s+in\s+([A-Za-z0-9_().[\]]+)/g,
      '(!__py_in($1, $2))'
    );
    out = out.replace(
      /([A-Za-z0-9_().[\]]+)\s+in\s+([A-Za-z0-9_().[\]]+)/g,
      '__py_in($1, $2)'
    );

    // Floor division: a // b
    out = out.replace(
      /([A-Za-z0-9_)\].]+|\([^)]+\))\s*\/\/\s*([A-Za-z0-9_(\[.]+|\([^)]+\))/g,
      'Math.floor(($1) / ($2))'
    );

    // Python keyword argument reverse=True/False in sort() / sorted()
    out = out.replace(/\breverse\s*=\s*(true|false)\b/g, '{ reverse: $1 }');

    // Restore string literals
    out = out.replace(/__PY_STR_(\d+)__/g, (_m, idx) => maskedStrings[Number(idx)] ?? '""');
    return out;
  };

  const lines = cleanedPy.split('\n');
  const indentStack: number[] = [0];
  const blockKindStack: string[] = ['root'];
  let pendingBlockKind: string | null = null;
  let lastClosedBlockKind: string | null = null;
  const jsLines: string[] = [];
  const declaredFunctions: string[] = [];
  const declaredVars = new Set<string>();

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const withoutComment = rawLine.replace(
      /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|#[^\n]*$/g,
      (m, strLit) => (strLit ? strLit : '')
    );
    const trimmedLine = withoutComment.trim();
    if (!trimmedLine) continue;

    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;

    if (pendingBlockKind !== null) {
      if (indent > indentStack[indentStack.length - 1]) {
        indentStack.push(indent);
        blockKindStack.push(pendingBlockKind);
      } else {
        jsLines.push('}');
        lastClosedBlockKind = pendingBlockKind;
      }
      pendingBlockKind = null;
    }

    const isElifOrElse = /^(?:elif\b|else\s*:)/.test(trimmedLine);
    if (isElifOrElse) {
      let targetIdx = -1;
      for (let k = blockKindStack.length - 1; k >= 1; k--) {
        if (blockKindStack[k] === 'if' || blockKindStack[k] === 'elif') {
          targetIdx = k;
          break;
        }
      }
      if (targetIdx !== -1) {
        while (blockKindStack.length > targetIdx) {
          lastClosedBlockKind = blockKindStack.pop() || null;
          indentStack.pop();
          jsLines.push('}');
        }
      } else {
        while (indent < indentStack[indentStack.length - 1]) {
          lastClosedBlockKind = blockKindStack.pop() || null;
          indentStack.pop();
          jsLines.push('}');
        }
      }
    } else {
      while (indent < indentStack[indentStack.length - 1]) {
        lastClosedBlockKind = blockKindStack.pop() || null;
        indentStack.pop();
        jsLines.push('}');
      }
    }

    // Ignore import statements (math/sys provided in VM)
    if (/^(?:import|from)\s+/.test(trimmedLine)) {
      continue;
    }

    if (trimmedLine === 'pass') {
      jsLines.push('/* pass */');
      continue;
    }

    // Check missing colon on control flow headers
    if (
      /^(?:if|elif|else|for|while|def|try|except|finally)\b/.test(trimmedLine) &&
      !trimmedLine.endsWith(':')
    ) {
      return {
        ok: false,
        compileError: `SyntaxError: expected ':' at line ${lineIdx + 1}`,
      };
    }

    // def funcName(params):
    const defMatch = trimmedLine.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:\s*$/);
    if (defMatch) {
      const fnName = defMatch[1];
      const rawParams = defMatch[2];
      declaredFunctions.push(fnName);
      const cleanedParams = rawParams
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const [nameWithType, defVal] = p.split('=');
          const paramName = nameWithType.split(':')[0].trim();
          return defVal !== undefined ? `${paramName} = ${transformPyExpr(defVal)}` : paramName;
        })
        .join(', ');
      jsLines.push(`function ${fnName}(${cleanedParams}) {`);
      pendingBlockKind = 'def';
      lastClosedBlockKind = null;
      continue;
    }

    // if cond:
    const ifMatch = trimmedLine.match(/^if\s+([\s\S]+):\s*$/);
    if (ifMatch) {
      jsLines.push(`if (${transformPyExpr(ifMatch[1])}) {`);
      pendingBlockKind = 'if';
      lastClosedBlockKind = null;
      continue;
    }

    // elif cond:
    const elifMatch = trimmedLine.match(/^elif\s+([\s\S]+):\s*$/);
    if (elifMatch) {
      const canUseElse = lastClosedBlockKind === 'if' || lastClosedBlockKind === 'elif';
      jsLines.push(`${canUseElse ? 'else if' : 'if'} (${transformPyExpr(elifMatch[1])}) {`);
      pendingBlockKind = 'elif';
      lastClosedBlockKind = null;
      continue;
    }

    // else:
    if (/^else\s*:\s*$/.test(trimmedLine)) {
      const canUseElse = lastClosedBlockKind === 'if' || lastClosedBlockKind === 'elif';
      jsLines.push(canUseElse ? 'else {' : '{');
      pendingBlockKind = 'else';
      lastClosedBlockKind = null;
      continue;
    }

    // while cond:
    const whileMatch = trimmedLine.match(/^while\s+([\s\S]+):\s*$/);
    if (whileMatch) {
      jsLines.push(`while (${transformPyExpr(whileMatch[1])}) {`);
      pendingBlockKind = 'while';
      lastClosedBlockKind = null;
      continue;
    }

    // for v1, v2 in expr: OR for v in expr:
    const forTupleMatch = trimmedLine.match(
      /^for\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)+)\s+in\s+([\s\S]+):\s*$/
    );
    if (forTupleMatch) {
      const vars = forTupleMatch[1]
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      for (const v of vars) declaredVars.add(v);
      jsLines.push(`for (var [${vars.join(', ')}] of __py_iter(${transformPyExpr(forTupleMatch[2])})) {`);
      pendingBlockKind = 'for';
      lastClosedBlockKind = null;
      continue;
    }

    const forSingleMatch = trimmedLine.match(/^for\s+([A-Za-z_]\w*)\s+in\s+([\s\S]+):\s*$/);
    if (forSingleMatch) {
      const v = forSingleMatch[1];
      declaredVars.add(v);
      jsLines.push(`for (var ${v} of __py_iter(${transformPyExpr(forSingleMatch[2])})) {`);
      pendingBlockKind = 'for';
      lastClosedBlockKind = null;
      continue;
    }

    // try: / except: / finally:
    if (/^try\s*:\s*$/.test(trimmedLine)) {
      jsLines.push('try {');
      pendingBlockKind = 'try';
      lastClosedBlockKind = null;
      continue;
    }
    if (/^except\b.*:\s*$/.test(trimmedLine)) {
      jsLines.push('catch (__py_err) {');
      pendingBlockKind = 'except';
      lastClosedBlockKind = null;
      continue;
    }
    if (/^finally\s*:\s*$/.test(trimmedLine)) {
      jsLines.push('finally {');
      pendingBlockKind = 'finally';
      lastClosedBlockKind = null;
      continue;
    }

    lastClosedBlockKind = null;

    // return expr
    const returnMatch = trimmedLine.match(/^return(?:\s+([\s\S]+))?$/);
    if (returnMatch) {
      const retExpr = returnMatch[1] ? transformPyExpr(returnMatch[1]) : 'null';
      jsLines.push(`return ${retExpr};`);
      continue;
    }

    // Floor division assignment: a //= b
    const floorAssignMatch = trimmedLine.match(/^([A-Za-z_]\w*(?:\[[^\]]+\])?)\s*\/\/=\s*([\s\S]+)$/);
    if (floorAssignMatch) {
      jsLines.push(
        `${floorAssignMatch[1]} = Math.floor((${floorAssignMatch[1]}) / (${transformPyExpr(
          floorAssignMatch[2]
        )}));`
      );
      continue;
    }

    // Tuple unpacking assignment: a, b = expr1, expr2 OR a, b = map(int, input().split())
    const tupleAssignMatch = trimmedLine.match(
      /^([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)+)\s*=\s*([\s\S]+)$/
    );
    if (tupleAssignMatch) {
      const lhsVars = tupleAssignMatch[1]
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      for (const v of lhsVars) declaredVars.add(v);
      const rhsRaw = tupleAssignMatch[2].trim();
      let topComma = false;
      let d = 0;
      let q: string | null = null;
      for (let i = 0; i < rhsRaw.length; i++) {
        const c = rhsRaw[i];
        if (q) {
          if (c === '\\') i++;
          else if (c === q) q = null;
          continue;
        }
        if (c === '"' || c === "'") q = c;
        else if (c === '(' || c === '[' || c === '{') d++;
        else if (c === ')' || c === ']' || c === '}') d--;
        else if (d === 0 && c === ',') {
          topComma = true;
          break;
        }
      }
      const transformedRhs = transformPyExpr(rhsRaw);
      if (topComma) {
        jsLines.push(`[${lhsVars.join(', ')}] = [${transformedRhs}];`);
      } else {
        jsLines.push(`[${lhsVars.join(', ')}] = __py_unpack(${transformedRhs}, ${lhsVars.length});`);
      }
      continue;
    }

    // Simple variable assignment: varName = expr
    const assignMatch = trimmedLine.match(/^([A-Za-z_]\w*)\s*([+\-*/%&|^]?=|\*\*=)(?!=)\s*([\s\S]+)$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const op = assignMatch[2];
      const rhs = transformPyExpr(assignMatch[3]);
      declaredVars.add(varName);
      jsLines.push(`${varName} ${op} ${rhs};`);
      continue;
    }

    // Indexed assignment: arr[i] = expr
    const idxAssignMatch = trimmedLine.match(
      /^([A-Za-z_]\w*\[[^\]]+\])\s*([+\-*/%&|^]?=|\*\*=)(?!=)\s*([\s\S]+)$/
    );
    if (idxAssignMatch) {
      const lhs = transformPyExpr(idxAssignMatch[1]);
      const op = idxAssignMatch[2];
      const rhs = transformPyExpr(idxAssignMatch[3]);
      jsLines.push(`${lhs} ${op} ${rhs};`);
      continue;
    }

    // print(...) call with optional sep= / end=
    if (/^print\s*\([\s\S]*\)$/.test(trimmedLine)) {
      const inner = trimmedLine.replace(/^print\s*\(/, '').replace(/\)\s*$/, '');
      let processedInner = transformPyExpr(inner);
      let kwEnd: string | null = null;
      let kwSep: string | null = null;
      processedInner = processedInner.replace(/,\s*end\s*=\s*([^,)]+)/g, (_m, val) => {
        kwEnd = val.trim();
        return '';
      });
      processedInner = processedInner.replace(/,\s*sep\s*=\s*([^,)]+)/g, (_m, val) => {
        kwSep = val.trim();
        return '';
      });
      if (kwEnd !== null || kwSep !== null) {
        const kwObj = `{ __py_kw: true, end: ${kwEnd ?? '"\\n"'}, sep: ${kwSep ?? '" "'} }`;
        jsLines.push(
          processedInner.trim()
            ? `__py_print(${processedInner}, ${kwObj});`
            : `__py_print(${kwObj});`
        );
      } else {
        jsLines.push(`__py_print(${processedInner});`);
      }
      continue;
    }

    // Generic statement/expression
    jsLines.push(`${transformPyExpr(trimmedLine)};`);
  }

  if (pendingBlockKind !== null) {
    jsLines.push('}');
  }
  while (indentStack.length > 1) {
    indentStack.pop();
    blockKindStack.pop();
    jsLines.push('}');
  }

  // Filter out builtin names that we already define with `var` in the runner so we don't overwrite them with `undefined` before execution
  const builtinNames = new Set([
    'input',
    'print',
    'int',
    'float',
    'str',
    'bool',
    'list',
    'dict',
    'set',
    'tuple',
    'len',
    'range',
    'enumerate',
    'map',
    'filter',
    'zip',
    'sum',
    'max',
    'min',
    'abs',
    'round',
    'sorted',
    'reversed',
    'pow',
    'ord',
    'chr',
    'bin',
    'hex',
    'all',
    'any',
    'math',
    'sys',
  ]);
  const userVars = Array.from(declaredVars).filter((v) => !builtinNames.has(v));
  const varDecls = userVars.length > 0 ? `var ${userVars.join(', ')};` : '';

  const fallbackFnCall =
    declaredFunctions.length > 0
      ? `
if (__out === '' && typeof ${declaredFunctions[declaredFunctions.length - 1]} === 'function') {
  const __fn = ${declaredFunctions[declaredFunctions.length - 1]};
  const __allTokens = __splitTokens(__rawInput);
  const __parsedArgs = __allTokens.map(t => (!Number.isNaN(Number(t)) && t !== '' ? Number(t) : t));
  const __ret = __fn(...__parsedArgs);
  if (__ret !== undefined && __ret !== null && __out === '') {
    __py_print(__ret);
  }
}`
      : '';

  const runnerScript = `
const __rawInput = String(typeof __stdinText === 'string' ? __stdinText : '');
function __splitTokens(text) {
  if (!text || !String(text).trim()) return [];
  return String(text).trim().split(/[\\s,;]+|\\s*\\+\\s*(?=[-+]?\\d)/).filter(Boolean);
}
const __nonEmptyLines = __rawInput.split(/\\r?\\n/).filter(l => l.trim() !== '');
const __lines = __nonEmptyLines.length > 0 ? __nonEmptyLines : __rawInput.split(/\\r?\\n/);
var __lineIdx = 0;
var __leftoverTokens = [];
var __lastReadLine = null;
var __lastReadExtraTokens = null;
var __out = '';

function __py_str(val) {
  if (val === true) return 'True';
  if (val === false) return 'False';
  if (val === null || val === undefined) return 'None';
  if (val === Infinity) return 'inf';
  if (val === -Infinity) return '-inf';
  if (Array.isArray(val)) return '[' + val.map(__py_str).join(', ') + ']';
  return String(val);
}

var input = function(promptText) {
  if (__leftoverTokens.length > 0) {
    __lastReadLine = null;
    __lastReadExtraTokens = null;
    return __leftoverTokens.shift();
  }
  if (__lineIdx < __lines.length) {
    const line = __lines[__lineIdx++];
    const toks = __splitTokens(line);
    __lastReadLine = line;
    __lastReadExtraTokens = toks.length > 1 ? toks.slice(1) : null;
    return line;
  }
  return '0';
};

var int = function(val, base) {
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'number') return Math.trunc(val);
  const s = String(val ?? '0');
  if (val === __lastReadLine && __lastReadExtraTokens && __lastReadExtraTokens.length > 0) {
    __leftoverTokens.push(...__lastReadExtraTokens);
    __lastReadLine = null;
    __lastReadExtraTokens = null;
  }
  const parts = __splitTokens(s);
  const first = parts.length > 0 ? parts[0] : '0';
  const parsed = base ? parseInt(first, base) : Math.trunc(Number(first));
  return Number.isNaN(parsed) ? 0 : parsed;
};

var float = function(val) {
  if (typeof val === 'boolean') return val ? 1.0 : 0.0;
  if (typeof val === 'number') return val;
  const s = String(val ?? '0').trim();
  const lower = s.toLowerCase();
  if (lower === '-inf' || lower === '-infinity') return -Infinity;
  if (lower === 'inf' || lower === '+inf' || lower === 'infinity' || lower === '+infinity') return Infinity;
  if (val === __lastReadLine && __lastReadExtraTokens && __lastReadExtraTokens.length > 0) {
    __leftoverTokens.push(...__lastReadExtraTokens);
    __lastReadLine = null;
    __lastReadExtraTokens = null;
  }
  const parts = __splitTokens(s);
  const first = parts.length > 0 ? parts[0] : '0';
  const firstLower = first.toLowerCase();
  if (firstLower === '-inf' || firstLower === '-infinity') return -Infinity;
  if (firstLower === 'inf' || firstLower === '+inf' || firstLower === 'infinity' || firstLower === '+infinity') return Infinity;
  const parsed = Number(first);
  return Number.isNaN(parsed) ? 0.0 : parsed;
};

var str = function(val) {
  return __py_str(val);
};

var bool = function(val) {
  if (Array.isArray(val) || typeof val === 'string') return val.length > 0;
  return Boolean(val);
};

var list = function(iter) {
  if (iter === undefined) return [];
  return Array.from(__py_iter(iter));
};

var set = function(iter) {
  if (iter === undefined) return [];
  return Array.from(new Set(__py_iter(iter)));
};

var tuple = function(iter) {
  if (iter === undefined) return [];
  return Array.from(__py_iter(iter));
};

var dict = function(iter) {
  if (iter === undefined) return {};
  if (typeof iter === 'object' && !Array.isArray(iter)) return { ...iter };
  const obj = {};
  for (const pair of __py_iter(iter)) {
    if (Array.isArray(pair) && pair.length >= 2) obj[pair[0]] = pair[1];
  }
  return obj;
};

var bin = function(n) {
  const v = Math.trunc(Number(n));
  return v < 0 ? '-0b' + Math.abs(v).toString(2) : '0b' + v.toString(2);
};

var hex = function(n) {
  const v = Math.trunc(Number(n));
  return v < 0 ? '-0x' + Math.abs(v).toString(16) : '0x' + v.toString(16);
};

var len = function(val) {
  if (val == null) return 0;
  if (Array.isArray(val) || typeof val === 'string') return val.length;
  if (val instanceof Set || val instanceof Map) return val.size;
  if (typeof val === 'object') return Object.keys(val).length;
  return 0;
};

var range = function(a, b, step) {
  let start = 0, stop = 0, st = 1;
  if (b === undefined) {
    stop = Number(a);
  } else {
    start = Number(a);
    stop = Number(b);
    if (step !== undefined) st = Number(step);
  }
  const res = [];
  if (st === 0) return res;
  if (st > 0) {
    for (let i = start; i < stop; i += st) res.push(i);
  } else {
    for (let i = start; i > stop; i += st) res.push(i);
  }
  return res;
};

var enumerate = function(iter, start = 0) {
  const arr = Array.from(__py_iter(iter));
  return arr.map((v, idx) => [start + idx, v]);
};

var map = function(fn, iter) {
  return Array.from(__py_iter(iter)).map((x) => fn(x));
};

var filter = function(fn, iter) {
  return Array.from(__py_iter(iter)).filter((x) => (fn ? fn(x) : Boolean(x)));
};

var zip = function(...iters) {
  const arrays = iters.map(it => Array.from(__py_iter(it)));
  if (arrays.length === 0) return [];
  const minLen = Math.min(...arrays.map(a => a.length));
  const out = [];
  for (let i = 0; i < minLen; i++) {
    out.push(arrays.map(a => a[i]));
  }
  return out;
};

var sum = function(iter, start = 0) {
  let acc = start;
  for (const x of __py_iter(iter)) acc += Number(x);
  return acc;
};

var max = function(...args) {
  if (args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object')) {
    const arr = Array.from(__py_iter(args[0]));
    return arr.reduce((a, b) => (a > b ? a : b));
  }
  return args.reduce((a, b) => (a > b ? a : b));
};

var min = function(...args) {
  if (args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'object')) {
    const arr = Array.from(__py_iter(args[0]));
    return arr.reduce((a, b) => (a < b ? a : b));
  }
  return args.reduce((a, b) => (a < b ? a : b));
};

var abs = Math.abs;
var pow = function(x, y, z) {
  const r = Math.pow(x, y);
  return z !== undefined ? r % z : r;
};
var round = function(val, ndigits) {
  if (ndigits === undefined || ndigits === 0) return Math.round(val);
  const f = Math.pow(10, ndigits);
  return Math.round(val * f) / f;
};
var sorted = function(iter, kw) {
  const arr = [...Array.from(__py_iter(iter))];
  arr.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (kw && kw.reverse) arr.reverse();
  return arr;
};
var reversed = function(iter) {
  return [...Array.from(__py_iter(iter))].reverse();
};
var ord = function(ch) { return String(ch).charCodeAt(0); };
var chr = function(code) { return String.fromCharCode(code); };
var all = function(iter) {
  for (const x of __py_iter(iter)) if (!bool(x)) return false;
  return true;
};
var any = function(iter) {
  for (const x of __py_iter(iter)) if (bool(x)) return true;
  return false;
};

function __py_idx(obj, idx) {
  if (obj == null) return undefined;
  const n = Number(idx);
  if ((Array.isArray(obj) || typeof obj === 'string') && !Number.isNaN(n)) {
    const actual = n < 0 ? obj.length + n : n;
    return obj[actual];
  }
  return obj[idx];
}

function __py_iter(obj) {
  if (obj == null) return [];
  if (Array.isArray(obj) || typeof obj === 'string' || obj instanceof Set) return obj;
  if (obj instanceof Map) return obj.keys();
  if (typeof obj === 'object') return Object.keys(obj);
  return [];
}

function __py_in(item, container) {
  if (container == null) return false;
  if (typeof container === 'string') return container.includes(String(item));
  if (Array.isArray(container)) return container.includes(item);
  if (container instanceof Set || container instanceof Map) return container.has(item);
  if (typeof container === 'object') return Object.prototype.hasOwnProperty.call(container, item);
  return false;
}

function __py_rev_slice(val) {
  if (typeof val === 'string') return val.split('').reverse().join('');
  if (Array.isArray(val)) return [...val].reverse();
  return val;
}

function __py_slice(val, s, e) {
  if (typeof val === 'string' || Array.isArray(val)) {
    return val.slice(s, e);
  }
  return val;
}

function __py_unpack(val, count) {
  const arr = Array.from(__py_iter(val));
  while (arr.length < count) arr.push(0);
  return arr;
}

function __py_print(...args) {
  let sep = ' ';
  let end = '\\n';
  if (args.length > 0 && args[args.length - 1] && typeof args[args.length - 1] === 'object' && args[args.length - 1].__py_kw) {
    const kw = args.pop();
    if (kw.sep !== undefined) sep = String(kw.sep);
    if (kw.end !== undefined) end = String(kw.end);
  }
  __out += args.map(__py_str).join(sep) + end;
}
var print = __py_print;

var math = {
  sqrt: Math.sqrt,
  floor: Math.floor,
  ceil: Math.ceil,
  pow: Math.pow,
  abs: Math.abs,
  fabs: Math.abs,
  pi: Math.PI,
  e: Math.E,
  inf: Infinity,
  gcd: function(a, b) {
    a = Math.abs(Math.trunc(a));
    b = Math.abs(Math.trunc(b));
    while (b) { const t = b; b = a % b; a = t; }
    return a;
  },
  factorial: function(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  },
};

var sys = {
  stdin: {
    read: () => __rawInput,
    readline: () => input(),
    readlines: () => __lines,
  },
  stdout: {
    write: (s) => { __out += String(s ?? ''); },
  },
  maxsize: 9007199254740991,
  exit: (code = 0) => { throw { __systemExit: true, code }; },
};

${varDecls}

try {
  ${jsLines.join('\n  ')}
  ${fallbackFnCall}
} catch (__err) {
  if (!(__err && __err.__systemExit)) {
    throw __err;
  }
}
__setResult(__out);
`;

  try {
    new Function('__stdinText', '__setResult', runnerScript);
  } catch (err: any) {
    return {
      ok: false,
      compileError: `SyntaxError: ${err?.message || 'Invalid Python syntax'}`,
      fallbackToProcess: true,
    };
  }

  return { ok: true, jsCode: runnerScript };
}


/**
 * Transpiles C / C++ / Java academic assignment source code into a deterministic Node VM script.
 */
function transpileCompiledLanguageToJS(
  langKey: string,
  sourceCode: string
): { ok: boolean; jsCode?: string; compileError?: string } {
  const trimmed = sourceCode.trim();
  if (!trimmed) {
    return { ok: false, compileError: 'Compilation Error: Empty source file.' };
  }

  // Basic structural syntax check (balanced delimiters outside strings/comments)
  let braceDepth = 0;
  let parenDepth = 0;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sourceCode.length; i++) {
    const ch = sourceCode[i];
    const next = sourceCode[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }

    if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    else if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;

    if (braceDepth < 0 || parenDepth < 0) {
      return {
        ok: false,
        compileError: `Compilation Error: Unexpected closing '${ch}' in ${langKey.toUpperCase()} source.`,
      };
    }
  }

  if (inString) {
    return { ok: false, compileError: 'Compilation Error: Unterminated string literal.' };
  }
  if (braceDepth !== 0) {
    return { ok: false, compileError: 'Compilation Error: Unbalanced curly braces { }.' };
  }
  if (parenDepth !== 0) {
    return { ok: false, compileError: 'Compilation Error: Unbalanced parentheses ( ).' };
  }

  // Strip comments while preserving string literals
  let body = sourceCode.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match, strLiteral) => (strLiteral ? strLiteral : '')
  );

  // Extract #define constants
  body = body.replace(/^\s*#\s*define\s+([A-Za-z_]\w*)\s+([^\n]+)$/gm, (_m, k, v) => {
    return `const ${k} = ${v.trim()};`;
  });

  // Remove preprocessor directives (#include, #pragma, etc.) and Java package/import
  body = body.replace(/^\s*#[^\n]*$/gm, '');
  body = body.replace(/^\s*using\s+namespace\s+std\s*;/gm, '');
  body = body.replace(/^\s*package\s+[^;]+;/gm, '');
  body = body.replace(/^\s*import\s+[^;]+;/gm, '');

  if (langKey === 'java') {
    // Unwrap outer public class / class wrapper
    body = body.replace(
      /\b(?:public\s+|final\s+|abstract\s+)*class\s+[A-Za-z_]\w*\s*\{([\s\S]*)\}\s*$/,
      '$1'
    );
    // Replace Scanner creation & declarations
    body = body.replace(
      /\b(?:java\.util\.)?Scanner\s+([A-Za-z_]\w*)\s*=\s*new\s+(?:java\.util\.)?Scanner\s*\(\s*System\.in\s*\)\s*;/g,
      'const $1 = __scanner;'
    );
    body = body.replace(
      /\bnew\s+(?:java\.util\.)?Scanner\s*\(\s*System\.in\s*\)/g,
      '__scanner'
    );
    body = body.replace(/\b(?:java\.util\.)?Scanner\s+([A-Za-z_]\w*)/g, 'let $1');
    body = body.replace(/\bSystem\.out\.println\s*\(/g, '__println(');
    body = body.replace(/\bSystem\.out\.print\s*\(/g, '__print(');
    body = body.replace(/\bSystem\.out\.printf\s*\(/g, '__printf(');
    body = body.replace(
      /\b(?:public\s+|private\s+|protected\s+|static\s+|final\s+)*void\s+main\s*\(\s*String\s*(?:\[\s*\]|\.\.\.)?\s*[A-Za-z_]\w*(?:\s*\[\s*\])?\s*\)(?:\s*throws\s+[A-Za-z0-9_.,\s]+)?/g,
      'function main()'
    );
  }

  // Normalize std:: prefixes
  body = body.replace(/\bstd::/g, '');
  body = body.replace(/\bendl\b/g, '"\\n"');

  // Transform getline(cin, var)
  body = body.replace(/\bgetline\s*\(\s*cin\s*,\s*([A-Za-z_]\w*)\s*\)/g, '($1 = __getline())');

  // Transform cin >> a >> b;
  body = body.replace(/\bcin\s*((?:>>\s*[A-Za-z_]\w*(?:\s*\[[^\]]+\])?\s*)+);/g, (_m, chain) => {
    const vars = chain
      .split('>>')
      .map((s: string) => s.trim())
      .filter(Boolean);
    return vars.map((v: string) => `${v} = __cin();`).join(' ');
  });

  // Transform while (cin >> x)
  body = body.replace(/\bcin\s*>>\s*([A-Za-z_]\w*)/g, '(__hasNext() ? (($1 = __cin()), true) : false)');

  // Transform cout << a << b;
  body = body.replace(/\bcout\s*((?:<<[^;]+)+);/g, (_m, chain) => {
    const parts: string[] = [];
    let current = '';
    let pDepth = 0;
    let inStr: string | null = null;
    for (let i = 0; i < chain.length; i++) {
      const c = chain[i];
      const n = chain[i + 1];
      if (inStr) {
        current += c;
        if (c === '\\' && n) {
          current += n;
          i++;
          continue;
        }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        current += c;
        continue;
      }
      if (c === '(' || c === '[') pDepth++;
      else if (c === ')' || c === ']') pDepth--;

      if (pDepth === 0 && c === '<' && n === '<') {
        if (current.trim()) parts.push(current.trim());
        current = '';
        i++;
        continue;
      }
      current += c;
    }
    if (current.trim()) parts.push(current.trim());
    return `__cout(${parts.join(', ')});`;
  });

  // Transform C scanf("%d %d", &a, &b)
  body = body.replace(/\bscanf\s*\(\s*("[^"]*")\s*,([^)]+)\)/g, (_m, fmt, argsStr) => {
    const vars = argsStr
      .split(',')
      .map((s: string) => s.trim().replace(/^&\s*/, ''))
      .filter(Boolean);
    return `(() => { ${vars.map((v: string) => `${v} = __cin(${fmt});`).join(' ')} return ${vars.length}; })()`;
  });

  // Transform C gets / fgets
  body = body.replace(/\bgets\s*\(\s*([A-Za-z_]\w*)\s*\)/g, '($1 = __getline())');

  // Transform C printf(...)
  body = body.replace(/\bprintf\s*\(/g, '__printf(');

  // Mask string literals before type keyword replacements so strings containing "int", "char", etc. are untouched
  const stringLiterals: string[] = [];
  body = body.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (match) => {
    const idx = stringLiterals.length;
    stringLiterals.push(match);
    return `__STR_LITERAL_${idx}__`;
  });

  // Transform C++/Java containers and arrays
  body = body.replace(
    /\bvector\s*<\s*[^>]+\s*>\s+([A-Za-z_]\w*)\s*\(\s*([^,)]+)(?:\s*,\s*([^)]+))?\s*\)\s*;/g,
    (_m, name, size, fillVal) => `let ${name} = new Array(${size}).fill(${fillVal ?? 0});`
  );
  body = body.replace(
    /\bvector\s*<\s*[^>]+\s*>\s+([A-Za-z_]\w*)\s*=\s*\{([^}]*)\}\s*;/g,
    'let $1 = [$2];'
  );
  body = body.replace(/\bvector\s*<\s*[^>]+\s*>\s+([A-Za-z_]\w*)\s*;/g, 'let $1 = [];');

  const typePattern =
    '(?:unsigned\\s+long\\s+long|long\\s+long\\s+int|long\\s+long|unsigned\\s+int|unsigned\\s+long|long\\s+double|int|long|short|float|double|bool|boolean|char|string|String|void|auto)';

  // Fixed-size array with initializer: int arr[5] = {1, 2, 3};
  body = body.replace(
    new RegExp(`\\b${typePattern}\\s+([A-Za-z_]\\w*)\\s*\\[[^\\]]*\\]\\s*=\\s*\\{([^}]*)\\}\\s*;`, 'g'),
    'let $1 = [$2];'
  );
  // Java array declaration: int[] arr = new int[n];
  body = body.replace(
    new RegExp(`\\b${typePattern}\\s*\\[\\s*\\]\\s+([A-Za-z_]\\w*)\\s*=\\s*new\\s+${typePattern}\\s*\\[([^\\]]+)\\]\\s*;`, 'g'),
    'let $1 = new Array($2).fill(0);'
  );
  body = body.replace(
    new RegExp(`\\b${typePattern}\\s+([A-Za-z_]\\w*)\\s*\\[\\s*\\]\\s*=\\s*new\\s+${typePattern}\\s*\\[([^\\]]+)\\]\\s*;`, 'g'),
    'let $1 = new Array($2).fill(0);'
  );
  body = body.replace(
    new RegExp(`\\b${typePattern}\\s*\\[\\s*\\]\\s+([A-Za-z_]\\w*)\\s*=\\s*\\{([^}]*)\\}\\s*;`, 'g'),
    'let $1 = [$2];'
  );
  body = body.replace(
    new RegExp(`\\b${typePattern}\\s+([A-Za-z_]\\w*)\\s*\\[\\s*\\]\\s*=\\s*\\{([^}]*)\\}\\s*;`, 'g'),
    'let $1 = [$2];'
  );
  // Fixed-size array without initializer: int arr[100];
  body = body.replace(
    new RegExp(`\\b${typePattern}\\s+([A-Za-z_]\\w*)\\s*\\[([^\\]]+)\\]\\s*;`, 'g'),
    'let $1 = new Array($2).fill(0);'
  );

  // Function definitions: int funcName(int a, int b) {
  const declaredFunctions: string[] = [];
  body = body.replace(
    new RegExp(
      `\\b(?:public\\s+|private\\s+|protected\\s+|static\\s+|inline\\s+|const\\s+)*${typePattern}(?:\\s*\\[\\s*\\]|\\s*\\*)?\\s+([A-Za-z_]\\w*)\\s*\\(([^)]*)\\)(?:\\s*throws\\s+[A-Za-z0-9_.,\\s]+)?\\s*\\{`,
      'g'
    ),
    (_m, fnName, rawParams) => {
      if (fnName !== 'main' && fnName !== 'if' && fnName !== 'for' && fnName !== 'while' && fnName !== 'switch') {
        declaredFunctions.push(fnName);
      }
      const cleanedParams = rawParams
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean)
        .map((p: string) => {
          const withoutDefault = p.split('=')[0].trim();
          const defaultPart = p.includes('=') ? '=' + p.split('=').slice(1).join('=') : '';
          const cleaned = withoutDefault
            .replace(/\[\s*\]/g, '')
            .replace(/[&*]/g, ' ')
            .trim();
          const tokens = cleaned.split(/\s+/);
          const varName = tokens[tokens.length - 1];
          return varName + defaultPart;
        })
        .join(', ');
      return `function ${fnName}(${cleanedParams}) {`;
    }
  );

  // Range-based for-each loops in Java / C++: for (int x : arr)
  body = body.replace(
    new RegExp(`\\bfor\\s*\\(\\s*(?:final\\s+|const\\s+)?${typePattern}(?:\\s*&)?\\s+([A-Za-z_]\\w*)\\s*:\\s*([^)]+)\\)`, 'g'),
    'for (let $1 of $2)'
  );

  // For-loop typed initializers: for (int i = 0; ...)
  body = body.replace(
    new RegExp(`\\bfor\\s*\\(\\s*${typePattern}\\s+`, 'g'),
    'for (let '
  );

  // Handle C/Java explicit numeric casts like (int)x, (double)x, (float)x, (long)x
  body = body.replace(/\(\s*(?:double|float)\s*\)\s*/g, '+');
  body = body.replace(/\(\s*(?:int|long|short)\s*\)\s*([A-Za-z_]\w*|\([^)]+\)|\d+(?:\.\d+)?)/g, 'Math.trunc($1)');

  // Const typed variable declarations
  body = body.replace(
    new RegExp(`\\b(?:static\\s+|final\\s+)*const\\s+${typePattern}\\s+`, 'g'),
    'const '
  );

  // Standard typed variable declarations
  body = body.replace(
    new RegExp(`\\b(?:static\\s+|final\\s+)*${typePattern}\\s+([A-Za-z_]\\w*)`, 'g'),
    'let $1'
  );

  // Integer division assignment helper: n /= 10 -> n = Math.trunc(n / 10)
  body = body.replace(/\b([A-Za-z_]\w*)\s*\/=\s*([^;]+);/g, '$1 = Math.trunc($1 / ($2));');

  // C++/Java member helpers (.size() -> .length, .push_back( -> .push()
  body = body.replace(/\.push_back\s*\(/g, '.push(');
  body = body.replace(/\.size\s*\(\s*\)/g, '.length');
  body = body.replace(/\.length\s*\(\s*\)/g, '.length');

  // Restore string literals
  body = body.replace(/__STR_LITERAL_(\d+)__/g, (_m, idx) => stringLiterals[Number(idx)] ?? '""');

  const fallbackFnCall =
    declaredFunctions.length > 0
      ? `
if (typeof main !== 'function' && __out === '' && typeof ${declaredFunctions[declaredFunctions.length - 1]} === 'function') {
  const __args = __tokens.map(t => (!Number.isNaN(Number(t)) && t !== '' ? Number(t) : t));
  const __ret = ${declaredFunctions[declaredFunctions.length - 1]}(...__args);
  if (__ret !== undefined && __ret !== null && __out === '') {
    __println(__ret);
  }
}`
      : '';

  const runnerWrapper = `
const __rawInput = String(typeof __stdinText === 'string' ? __stdinText : '');
const __tokens = __rawInput.trim().length > 0
  ? __rawInput.trim().split(/[\\s,;]+|\\s*\\+\\s*(?=[-+]?\\d)/).filter(Boolean)
  : [];
const __lines = __rawInput.split(/\\r?\\n/);
let __tokIdx = 0;
let __lineIdx = 0;
let __out = '';

function __hasNext() {
  return __tokIdx < __tokens.length;
}
function __cin() {
  if (__tokIdx >= __tokens.length) return 0;
  const t = __tokens[__tokIdx++];
  const n = Number(t);
  return !Number.isNaN(n) && t !== '' ? n : t;
}
function __getline() {
  if (__lineIdx >= __lines.length) return '';
  return __lines[__lineIdx++];
}
function __cout(...args) {
  for (const a of args) {
    __out += (a === undefined || a === null) ? '' : String(a);
  }
}
function __print(...args) {
  __cout(...args);
}
function __println(...args) {
  __cout(...args, '\\n');
}
function __printf(fmt, ...args) {
  if (typeof fmt !== 'string') {
    __cout(fmt, ...args);
    return;
  }
  let argIdx = 0;
  const formatted = fmt.replace(/%%|%(-?\\d*(?:\\.\\d+)?)([diufFeEgGxXosc]|l[diu]|ll[diu]|lf)/g, (m, spec, type) => {
    if (m === '%%') return '%';
    const val = args[argIdx++];
    if (type.endsWith('f') || type === 'e' || type === 'g') {
      const num = Number(val ?? 0);
      if (spec && spec.includes('.')) {
        const prec = parseInt(spec.split('.')[1], 10);
        if (!Number.isNaN(prec)) return num.toFixed(prec);
      }
      return String(num);
    }
    if (type.endsWith('d') || type.endsWith('i') || type.endsWith('u')) {
      return String(Math.trunc(Number(val ?? 0)));
    }
    return String(val ?? '');
  });
  __out += formatted;
}
const __scanner = {
  nextInt: () => {
    const v = Number(__cin());
    return Number.isNaN(v) ? 0 : Math.trunc(v);
  },
  nextLong: () => {
    const v = Number(__cin());
    return Number.isNaN(v) ? 0 : Math.trunc(v);
  },
  nextDouble: () => {
    const v = Number(__cin());
    return Number.isNaN(v) ? 0 : v;
  },
  nextFloat: () => {
    const v = Number(__cin());
    return Number.isNaN(v) ? 0 : v;
  },
  nextBoolean: () => String(__cin()).toLowerCase() === 'true',
  next: () => String(__cin()),
  nextLine: () => String(__getline()),
  hasNext: () => __tokIdx < __tokens.length,
  hasNextInt: () => __tokIdx < __tokens.length && !Number.isNaN(Number(__tokens[__tokIdx])),
  hasNextLong: () => __tokIdx < __tokens.length && !Number.isNaN(Number(__tokens[__tokIdx])),
  hasNextDouble: () => __tokIdx < __tokens.length && !Number.isNaN(Number(__tokens[__tokIdx])),
  hasNextLine: () => __lineIdx < __lines.length,
  close: () => {},
};
const System = {
  in: {},
  out: {
    println: (...args) => __println(...args),
    print: (...args) => __print(...args),
    printf: (fmt, ...args) => __printf(fmt, ...args),
  },
  err: {
    println: (...args) => __println(...args),
    print: (...args) => __print(...args),
  },
  exit: (code = 0) => {
    throw { __systemExit: true, code };
  },
};
const Integer = {
  parseInt: (s, r = 10) => parseInt(String(s).trim(), r),
  valueOf: (s) => parseInt(String(s).trim(), 10),
  toString: (n) => String(n),
  MAX_VALUE: 2147483647,
  MIN_VALUE: -2147483648,
};
const Long = {
  parseLong: (s, r = 10) => parseInt(String(s).trim(), r),
  valueOf: (s) => parseInt(String(s).trim(), 10),
  MAX_VALUE: 9007199254740991,
  MIN_VALUE: -9007199254740991,
};
const Double = {
  parseDouble: (s) => parseFloat(String(s).trim()),
  valueOf: (s) => parseFloat(String(s).trim()),
};
const Float = {
  parseFloat: (s) => parseFloat(String(s).trim()),
  valueOf: (s) => parseFloat(String(s).trim()),
};
const Character = {
  isDigit: (c) => /^[0-9]$/.test(String(c)),
  isLetter: (c) => /^[a-zA-Z]$/.test(String(c)),
  isLetterOrDigit: (c) => /^[a-zA-Z0-9]$/.test(String(c)),
  isUpperCase: (c) => /^[A-Z]$/.test(String(c)),
  isLowerCase: (c) => /^[a-z]$/.test(String(c)),
  toLowerCase: (c) => String(c).toLowerCase(),
  toUpperCase: (c) => String(c).toUpperCase(),
};
const Arrays = {
  sort: (arr) => { if (Array.isArray(arr)) arr.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); },
  fill: (arr, val) => { if (Array.isArray(arr)) arr.fill(val); },
  toString: (arr) => Array.isArray(arr) ? '[' + arr.join(', ') + ']' : String(arr),
  equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
};
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;
const LLONG_MAX = 9007199254740991;
const LLONG_MIN = -9007199254740991;
const max = Math.max;
const min = Math.min;
const abs = Math.abs;
const pow = Math.pow;
const sqrt = Math.sqrt;
const floor = Math.floor;
const ceil = Math.ceil;
const round = Math.round;
function sort(arr) {
  if (Array.isArray(arr)) arr.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
function reverse(arr) {
  if (Array.isArray(arr)) arr.reverse();
}

try {
  ${body}

  if (typeof main === 'function') {
    main();
  }
  ${fallbackFnCall}
} catch (__err) {
  if (!(__err && __err.__systemExit)) {
    throw __err;
  }
}
__setResult(__out);
`;

  try {
    // Syntax check the generated JS before executing
    new Function('__stdinText', '__setResult', runnerWrapper);
  } catch (err: any) {
    return {
      ok: false,
      compileError: `Compilation Error: ${err?.message || 'Syntax error in source code.'}`,
    };
  }

  return { ok: true, jsCode: runnerWrapper };
}

/**
 * Strips TypeScript type annotations so TS source code can run directly in Node's V8 VM.
 */
function stripTypeScriptAnnotations(tsCode: string): string {
  let out = tsCode;
  out = out.replace(/^\s*(?:export\s+)?interface\s+[A-Za-z_]\w*\s*\{[\s\S]*?\}/gm, '');
  out = out.replace(/^\s*(?:export\s+)?type\s+[A-Za-z_]\w*\s*=\s*[^;]+;/gm, '');
  out = out.replace(
    /:\s*(?:number|string|boolean|any|void|unknown|never|object|Record<[^>]+>|Array<[^>]+>|[A-Za-z_]\w*(?:\[\])*)(?:\s*\|\s*(?:number|string|boolean|null|undefined|[A-Za-z_]\w*))*/g,
    ''
  );
  out = out.replace(/\s+as\s+(?:number|string|boolean|any|[A-Za-z_]\w*(?:\[\])*)/g, '');
  return out;
}

/**
 * Fast in-memory V8 VM execution for Python, C, C++, Java, JavaScript, and TypeScript.
 * Avoids Windows cmd.exe process cold-start and stdin pipe blocking, running in ~1ms per test case.
 */
function executeInMemoryVM(
  langKey: string,
  code: string,
  input: string,
  timeoutMs: number
): SandboxExecutionResult | null {
  const startTime = Date.now();
  const vmTimeout = Math.min(Math.max(timeoutMs, 1000), 3000);

  if (langKey === 'python' || langKey === 'py') {
    const transpiled = transpilePythonToJS(code);
    if (!transpiled.ok || !transpiled.jsCode) {
      if (transpiled.fallbackToProcess) {
        return null; // Let fallback Python runner handle exotic syntax
      }
      const msg = transpiled.compileError || 'SyntaxError: invalid syntax';
      return {
        status: 'Compilation Error',
        message: msg,
        stdout: '',
        stderr: msg,
        exitCode: 1,
        timedOut: false,
        error: msg,
        durationMs: Date.now() - startTime,
      };
    }

    let capturedOut = '';
    const sandboxContext = vm.createContext({
      __stdinText: input ?? '',
      __setResult: (val: string) => {
        capturedOut = String(val ?? '');
      },
    });

    try {
      vm.runInContext(
        `
        (function() {
          const StrProto = ('').constructor.prototype;
          const ArrProto = ([]).constructor.prototype;
          const __origSplit = StrProto.split;
          StrProto.split = function(sep, maxsplit) {
            if (typeof __lastReadExtraTokens !== 'undefined') {
              __lastReadExtraTokens = null;
            }
            if (sep === undefined || sep === null) {
              const s = String(this).trim();
              if (!s) return [];
              const parts = __origSplit.call(s, /[\\s,;]+|\\s*\\+\\s*(?=[-+]?\\d)/).filter(Boolean);
              return (maxsplit !== undefined && maxsplit >= 0) ? parts.slice(0, maxsplit + 1) : parts;
            }
            return __origSplit.call(this, sep, maxsplit !== undefined && maxsplit >= 0 ? maxsplit + 1 : undefined);
          };
          StrProto.lower = function() { return String(this).toLowerCase(); };
          StrProto.upper = function() { return String(this).toUpperCase(); };
          StrProto.strip = function() { return String(this).trim(); };
          StrProto.lstrip = function() { return String(this).trimStart(); };
          StrProto.rstrip = function() { return String(this).trimEnd(); };
          StrProto.startswith = function(s) { return String(this).startsWith(s); };
          StrProto.endswith = function(s) { return String(this).endsWith(s); };
          StrProto.find = function(s, st) { return String(this).indexOf(s, st); };
          StrProto.isdigit = function() { return /^[0-9]+$/.test(String(this)); };
          StrProto.isalpha = function() { return /^[A-Za-z]+$/.test(String(this)); };
          StrProto.isalnum = function() { return /^[A-Za-z0-9]+$/.test(String(this)); };
          StrProto.islower = function() { const s = String(this); return /[a-z]/.test(s) && s === s.toLowerCase(); };
          StrProto.isupper = function() { const s = String(this); return /[A-Z]/.test(s) && s === s.toUpperCase(); };
          StrProto.isspace = function() { return /^\\s+$/.test(String(this)); };
          StrProto.join = function(iter) { return Array.from(iter).map(x => String(x)).join(String(this)); };
          StrProto.count = function(sub) {
            const s = String(this), p = String(sub);
            if (!p) return s.length + 1;
            return __origSplit.call(s, p).length - 1;
          };

          const __origPop = ArrProto.pop;
          const __origSort = ArrProto.sort;
          ArrProto.append = function(x) { this.push(x); };
          ArrProto.extend = function(iter) { this.push(...Array.from(iter)); };
          ArrProto.insert = function(idx, val) { this.splice(idx, 0, val); };
          ArrProto.remove = function(val) { const i = this.indexOf(val); if (i !== -1) this.splice(i, 1); };
          ArrProto.count = function(val) { return this.filter(x => x === val).length; };
          ArrProto.pop = function(idx) {
            if (idx === undefined) return __origPop.call(this);
            const actualIdx = idx < 0 ? this.length + idx : idx;
            return this.splice(actualIdx, 1)[0];
          };
          ArrProto.sort = function(arg) {
            if (typeof arg === 'function') {
              return __origSort.call(this, arg);
            }
            const copy = __origSort.call([...this], (a, b) => (a < b ? -1 : a > b ? 1 : 0));
            if (arg && arg.reverse) copy.reverse();
            for (let i = 0; i < this.length; i++) this[i] = copy[i];
            return this;
          };
        })();
        `,
        sandboxContext,
        { timeout: 500 }
      );
      vm.runInContext(transpiled.jsCode, sandboxContext, { timeout: vmTimeout });
      return {
        status: 'OK',
        stdout: capturedOut.trim(),
        stderr: '',
        exitCode: 0,
        timedOut: false,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      const errMsg = String(err?.message || err || 'Runtime Error');
      const isTimeout =
        errMsg.includes('Script execution timed out') || err?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT';
      if (isTimeout) {
        return {
          status: 'Time Limit Exceeded',
          stdout: capturedOut.trim(),
          stderr: 'Time Limit Exceeded',
          exitCode: 124,
          timedOut: true,
          error: 'Time Limit Exceeded',
          durationMs: Date.now() - startTime,
        };
      }
      return {
        status: 'Runtime Error',
        message: errMsg,
        stdout: capturedOut.trim(),
        stderr: errMsg,
        exitCode: 1,
        timedOut: false,
        error: errMsg,
        durationMs: Date.now() - startTime,
      };
    }
  }

  if (langKey === 'cpp' || langKey === 'c' || langKey === 'java') {
    const transpiled = transpileCompiledLanguageToJS(langKey, code);
    if (!transpiled.ok || !transpiled.jsCode) {
      const msg = transpiled.compileError || 'Compilation Error';
      return {
        status: 'Compilation Error',
        message: msg,
        stdout: '',
        stderr: msg,
        exitCode: 1,
        timedOut: false,
        error: msg,
        durationMs: Date.now() - startTime,
      };
    }

    let capturedOut = '';
    const sandboxContext = vm.createContext({
      __stdinText: input ?? '',
      __setResult: (val: string) => {
        capturedOut = String(val ?? '');
      },
      Math,
      Number,
      String,
      Boolean,
      Array,
      Object,
      JSON,
      RegExp,
      Map,
      Set,
      Date,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      console: {
        log: (...args: any[]) => {
          capturedOut += args.map((a) => String(a ?? '')).join(' ') + '\n';
        },
        info: (...args: any[]) => {
          capturedOut += args.map((a) => String(a ?? '')).join(' ') + '\n';
        },
        warn: (...args: any[]) => {
          capturedOut += args.map((a) => String(a ?? '')).join(' ') + '\n';
        },
        error: (...args: any[]) => {
          capturedOut += args.map((a) => String(a ?? '')).join(' ') + '\n';
        },
      },
    });

    try {
      // Attach Java/C++ string & array convenience methods inside VM realm
      vm.runInContext(
        `
        if (!String.prototype.equals) {
          String.prototype.equals = function(other) { return String(this) === String(other); };
          String.prototype.equalsIgnoreCase = function(other) { return String(this).toLowerCase() === String(other).toLowerCase(); };
          String.prototype.isEmpty = function() { return this.length === 0; };
          String.prototype.toCharArray = function() { return Array.from(String(this)); };
        }
        `,
        sandboxContext,
        { timeout: 500 }
      );
      vm.runInContext(transpiled.jsCode, sandboxContext, { timeout: vmTimeout });
      return {
        status: 'OK',
        stdout: capturedOut.trim(),
        stderr: '',
        exitCode: 0,
        timedOut: false,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      const errMsg = String(err?.message || err || 'Runtime Error');
      const isTimeout =
        errMsg.includes('Script execution timed out') || err?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT';
      if (isTimeout) {
        return {
          status: 'Time Limit Exceeded',
          stdout: capturedOut.trim(),
          stderr: 'Time Limit Exceeded',
          exitCode: 124,
          timedOut: true,
          error: 'Time Limit Exceeded',
          durationMs: Date.now() - startTime,
        };
      }
      return {
        status: 'Runtime Error',
        message: errMsg,
        stdout: capturedOut.trim(),
        stderr: errMsg,
        exitCode: 1,
        timedOut: false,
        error: errMsg,
        durationMs: Date.now() - startTime,
      };
    }
  }

  if (langKey === 'javascript' || langKey === 'js' || langKey === 'typescript' || langKey === 'ts') {
    const runnableCode =
      langKey === 'typescript' || langKey === 'ts' ? stripTypeScriptAnnotations(code) : code;

    // Normalize input tokens so fs.readFileSync(0), prompt(), and readline() work seamlessly
    const normalizedInputForSplit = (input ?? '').replace(/(?<=\d)\s*\+\s*(?=[-+]?\d)/g, ' ');
    const tokens = normalizedInputForSplit.trim().length > 0
      ? normalizedInputForSplit.trim().split(/[\s,;]+/).filter(Boolean)
      : [];
    const lines = (input ?? '').split(/\r?\n/);
    let tokIdx = 0;
    let lineIdx = 0;
    let stdoutBuf = '';
    let stderrBuf = '';

    const fakeFs = {
      readFileSync: (fdOrPath: any) => {
        if (fdOrPath === 0 || fdOrPath === '/dev/stdin') {
          return normalizedInputForSplit;
        }
        return '';
      },
    };

    const sandboxContext = vm.createContext({
      console: {
        log: (...args: any[]) => {
          stdoutBuf += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a ?? ''))).join(' ') + '\n';
        },
        info: (...args: any[]) => {
          stdoutBuf += args.map((a) => String(a ?? '')).join(' ') + '\n';
        },
        warn: (...args: any[]) => {
          stdoutBuf += args.map((a) => String(a ?? '')).join(' ') + '\n';
        },
        error: (...args: any[]) => {
          stderrBuf += args.map((a) => String(a ?? '')).join(' ') + '\n';
        },
      },
      require: (modName: string) => {
        if (modName === 'fs') return fakeFs;
        return {};
      },
      process: {
        stdin: { on: () => {}, resume: () => {}, setEncoding: () => {} },
        stdout: {
          write: (s: any) => {
            stdoutBuf += String(s ?? '');
          },
        },
        stderr: {
          write: (s: any) => {
            stderrBuf += String(s ?? '');
          },
        },
        argv: ['node', 'solution.js', ...tokens],
        env: {},
        exit: (codeNum = 0) => {
          throw { __processExit: true, code: codeNum };
        },
      },
      input: normalizedInputForSplit,
      prompt: () => {
        if (tokIdx < tokens.length) return tokens[tokIdx++];
        if (lineIdx < lines.length) return lines[lineIdx++];
        return '0';
      },
      readline: () => {
        if (lineIdx < lines.length) return lines[lineIdx++];
        if (tokIdx < tokens.length) return tokens[tokIdx++];
        return '';
      },
      Buffer,
      Math,
      Number,
      String,
      Boolean,
      Array,
      Object,
      JSON,
      RegExp,
      Map,
      Set,
      Date,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      setTimeout,
      clearTimeout,
    });

    const jsWrapper = `
      ${runnableCode}
    `;

    try {
      const lastVal = vm.runInContext(jsWrapper, sandboxContext, { timeout: vmTimeout });
      if (stdoutBuf.trim() === '' && lastVal !== undefined && typeof lastVal !== 'function') {
        stdoutBuf = String(lastVal);
      }
      return {
        status: 'OK',
        stdout: stdoutBuf.trim(),
        stderr: stderrBuf.trim(),
        exitCode: 0,
        timedOut: false,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      if (err && err.__processExit) {
        return {
          status: err.code === 0 ? 'OK' : 'Runtime Error',
          stdout: stdoutBuf.trim(),
          stderr: stderrBuf.trim(),
          exitCode: err.code ?? 0,
          timedOut: false,
          durationMs: Date.now() - startTime,
        };
      }
      const errMsg = String(err?.message || err || 'Runtime Error');
      const isTimeout =
        errMsg.includes('Script execution timed out') || err?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT';
      if (isTimeout) {
        return {
          status: 'Time Limit Exceeded',
          stdout: stdoutBuf.trim(),
          stderr: 'Time Limit Exceeded',
          exitCode: 124,
          timedOut: true,
          error: 'Time Limit Exceeded',
          durationMs: Date.now() - startTime,
        };
      }
      return {
        status: 'Runtime Error',
        message: errMsg,
        stdout: stdoutBuf.trim(),
        stderr: (stderrBuf + '\n' + errMsg).trim(),
        exitCode: 1,
        timedOut: false,
        error: errMsg,
        durationMs: Date.now() - startTime,
      };
    }
  }

  return null;
}

/**
 * Executes code using normalized LANGUAGE_CONFIG.
 * Supports Python, JavaScript, TypeScript, C++, C, and Java.
 */
export async function executeCode(
  language: string,
  code: string,
  input: string = '',
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<SandboxExecutionResult> {
  // Key normalize karo (jem ke "C++" athva "CPP" hoy to "cpp" thai jaay)
  const langKey = (language || '').trim().toLowerCase().replace('c++', 'cpp');
  const config = LANGUAGE_CONFIG[langKey];

  if (!config) {
    throw new Error(
      `Execution environment error: Unsupported language for isolated execution: ${language}`
    );
  }

  // Fast, deterministic in-memory execution for Python, C, C++, Java, JS, and TS (avoids Windows process spawn timeouts)
  if (
    langKey === 'python' ||
    langKey === 'py' ||
    langKey === 'java' ||
    langKey === 'cpp' ||
    langKey === 'c' ||
    langKey === 'javascript' ||
    langKey === 'js' ||
    langKey === 'typescript' ||
    langKey === 'ts'
  ) {
    const vmResult = executeInMemoryVM(langKey, code, input, timeoutMs);
    if (vmResult) {
      return vmResult;
    }
  }

  const runId = `syntaxviva_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const sandboxDir = path.join(os.tmpdir(), runId);
  fs.mkdirSync(sandboxDir, { recursive: true });

  const sanitizedEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: sandboxDir,
    TMPDIR: sandboxDir,
    PYTHONUNBUFFERED: '1',
    NODE_ENV: 'production',
  };

  const writeToFile = async (relFileName: string, content: string): Promise<string> => {
    const fullPath = path.join(sandboxDir, relFileName);
    await fs.promises.writeFile(fullPath, content, 'utf8');
    return fullPath;
  };

  const runShellCommand = (
    cmdLine: string,
    opts: { input?: string; timeoutMs?: number } = {}
  ): Promise<SandboxExecutionResult & { error?: string }> => {
    const limitMs = opts.timeoutMs ?? timeoutMs;
    const cmdStart = Date.now();

    return new Promise((resolve) => {
      let stdoutAcc = '';
      let stderrAcc = '';
      let timedOut = false;
      let settled = false;

      const child = spawn(cmdLine, {
        cwd: sandboxDir,
        env: sanitizedEnv,
        shell: true,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGTERM');
          setTimeout(() => {
            if (!settled) {
              child.kill('SIGKILL');
            }
          }, 300);
        } catch {
          // ignore
        }
      }, limitMs);

      if (child.stdin) {
        try {
          if (opts.input) {
            child.stdin.write(opts.input);
          }
          child.stdin.end();
        } catch {
          // ignore
        }
      }

      child.stdout.on('data', (data) => {
        if (stdoutAcc.length < MAX_OUTPUT_BUFFER_BYTES) {
          stdoutAcc += data.toString();
        }
      });

      child.stderr.on('data', (data) => {
        if (stderrAcc.length < MAX_OUTPUT_BUFFER_BYTES) {
          stderrAcc += data.toString();
        }
      });

      child.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            stdout: stdoutAcc.trim(),
            stderr: (stderrAcc + '\n' + err.message).trim(),
            exitCode: 1,
            timedOut,
            error: err.message,
            durationMs: Date.now() - cmdStart,
          });
        }
      });

      child.on('close', (exitCode) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            stdout: stdoutAcc.trim(),
            stderr: stderrAcc.trim(),
            exitCode: timedOut ? 124 : exitCode,
            timedOut,
            error: exitCode !== 0 ? stderrAcc.trim() || `Exited with code ${exitCode}` : undefined,
            durationMs: Date.now() - cmdStart,
          });
        }
      });
    });
  };

  try {
    const fileName = `solution.${config.extension}`;
    const binaryName = `solution_bin`;
    const effectiveCode =
      langKey === 'python' || langKey === 'py' ? normalizePythonSource(code) : code;

    // 1. File write karo sandbox ma
    await writeToFile(fileName, effectiveCode);

    // Special tolerant runner for Python so input("prompt") never leaks prompts into stdout
    // and inputs like "10+6", "10, 6", "10 6", "10\n6" are seamlessly parsed
    if (langKey === 'python' || langKey === 'py') {
      const isStandalone = isStandalonePythonScript(effectiveCode);
      const pythonRunner = `import sys
import os
import re
import builtins
import ast
import inspect
import traceback

def _split_tokens(text):
    if not text or not text.strip():
        return []
    return [t for t in re.split(r'[\\s,;]+|\\s*\\+\\s*(?=[-+]?\\d)', text.strip()) if t]

class TolerantString(str):
    def __new__(cls, val, manager=None, line_tokens=None):
        obj = str.__new__(cls, val)
        obj._manager = manager
        obj._tokens = line_tokens or []
        return obj

    def split(self, sep=None, maxsplit=-1):
        if self._manager and self._manager._leftover_tokens:
            self._manager._leftover_tokens.clear()
        if sep is None:
            parts = _split_tokens(str(self))
            if maxsplit >= 0:
                return parts[:maxsplit + 1]
            return parts
        return super().split(sep, maxsplit)

    def __int__(self):
        parts = _split_tokens(str(self))
        if len(parts) > 1 and self._manager:
            if not self._manager._leftover_tokens:
                self._manager._leftover_tokens = list(parts[1:])
        try:
            return int(float(parts[0])) if parts else 0
        except Exception:
            return 0

    def __float__(self):
        parts = _split_tokens(str(self))
        if len(parts) > 1 and self._manager:
            if not self._manager._leftover_tokens:
                self._manager._leftover_tokens = list(parts[1:])
        try:
            return float(parts[0]) if parts else 0.0
        except Exception:
            return 0.0

class TolerantInputManager:
    def __init__(self):
        self._raw_text = None
        self._lines = None
        self._line_idx = 0
        self._leftover_tokens = []
        self._extra_eof_reads = 0
        self._initialized = False

    def _ensure_init(self):
        if not self._initialized:
            try:
                self._raw_text = sys.stdin.read()
            except Exception:
                self._raw_text = ""
            self._lines = [l for l in self._raw_text.splitlines(keepends=False) if l.strip() != ""] or self._raw_text.splitlines(keepends=False)
            self._initialized = True

    def readline(self):
        self._ensure_init()
        if self._leftover_tokens:
            tok = self._leftover_tokens.pop(0)
            return TolerantString(tok, manager=self)
        if self._line_idx < len(self._lines):
            line = self._lines[self._line_idx]
            self._line_idx += 1
            tokens = _split_tokens(line)
            return TolerantString(line, manager=self, line_tokens=tokens)
        self._extra_eof_reads += 1
        if self._extra_eof_reads <= 32:
            return TolerantString("0", manager=self)
        raise EOFError("EOF when reading a line")

_mgr = TolerantInputManager()

def _prompt_tolerant_input(prompt=None):
    return _mgr.readline()

builtins.input = _prompt_tolerant_input

sandbox_dir = os.path.dirname(os.path.abspath(__file__))
solution_file = os.path.join(sandbox_dir, "solution.py")

if sandbox_dir not in sys.path:
    sys.path.insert(0, sandbox_dir)

sys.argv = [solution_file]

try:
    with open(solution_file, "r", encoding="utf-8") as f:
        student_source = f.read()
except Exception as e:
    sys.stderr.write(f"Failed to read source: {e}\\n")
    sys.exit(1)

try:
    parsed_ast = ast.parse(student_source, filename=solution_file)
except SyntaxError as syn_err:
    sys.stderr.write(f"SyntaxError: {syn_err.msg} (line {syn_err.lineno})\\n")
    sys.exit(1)

student_ns = {
    "__name__": "__main__",
    "__file__": solution_file,
    "__doc__": None,
    "__builtins__": builtins,
}

is_standalone = ${isStandalone ? 'True' : 'False'}

try:
    compiled_code = compile(parsed_ast, filename=solution_file, mode="exec")
    exec(compiled_code, student_ns)
except Exception as run_err:
    exc_type, exc_val, exc_tb = sys.exc_info()
    formatted = [line for line in traceback.format_exception(exc_type, exc_val, exc_tb) if "runner.py" not in line]
    sys.stderr.write("".join(formatted))
    sys.exit(1)

if not is_standalone:
    funcs = [
        obj for name, obj in student_ns.items()
        if inspect.isfunction(obj) and getattr(obj, "__module__", None) in ("__main__", None)
    ]
    if funcs:
        target_fn = funcs[-1]
        for f_candidate in funcs:
            if f_candidate.__name__ not in ("solve", "solution") or len(funcs) == 1:
                target_fn = f_candidate
                break

        _mgr._ensure_init()
        raw_input = (_mgr._raw_text or "").strip()
        if raw_input:
            try:
                parsed_arg = ast.literal_eval(raw_input)
            except Exception:
                tokens = _split_tokens(raw_input)
                try:
                    parsed_arg = tuple(int(t) if t.lstrip('-+').isdigit() else float(t) for t in tokens)
                    if len(parsed_arg) == 1:
                        parsed_arg = parsed_arg[0]
                except Exception:
                    parsed_arg = raw_input

            try:
                if isinstance(parsed_arg, tuple):
                    res = target_fn(*parsed_arg)
                else:
                    res = target_fn(parsed_arg)
                if res is not None:
                    print(res)
            except Exception as call_err:
                exc_type, exc_val, exc_tb = sys.exc_info()
                formatted = [line for line in traceback.format_exception(exc_type, exc_val, exc_tb) if "runner.py" not in line]
                sys.stderr.write("".join(formatted))
                sys.exit(1)
`;
      await writeToFile('runner.py', pythonRunner);
      return await runShellCommand(config.runCmd('runner.py'), { input, timeoutMs });
    }

    // 2. Jo compiled language hoy to compile karo
    if (config.isCompiled && config.compileCmd) {
      const compileResult = await runShellCommand(config.compileCmd(fileName, binaryName));
      if (compileResult.error) {
        return {
          status: 'Compilation Error',
          message: compileResult.stderr,
          stdout: '',
          stderr: compileResult.stderr,
          exitCode: 1,
          timedOut: false,
          error: compileResult.stderr,
          durationMs: compileResult.durationMs,
        };
      }
    }

    // 3. Code run karo
    const execCmd = config.isCompiled ? config.runCmd(binaryName) : config.runCmd(fileName);
    const result = await runShellCommand(execCmd, { input, timeoutMs: 3000 });
    return result;
  } finally {
    try {
      if (fs.existsSync(sandboxDir)) {
        fs.rmSync(sandboxDir, { recursive: true, force: true });
      }
    } catch (cleanErr) {
      console.warn('Failed to clean up sandbox dir:', cleanErr);
    }
  }
}

export async function executeInSandbox(
  code: string,
  language: string,
  stdinText: string = '',
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  try {
    return await executeCode(language, code, stdinText, timeoutMs);
  } catch (err: any) {
    return {
      stdout: '',
      stderr: err.message || `Unsupported language for isolated execution: ${language}`,
      exitCode: 1,
      timedOut: false,
      error: err.message,
      durationMs: Date.now() - startTime,
    };
  }
}
