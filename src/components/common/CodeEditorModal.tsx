import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Copy,
  Check,
  Wand2,
  Map,
  Type,
  Terminal,
  Braces,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Button, toast } from './UIComponents.tsx';
import { BookACallModal } from './BookACallModal.tsx';

/* ============================================================================
 * 1. VS-DARK SYNTAX HIGHLIGHTER & BRACKET PAIR COLORIZER
 * ========================================================================== */

const KEYWORDS_BY_LANG: Record<string, Set<string>> = {
  python: new Set([
    'def',
    'return',
    'if',
    'elif',
    'else',
    'for',
    'while',
    'in',
    'import',
    'from',
    'as',
    'class',
    'pass',
    'break',
    'continue',
    'True',
    'False',
    'None',
    'and',
    'or',
    'not',
    'try',
    'except',
    'finally',
    'with',
    'lambda',
    'yield',
  ]),
  cpp: new Set([
    'int',
    'long',
    'double',
    'float',
    'char',
    'void',
    'bool',
    'auto',
    'const',
    'static',
    'struct',
    'class',
    'public',
    'private',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'break',
    'continue',
    'include',
    'using',
    'namespace',
    'std',
    'vector',
    'string',
    'true',
    'false',
    'nullptr',
  ]),
  java: new Set([
    'public',
    'private',
    'protected',
    'class',
    'interface',
    'static',
    'final',
    'void',
    'int',
    'long',
    'double',
    'boolean',
    'String',
    'return',
    'if',
    'else',
    'for',
    'while',
    'new',
    'import',
    'package',
    'true',
    'false',
    'null',
  ]),
  javascript: new Set([
    'function',
    'const',
    'let',
    'var',
    'return',
    'if',
    'else',
    'for',
    'while',
    'class',
    'new',
    'import',
    'export',
    'default',
    'async',
    'await',
    'true',
    'false',
    'null',
    'undefined',
  ]),
};

const BRACKET_COLORS = [
  'text-amber-300 font-bold',
  'text-fuchsia-400 font-bold',
  'text-sky-400 font-bold',
];

function renderHighlightedLine(
  line: string,
  language: string,
  bracketDepthRef: { depth: number }
): React.ReactNode {
  const trimmed = line.trimStart();
  if (
    (language === 'python' && trimmed.startsWith('#')) ||
    (language !== 'python' && (trimmed.startsWith('//') || trimmed.startsWith('/*')))
  ) {
    return <span className="text-emerald-500/80 italic">{line}</span>;
  }

  const kwSet =
    KEYWORDS_BY_LANG[language.toLowerCase()] || KEYWORDS_BY_LANG.python;

  // Tokenize by strings, words, numbers, brackets, and other chars
  const tokenRegex =
    /(".*?"|'.*?'|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b|[()[\]{}]|\s+|.)/g;
  const tokens = line.match(tokenRegex) || [];

  return tokens.map((tok, i) => {
    if (
      (tok.startsWith('"') && tok.endsWith('"')) ||
      (tok.startsWith("'") && tok.endsWith("'"))
    ) {
      return (
        <span key={i} className="text-amber-300">
          {tok}
        </span>
      );
    }

    if (kwSet.has(tok)) {
      return (
        <span key={i} className="text-sky-400 font-semibold">
          {tok}
        </span>
      );
    }

    if (/^\d+(\.\d+)?$/.test(tok)) {
      return (
        <span key={i} className="text-emerald-300">
          {tok}
        </span>
      );
    }

    if (tok === '(' || tok === '[' || tok === '{') {
      const colorClass =
        BRACKET_COLORS[bracketDepthRef.depth % BRACKET_COLORS.length];
      bracketDepthRef.depth += 1;
      return (
        <span key={i} className={colorClass}>
          {tok}
        </span>
      );
    }

    if (tok === ')' || tok === ']' || tok === '}') {
      bracketDepthRef.depth = Math.max(0, bracketDepthRef.depth - 1);
      const colorClass =
        BRACKET_COLORS[bracketDepthRef.depth % BRACKET_COLORS.length];
      return (
        <span key={i} className={colorClass}>
          {tok}
        </span>
      );
    }

    return (
      <span key={i} className="text-slate-100">
        {tok}
      </span>
    );
  });
}

/* ============================================================================
 * 2. VS CODE SMART FORMATTER (MULTI-LINE & 4-SPACE AUTO-INDENTATION)
 * ========================================================================== */

