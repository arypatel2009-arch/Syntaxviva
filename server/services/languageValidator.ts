/**
 * Language Validator Utility
 * Strictly enforces that submitted code matches the programming language specified for the assignment.
 */

export interface LanguageValidationResult {
  valid: boolean;
  expectedLanguage: string;
  detectedLanguage?: string;
  error?: string;
}

/**
 * Strips comments and string literals so analysis focuses solely on syntax tokens.
 */
function stripCommentsAndStrings(code: string): string {
  if (!code) return '';
  // Remove multi-line comments /* ... */
  let cleaned = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Remove single line // comments
  cleaned = cleaned.replace(/\/\/.*$/gm, ' ');
  // Remove Python/shell comments # ...
  cleaned = cleaned.replace(/#.*$/gm, ' ');
  // Remove multi-line python docstrings """ ... """ or ''' ... '''
  cleaned = cleaned.replace(/"""[\s\S]*?"""/g, ' ');
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, ' ');
  // Remove double-quoted strings
  cleaned = cleaned.replace(/"(\\.|[^"\\])*"/g, '""');
  // Remove single-quoted strings
  cleaned = cleaned.replace(/'(\\.|[^'\\])*'/g, "''");
  return cleaned;
}

export function validateCodeMatchesLanguage(
  code: string,
  expectedLanguage: string
): LanguageValidationResult {
  const normExpected = (expectedLanguage || '').trim().toLowerCase();
  const trimmedCode = (code || '').trim();

  if (!trimmedCode) {
    return {
      valid: false,
      expectedLanguage: normExpected,
      error: 'Submission code cannot be empty.',
    };
  }

  const clean = stripCommentsAndStrings(trimmedCode);

  // Python syntax signatures
  const hasPythonDef = /\bdef\s+[a-zA-Z_]\w*\s*\(/.test(clean);
  const hasPythonElif = /\belif\b/.test(clean);
  const hasPythonImport = /\b(import\s+[a-zA-Z_]|from\s+[a-zA-Z_]+\s+import)\b/.test(clean);
  const hasPythonPrint = /\bprint\s*\(/.test(clean);
  const hasPythonRange = /\bin\s+range\s*\(/.test(clean);
  const hasPythonExcept = /\b(except|finally)\s*:/.test(clean);
  const hasPythonKeywords = /\b(None|True|False|lambda)\b/.test(clean);
  const isClearlyPython =
    hasPythonDef ||
    hasPythonElif ||
    (hasPythonImport && !clean.includes('import java')) ||
    (hasPythonPrint && !clean.includes('printf') && !clean.includes('cout')) ||
    hasPythonRange ||
    hasPythonExcept ||
    hasPythonKeywords;

  // C / C++ syntax signatures
  const hasCInclude = /#\s*include\s*[<"]/.test(trimmedCode); // Check original for #include
  const hasCPrintf = /\bprintf\s*\(/.test(clean);
  const hasCScanf = /\bscanf\s*\(/.test(clean);
  const hasCMain = /\b(int|void)\s+main\s*\(/.test(clean);
  const hasCppCout = /\b(std::cout|cout\s*<<)\b/.test(clean);
  const hasCppCin = /\b(std::cin|cin\s*>>)\b/.test(clean);
  const hasCTypes = /\b(int|float|double|char|void|long|short)\s+[a-zA-Z_]\w*\s*[(=;,]/.test(clean);
  const hasCBraces = (clean.match(/\{/g) || []).length > 0 && (clean.match(/\}/g) || []).length > 0;
  const hasSemicolons = (clean.match(/;/g) || []).length >= 2;
  const isClearlyC =
    hasCInclude ||
    hasCPrintf ||
    hasCScanf ||
    hasCMain ||
    hasCppCout ||
    hasCppCin ||
    (hasCTypes && hasCBraces && hasSemicolons);

  // Java syntax signatures
  const hasJavaClass = /\b(public|private|protected)?\s*class\s+[a-zA-Z_]\w*/.test(clean);
  const hasJavaMain = /\bpublic\s+static\s+void\s+main\b/.test(clean);
  const hasJavaPrintln = /\bSystem\.out\.print(ln)?\s*\(/.test(clean);
  const isClearlyJava = hasJavaMain || hasJavaPrintln || (hasJavaClass && hasSemicolons && !hasCInclude);

  // JavaScript / TypeScript syntax signatures
  const hasJsConsole = /\bconsole\.log\s*\(/.test(clean);
  const hasJsConstLet = /\b(const|let|var)\s+[a-zA-Z_]\w*\s*=/.test(clean);
  const hasJsFunction = /\bfunction\s+[a-zA-Z_]/.test(clean);

  // Validation rules by expected language:

  // --- C or C++ ---
  if (normExpected === 'c' || normExpected === 'cpp') {
    const langLabel = normExpected.toUpperCase();
    if (isClearlyPython) {
      return {
        valid: false,
        expectedLanguage: normExpected,
        detectedLanguage: 'Python',
        error: `Submitted code appears to be written in Python. This assignment requires ${langLabel} code. Please write and submit your solution in ${langLabel}.`,
      };
    }
    if (isClearlyJava) {
      return {
        valid: false,
        expectedLanguage: normExpected,
        detectedLanguage: 'Java',
        error: `Submitted code appears to be written in Java. This assignment requires ${langLabel} code. Please write and submit your solution in ${langLabel}.`,
      };
    }
    if (hasJsConsole || (hasJsConstLet && !hasCTypes)) {
      return {
        valid: false,
        expectedLanguage: normExpected,
        detectedLanguage: 'JavaScript',
        error: `Submitted code appears to be written in JavaScript. This assignment requires ${langLabel} code.`,
      };
    }
    // Verify basic C/C++ structure
    if (!hasCInclude && !hasCMain && !hasCPrintf && !hasCppCout && !hasCTypes && !hasSemicolons) {
      return {
        valid: false,
        expectedLanguage: normExpected,
        error: `Submitted code does not appear to be valid ${langLabel} code. Please include valid ${langLabel} syntax (e.g. data types, functions, and semicolons).`,
      };
    }
    return { valid: true, expectedLanguage: normExpected };
  }

  // --- Python ---
  if (normExpected === 'python') {
    if (hasCInclude || hasCMain || hasCPrintf || hasCppCout) {
      return {
        valid: false,
        expectedLanguage: 'python',
        detectedLanguage: 'C/C++',
        error: 'Submitted code appears to be written in C/C++. This assignment requires Python code. Please write and submit your solution in Python.',
      };
    }
    if (isClearlyJava) {
      return {
        valid: false,
        expectedLanguage: 'python',
        detectedLanguage: 'Java',
        error: 'Submitted code appears to be written in Java. This assignment requires Python code.',
      };
    }
    if (hasJsConsole || hasJsFunction) {
      return {
        valid: false,
        expectedLanguage: 'python',
        detectedLanguage: 'JavaScript',
        error: 'Submitted code appears to be written in JavaScript. This assignment requires Python code.',
      };
    }
    return { valid: true, expectedLanguage: 'python' };
  }

  // --- Java ---
  if (normExpected === 'java') {
    if (isClearlyPython) {
      return {
        valid: false,
        expectedLanguage: 'java',
        detectedLanguage: 'Python',
        error: 'Submitted code appears to be written in Python. This assignment requires Java code.',
      };
    }
    if (hasCInclude && !hasJavaPrintln) {
      return {
        valid: false,
        expectedLanguage: 'java',
        detectedLanguage: 'C/C++',
        error: 'Submitted code appears to be written in C/C++. This assignment requires Java code.',
      };
    }
    return { valid: true, expectedLanguage: 'java' };
  }

  // --- JavaScript / TypeScript ---
  if (normExpected === 'javascript' || normExpected === 'typescript') {
    if (isClearlyPython) {
      return {
        valid: false,
        expectedLanguage: normExpected,
        detectedLanguage: 'Python',
        error: `Submitted code appears to be written in Python. This assignment requires ${normExpected.toUpperCase()} code.`,
      };
    }
    if (hasCInclude || hasCMain) {
      return {
        valid: false,
        expectedLanguage: normExpected,
        detectedLanguage: 'C/C++',
        error: `Submitted code appears to be written in C/C++. This assignment requires ${normExpected.toUpperCase()} code.`,
      };
    }
    return { valid: true, expectedLanguage: normExpected };
  }

  return { valid: true, expectedLanguage: normExpected };
}