export function formatCodeLikeVSCode(rawCode: string, language: string): string {
  if (!rawCode || !rawCode.trim()) return rawCode;

  const lang = (language || 'python').toLowerCase().trim();
  let code = rawCode.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');

  if (lang === 'python' || lang === 'py') {
    interface ExtractedPyStmt {
      stmt: string;
      origIndent: number;
      wasJammed: boolean;
    }

    // Helper to split a single line of jammed Python statements outside parens/brackets/quotes
    const splitSingleLinePython = (lineStr: string): ExtractedPyStmt[] => {
      const leadingSpaces = lineStr.match(/^\s*/)?.[0] || '';
      const origIndent = Math.round(leadingSpaces.length / 4);
      const trimmedLine = lineStr.trim();
      if (!trimmedLine) return [];
      if (trimmedLine.startsWith('#')) {
        return [{ stmt: trimmedLine, origIndent, wasJammed: false }];
      }

      // Walk character by character tracking quotes and paren/bracket/brace depth
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
          // If there is non-whitespace after ':' on this top-level block header, break line
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

      // Now split top-level jammed statements (e.g. `second_largest = float('-inf') for num in numbers:`)
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
          // Check if this is the final print(...) statement of the script printing an accumulator after a loop
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

  // C, C++, Java, JavaScript, TypeScript formatter
  // 1. Ensure #include / #define directives are followed by a newline
  code = code.replace(/(#\s*include\s*[<"][^>\n"]+[>"])\s*(?=\S)/g, '$1\n');
  code = code.replace(/(#\s*define\s+[^\n]+)\s+(?=(?:int|void|double|float|char|bool|long|using|struct|class)\b)/g, '$1\n');

  // 2. Token-aware line splitting around '{', '}', and ';' (preserving strings, comments, and for(...) headers)
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let parenDepth = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';
    const prev = i > 0 ? code[i - 1] : '';

    if (inLineComment) {
      out += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      out += ch;
      if (prev === '*' && ch === '/') inBlockComment = false;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '/' && next === '/') {
        inLineComment = true;
        out += ch;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        out += ch;
        continue;
      }
    }

    if (ch === "'" && !inDouble && prev !== '\\') {
      inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (ch === '"' && !inSingle && prev !== '\\') {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    if (inSingle || inDouble) {
      out += ch;
      continue;
    }

    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (ch === '{') {
      // Ensure space before '{' if preceded by identifier or ')'
      if (out.length > 0 && /[A-Za-z0-9_)]$/.test(out)) {
        out += ' ';
      }
      out += '{\n';
      while (i + 1 < code.length && (code[i + 1] === ' ' || code[i + 1] === '\t')) {
        i++;
      }
      if (i + 1 < code.length && code[i + 1] === '\n') {
        i++;
      }
      continue;
    }

    if (ch === '}') {
      // Ensure '}' starts on a fresh line if current line has code
      const lastNewlineIdx = out.lastIndexOf('\n');
      const currentLineContent = lastNewlineIdx === -1 ? out : out.slice(lastNewlineIdx + 1);
      if (currentLineContent.trim().length > 0) {
        out = out.trimEnd() + '\n';
      }
      out += '}';

      // Skip spaces after '}'
      while (i + 1 < code.length && (code[i + 1] === ' ' || code[i + 1] === '\t')) {
        i++;
      }
      const afterBrace = i + 1 < code.length ? code[i + 1] : '';
      if (afterBrace && afterBrace !== '\n' && afterBrace !== ';' && afterBrace !== ',' && afterBrace !== ')') {
        out += '\n';
      }
      continue;
    }

    if (ch === ';' && parenDepth === 0) {
      out += ';';
      while (i + 1 < code.length && (code[i + 1] === ' ' || code[i + 1] === '\t')) {
        i++;
      }
      const afterSemi = i + 1 < code.length ? code[i + 1] : '';
      const afterSemi2 = i + 2 < code.length ? code[i + 2] : '';
      if (afterSemi && afterSemi !== '\n' && !(afterSemi === '/' && (afterSemi2 === '/' || afterSemi2 === '*'))) {
        out += '\n';
      }
      continue;
    }

    out += ch;
  }

  // 3. Re-indent every line using 4-space VS Code block indentation
  const rawSplit = out.split('\n');
  const formattedLines: string[] = [];
  let indentLevel = 0;
  let blankRun = 0;

  for (const rawLine of rawSplit) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      blankRun++;
      if (blankRun <= 1 && formattedLines.length > 0) {
        formattedLines.push('');
      }
      continue;
    }
    blankRun = 0;

    // Count leading closing braces on this line
    let leadingCloses = 0;
    while (leadingCloses < trimmed.length && trimmed[leadingCloses] === '}') {
      leadingCloses++;
    }

    const isCaseOrAccess = /^(case\b|default\s*:|public\s*:|private\s*:|protected\s*:)/.test(trimmed);
    const effectiveIndent = Math.max(
      0,
      indentLevel - leadingCloses - (isCaseOrAccess ? 1 : 0)
    );

    formattedLines.push('    '.repeat(effectiveIndent) + trimmed);

    // Count net brace change on this line (outside strings/comments)
    let netBraces = 0;
    let sQuote = false;
    let dQuote = false;
    for (let j = 0; j < trimmed.length; j++) {
      const c = trimmed[j];
      const p = j > 0 ? trimmed[j - 1] : '';
      if (!sQuote && !dQuote && c === '/' && trimmed[j + 1] === '/') break;
      if (c === "'" && !dQuote && p !== '\\') sQuote = !sQuote;
      else if (c === '"' && !sQuote && p !== '\\') dQuote = !dQuote;
      else if (!sQuote && !dQuote) {
        if (c === '{') netBraces++;
        else if (c === '}') netBraces--;
      }
    }

    indentLevel = Math.max(0, indentLevel + netBraces);
  }

  return formattedLines.join('\n').trim() + '\n';
}

/* ============================================================================
 * 3. DEVELOPER CODE EDITOR COMPONENT (VS-DARK + MINIMAP + TOOLBAR)
 * ========================================================================== */

export interface DeveloperCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onLanguageChange?: (language: string) => void;
  readOnly?: boolean;
  minHeight?: number;
  filename?: string;
  minimalToolbar?: boolean;
}

export const DeveloperCodeEditor: React.FC<DeveloperCodeEditorProps> = ({
  value,
  onChange,
  language,
  onLanguageChange,
  readOnly = false,
  minHeight = 220,
  filename,
  minimalToolbar = false,
}) => {
  const [fontSize, setFontSize] = useState<number>(13);
  const [showMinimap, setShowMinimap] = useState<boolean>(!minimalToolbar);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number>(1);
  const [activeCol, setActiveCol] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const normalizedValue = (value || '').replace(/\r\n?/g, '\n');
  const lines = normalizedValue.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Auto-format ONLY if initial or loaded code is squished onto 1 single line
  useEffect(() => {
    if (!value || readOnly) return;
    const trimmed = value.trim();
    const currentLines = trimmed.split(/\r?\n/);
    const hasBlockMarkers =
      trimmed.includes('{') ||
      trimmed.includes(';') ||
      trimmed.includes('#include') ||
      /\b(?:public\s+class|def\s+\w+|for\s+\w+|while\s+|if\s+|elif\s+|else\s*:)/.test(trimmed);
    const isSingleLineJammed = currentLines.length === 1 && trimmed.length > 30 && hasBlockMarkers;

    if (isSingleLineJammed) {
      const formatted = formatCodeLikeVSCode(value, language);
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  }, [value, language, readOnly]);

  const updateCursorMetrics = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart || 0;
    const beforeCursor = normalizedValue.slice(0, pos);
    const splitBefore = beforeCursor.split('\n');
    setActiveLine(splitBefore.length);
    setActiveCol((splitBefore[splitBefore.length - 1]?.length || 0) + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // VS Code Format Document Shortcut: Shift + Alt + F
    if (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      handleFormatCode();
      return;
    }

    // Tab / Shift+Tab indentation (4 spaces, supports single line and multi-line selections)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (start !== end && normalizedValue.slice(start, end).includes('\n')) {
        const lineStart = normalizedValue.lastIndexOf('\n', start - 1) + 1;
        const selectedBlock = normalizedValue.slice(lineStart, end);
        const blockLines = selectedBlock.split('\n');
        const updatedLines = blockLines.map((line) =>
          e.shiftKey ? line.replace(/^ {1,4}/, '') : '    ' + line
        );
        const replacement = updatedLines.join('\n');
        const next =
          normalizedValue.slice(0, lineStart) +
          replacement +
          normalizedValue.slice(end);
        onChange(next);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = lineStart;
            textareaRef.current.selectionEnd = lineStart + replacement.length;
            updateCursorMetrics();
          }
        }, 0);
      } else if (e.shiftKey) {
        const lineStart = normalizedValue.lastIndexOf('\n', start - 1) + 1;
        const currentLine = normalizedValue.slice(lineStart, end);
        const removed = currentLine.match(/^ {1,4}/)?.[0].length || 0;
        if (removed > 0) {
          const next =
            normalizedValue.slice(0, lineStart) +
            normalizedValue.slice(lineStart + removed);
          onChange(next);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = Math.max(lineStart, start - removed);
              updateCursorMetrics();
            }
          }, 0);
        }
      } else {
        const next =
          normalizedValue.substring(0, start) +
          '    ' +
          normalizedValue.substring(end);
        onChange(next);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
            updateCursorMetrics();
          }
        }, 0);
      }
      return;
    }
  };

  const handleFormatCode = () => {
    if (readOnly || !normalizedValue.trim()) return;
    const formatted = formatCodeLikeVSCode(normalizedValue, language);
    onChange(formatted);
    toast.success('Code formatted', 'Formatted in VS Code multi-line 4-space style.');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(normalizedValue);
      setCopied(true);
      toast.success('Snippet copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const bracketDepthRef = { depth: 0 };
  const rowHeightPx = Math.round(fontSize * 1.75);

  // Dynamic gutter width for 1000+ and 10000+ line documents
  const gutterWidthClass =
    lineCount >= 10000 ? 'w-20' : lineCount >= 1000 ? 'w-16' : lineCount >= 100 ? 'w-14' : 'w-12';

  // Sample minimap lines proportionally for large documents (1000+ lines)
  const minimapSampleLines =
    lineCount > 100
      ? Array.from({ length: 70 }, (_, i) => ({
          line: lines[Math.floor((i * lineCount) / 70)] || '',
          idx: Math.floor((i * lineCount) / 70),
        }))
      : lines.map((line, idx) => ({ line, idx }));

  return (
    <div
      className={`rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e] shadow-xs flex flex-col ${
        isFullscreen
          ? 'fixed inset-2 sm:inset-6 z-50 shadow-2xl border-emerald-500/40 border-2'
          : 'relative'
      }`}
    >
      {/* Top VS-Dark Editor Toolbar */}
      <div className="px-3.5 py-2 bg-[#18181b] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Mac Chrome Dots + Filename + Language Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
          </div>

          {filename && (
            <span className="text-xs font-mono text-slate-200 font-semibold bg-[#1e1e1e] px-2.5 py-1 rounded-md border border-slate-700/80">
              {filename}
            </span>
          )}

          {onLanguageChange && !readOnly ? (
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              aria-label="Editor language"
              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="python">python</option>
              <option value="cpp">cpp</option>
              <option value="java">java</option>
              <option value="javascript">javascript</option>
              <option value="typescript">typescript</option>
              <option value="c">c</option>
            </select>
          ) : (
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-[11px] lowercase">
              {language}
            </span>
          )}

          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
            VS Code Mode • {lineCount} lines
          </span>
        </div>

        {/* Right: Format Code, Font Size, Minimap Toggle, Copy, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <button
              type="button"
              onClick={handleFormatCode}
              title="Format Code (Shift+Alt+F)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition cursor-pointer"
            >
              <Wand2 className="w-3 h-3 text-emerald-400" />
              <span>Format Code</span>
            </button>
          )}

          {/* Font Size Selector */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[11px] text-slate-300">
            <Type className="w-3 h-3 text-slate-400" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              aria-label="Font size"
              className="bg-transparent text-slate-200 font-mono text-[11px] focus:outline-hidden cursor-pointer"
            >
              <option value={12} className="bg-slate-900">12px</option>
              <option value={13} className="bg-slate-900">13px</option>
              <option value={14} className="bg-slate-900">14px</option>
              <option value={16} className="bg-slate-900">16px</option>
            </select>
          </div>

          {!minimalToolbar && (
            <button
              type="button"
              onClick={() => setShowMinimap((prev) => !prev)}
              title="Toggle Mini-Map"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                showMinimap
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3 h-3" />
              <span className="hidden sm:inline">Minimap</span>
            </button>
          )}

          {/* Quick Copy Snippet */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Fullscreen / Expand Editor Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen / Maximize Editor'}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 text-[11px] font-bold transition cursor-pointer shadow-sm shadow-emerald-600/30"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-white" />
                <span>Full Screen IDE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Editor Body: Unified Single-Scroll Area for 100% Synced Gutter, Syntax Layer & Editable Textarea */}
      <div
        className="relative flex-1 w-full overflow-auto bg-[#1e1e1e] flex items-start"
        style={{
          minHeight: `${minHeight}px`,
          height: isFullscreen ? 'calc(100vh - 80px)' : undefined,
          maxHeight: isFullscreen ? undefined : '700px',
        }}
      >
        {/* Automatic Sticky Line Numbering Gutter */}
        <div
          className={`sticky left-0 z-10 select-none pt-3 pb-32 px-2 text-right bg-[#18181b] text-slate-500 border-r border-slate-800/90 font-mono ${gutterWidthClass} shrink-0`}
          style={{ fontSize: `${fontSize}px`, lineHeight: `${rowHeightPx}px` }}
        >
          {Array.from({ length: Math.max(lineCount + 20, 25) }, (_, idx) => {
            const lineNum = idx + 1;
            const isActive = lineNum === activeLine;
            const isBeyond = lineNum > lineCount;
            return (
              <div
                key={lineNum}
                style={{ height: `${rowHeightPx}px`, lineHeight: `${rowHeightPx}px` }}
                className={`${
                  isActive
                    ? 'text-emerald-400 font-bold bg-slate-800/40 -mx-2 px-2 rounded-xs'
                    : isBeyond
                    ? 'text-slate-800/30'
                    : 'text-slate-500'
                }`}
              >
                {isBeyond ? '' : lineNum}
              </div>
            );
          })}
        </div>

        {/* Code Container holding Syntax Highlighted Pre + Editable Textarea */}
        <div className="relative flex-1 min-w-0 min-h-full">
          {/* Syntax Highlight Layer (Static flow defines container height) */}
          <pre
            aria-hidden="true"
            className="m-0 pt-3 pb-32 px-4 font-mono whitespace-pre pointer-events-none select-none text-slate-100 min-w-full"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${rowHeightPx}px`,
              tabSize: 4,
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                style={{ height: `${rowHeightPx}px`, lineHeight: `${rowHeightPx}px` }}
                className={`${
                  i + 1 === activeLine && !readOnly ? 'bg-slate-800/55 -mx-4 px-4' : ''
                }`}
              >
                {line.length > 0 ? (
                  renderHighlightedLine(line, language, bracketDepthRef)
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            ))}
          </pre>

          {/* Absolute Textarea matching Pre dimensions 1:1 */}
          <textarea
            ref={textareaRef}
            value={normalizedValue}
            readOnly={readOnly}
            wrap="off"
            onChange={(e) => {
              onChange(e.target.value.replace(/\r\n?/g, '\n'));
              updateCursorMetrics();
            }}
            onClick={updateCursorMetrics}
            onKeyUp={updateCursorMetrics}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder={`// Write or paste your ${language.toUpperCase()} code here (VS Code multi-line editor supports 1000+ lines)...`}
            className="absolute inset-0 w-full h-full m-0 pt-3 pb-32 px-4 bg-transparent text-transparent placeholder:text-slate-600 caret-emerald-400 font-mono whitespace-pre resize-none focus:outline-hidden overflow-hidden selection:bg-emerald-500/30"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${rowHeightPx}px`,
              tabSize: 4,
            }}
          />
        </div>

        {/* Toggleable Live Mini-Map (Sticky to top right) */}
        {!minimalToolbar && showMinimap && (
          <div
            aria-label="Code Minimap"
            className="hidden sm:block sticky top-0 right-0 z-10 w-20 bg-[#161618] border-l border-slate-800/90 p-2 select-none shrink-0 self-start max-h-full overflow-hidden"
          >
            <div className="text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
              Minimap
            </div>
            <div className="space-y-0.5">
              {minimapSampleLines.map(({ line, idx }) => {
                const indent = Math.min(24, (line.match(/^\s*/)?.[0].length || 0) * 2);
                const widthPct = Math.min(100, Math.max(12, line.trim().length * 2));
                const isComment = line.trim().startsWith('#') || line.trim().startsWith('//');
                const isDef =
                  line.trim().startsWith('def ') ||
                  line.trim().startsWith('class ') ||
                  line.trim().startsWith('function ');
                return (
                  <div
                    key={idx}
                    className="h-1 rounded-full"
                    style={{
                      marginLeft: `${indent}px`,
                      width: `${widthPct}%`,
                      backgroundColor: isDef
                        ? '#38bdf8'
                        : isComment
                        ? '#10b981'
                        : idx + 1 === activeLine
                        ? '#f59e0b'
                        : '#475569',
                      opacity: idx + 1 === activeLine ? 0.95 : 0.55,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* VS-Dark Status Footer */}
      <div className="px-3.5 py-1.5 bg-[#18181b] border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            Ln {activeLine}, Col {activeCol}
          </span>
          <span>•</span>
          <span>{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Spaces: 4</span>
          <span>UTF-8</span>
          <span className="text-emerald-400 uppercase">{language}</span>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. CLI / MONOSPACE TEST CASE RUNNER CARD
 * ========================================================================== */

export interface TestCaseItem {
  input: string;
  expected: string;
  description?: string;
  compilerArgs?: string;
}

interface CliTestCaseCardProps {
  index: number;
  testCase: TestCaseItem;
  language: string;
  canDelete: boolean;
  onUpdate: (index: number, field: keyof TestCaseItem, value: string) => void;
  onDelete: (index: number) => void;
}

const DEFAULT_COMPILER_ARGS: Record<string, string> = {
  python: 'python3 -u -W ignore solution.py',
  cpp: 'g++ -O2 -Wall -std=c++20 solution.cpp -o solution',
  c: 'gcc -O2 -Wall -std=c17 solution.c -o solution',
  java: 'javac Solution.java && java -Xmx256m Solution',
  javascript: 'node --no-warnings solution.js',
  typescript: 'tsx solution.ts',
};

export const CliTestCaseCard: React.FC<CliTestCaseCardProps> = ({
  index,
  testCase,
  language,
  canDelete,
  onUpdate,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'stdin' | 'stdout' | 'args'>('stdin');
  const [jsonFormatMode, setJsonFormatMode] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const defaultArgs =
    DEFAULT_COMPILER_ARGS[language.toLowerCase()] || DEFAULT_COMPILER_ARGS.python;
  const compilerArgsValue = testCase.compilerArgs ?? defaultArgs;

  const formatDisplayValue = (raw: string) => {
    if (!jsonFormatMode) return raw;
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  const handleCopyValue = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`Copied ${label} for Case #${index + 1}`);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="group font-mono text-sm bg-slate-900 text-slate-100 rounded-lg p-3.5 border border-slate-800 border-l-4 border-l-emerald-500 space-y-3 transition-all">
      {/* Top Terminal Bar: Case # + Tabs + JSON/Raw Toggle + Delete */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>Case #{index + 1}</span>
          </span>

          {/* Interactive Tabs: stdin | expected stdout | compiler args */}
          <div className="inline-flex items-center rounded-md bg-slate-950 p-0.5 border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('stdin')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                activeTab === 'stdin'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              stdin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stdout')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                activeTab === 'stdout'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              expected stdout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('args')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                activeTab === 'args'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              compiler args
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Syntax-Aware JSON / Raw String Toggle */}
          <button
            type="button"
            onClick={() => setJsonFormatMode((prev) => !prev)}
            title="Toggle JSON / Raw formatting"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition cursor-pointer ${
              jsonFormatMode
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Braces className="w-3 h-3" />
            <span>{jsonFormatMode ? 'JSON' : 'RAW'}</span>
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
              title="Remove test case"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Body */}
      {activeTab === 'stdin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>$ stdin (input stream)</span>
              <button
                type="button"
                onClick={() => handleCopyValue('stdin', testCase.input)}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
              >
                {copiedField === 'stdin' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <input
              type="text"
              value={formatDisplayValue(testCase.input)}
              onChange={(e) => onUpdate(index, 'input', e.target.value)}
              placeholder="e.g. [2, 7, 11, 15], 9"
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>&gt; expected stdout</span>
              <button
                type="button"
                onClick={() => handleCopyValue('stdout', testCase.expected)}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
              >
                {copiedField === 'stdout' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <input
              type="text"
              value={formatDisplayValue(testCase.expected)}
              onChange={(e) => onUpdate(index, 'expected', e.target.value)}
              placeholder="e.g. [0, 1]"
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {activeTab === 'stdout' && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Expected Standard Output Verification Stream</span>
            <button
              type="button"
              onClick={() => handleCopyValue('stdout', testCase.expected)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy stdout</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={formatDisplayValue(testCase.expected)}
            onChange={(e) => onUpdate(index, 'expected', e.target.value)}
            placeholder="Exact expected output..."
            className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      )}

      {activeTab === 'args' && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Sandbox Compiler &amp; Execution Flags</span>
            <button
              type="button"
              onClick={() => handleCopyValue('compiler args', compilerArgsValue)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy flags</span>
            </button>
          </div>
          <input
            type="text"
            value={compilerArgsValue}
            onChange={(e) => onUpdate(index, 'compilerArgs', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 4. CODE EDITOR MODAL (CREATE / CONFIGURE ASSIGNMENT MODAL)
 * ========================================================================== */

export interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [language, setLanguage] = useState('python');
  const [dueDate, setDueDate] = useState('2026-12-31');

  const [testCases, setTestCases] = useState<TestCaseItem[]>([
    { input: '', expected: '', description: 'Test Case #1' },
  ]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        input: '',
        expected: '',
        description: `Test Case #${testCases.length + 1}`,
      },
    ]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (
    index: number,
    field: keyof TestCaseItem,
    value: string
  ) => {
    const updated = [...testCases];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTestCases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim() || cleanTitle;

    if (!cleanTitle) {
      setError('Please provide an assignment title.');
      return;
    }

    setLoading(true);
    try {
      const nonEmptyTestCases = testCases
        .map((tc) => ({
          input: typeof tc.input === 'string' ? tc.input : String(tc.input ?? ''),
          expected:
            typeof tc.expected === 'string' ? tc.expected : String(tc.expected ?? ''),
          description: tc.description || '',
        }))
        .filter((tc) => tc.input.trim().length > 0 || tc.expected.trim().length > 0);

      const res = await api.createAssignment({
        title: cleanTitle,
        description: cleanDescription,
        requirements: requirements.trim(),
        language: language || 'python',
        starterCode: '',
        dueDate: dueDate || '2026-12-31',
        testCases: nonEmptyTestCases,
      });
      toast.success(
        'Assignment published & notified',
        `Notification with deadline (${dueDate || '2026-12-31'}) sent to ${res.notifiedStudentCount ?? 0} logged-in student(s).`
      );
      setTitle('');
      setDescription('');
      setRequirements('');
      setTestCases([{ input: '', expected: '', description: 'Test Case #1' }]);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to create assignment.';
      setError(msg);
      toast.error('Could not create assignment', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Create New Assignment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure problem requirements and CLI test runners.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-sm">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              {(error.includes('Free Credit limit') || error.includes('Book a Call')) && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBookModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    Book a Call to Upgrade to Pro ➔
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Title, Language & Deadline Date */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Assignment Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement Balanced Binary Search Tree"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="python">Python 3</option>
                <option value="cpp">C++ (GCC)</option>
                <option value="java">Java 17</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="typescript">TypeScript</option>
                <option value="c">C (GCC)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Deadline Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Problem Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State the algorithmic problem, input constraints, and expected return value..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Gemini AI Evaluation Banner */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5 shadow-xs">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-blue-950 block">Gemini AI Code Evaluation Enabled</span>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Faculty no longer need to create manual test cases. Gemini AI will automatically evaluate students&apos; code directly against your problem statement and functional requirements.
              </p>
            </div>
          </div>

          {/* Optional Test Case Runners */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Optional Sample Test Cases ({testCases.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Optional reference inputs/outputs for students.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTestCase}
                icon={Plus}
              >
                Add Sample
              </Button>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {testCases.map((tc, idx) => (
                <CliTestCaseCard
                  key={idx}
                  index={idx}
                  testCase={tc}
                  language={language}
                  canDelete={testCases.length > 0}
                  onUpdate={updateTestCase}
                  onDelete={removeTestCase}
                />
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              icon={Save}
            >
              Publish Assignment
            </Button>
          </div>
        </form>
      </div>

      <BookACallModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        initialInquiryType="Pro plan pricing"
      />
    </div>
  );
};
