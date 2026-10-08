import { Router, Response, Request } from 'express';
import { getRepository } from '../repository/index.js';
import { MutationEngine } from '../mutation/engine.js';
import { MutationRegistry } from '../mutation/registry.js';
import { computeCodeHash } from '../mutation/hasher.js';
import { MutationTypeCode } from '../mutation/types.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../auth/jwt.js';

export const registryRouter = Router();

// Get registered mutation types
registryRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = getRepository();
    const mutations = await repo.getMutationTypes();

    res.json({
      total: mutations.length,
      mutations: mutations.map((m: any) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        description: m.description,
        isActive: m.is_active === 1 || m.is_active === true,
        createdAt: m.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching mutation registry:', err);
    res.status(500).json({ error: 'Failed to retrieve mutation registry.' });
  }
});

// Toggle a mutation type active/inactive (Strictly Admin only)
registryRouter.patch(
  '/:code/toggle',
  authenticate,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const repo = getRepository();
      const updated = await repo.toggleMutationType(code);

      if (!updated) {
        res.status(404).json({ error: `Mutation type '${code}' not found.` });
        return;
      }

      const isActive = updated.is_active === 1 || updated.is_active === true;

      // Also update in-memory registry
      MutationRegistry.getInstance().setEnabled(code as MutationTypeCode, isActive);

      res.json({
        success: true,
        code,
        isActive,
      });
    } catch (err: any) {
      console.error('Error toggling mutation type:', err);
      res.status(500).json({ error: 'Failed to toggle mutation type.' });
    }
  }
);

// Preview mutation on code without modifying any attempt
registryRouter.post('/preview', (req: Request, res: Response): void => {
  try {
    const { code, language, seed, requestedMutationType } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code is required.' });
      return;
    }

    const engine = MutationEngine.getInstance();
    const result = engine.processSubmission({
      code,
      language: language || 'python',
      seed,
      requestedMutationType,
    });

    res.json({ result });
  } catch (err: any) {
    console.error('Error previewing mutation:', err);
    res.status(500).json({ error: 'Failed to preview mutation.' });
  }
});

// Automated Verification Suite (10 Core Requirements)
registryRouter.get('/verify', (req: Request, res: Response): void => {
  try {
    const engine = MutationEngine.getInstance();
    const testResults: Array<{ id: number; name: string; passed: boolean; details: any }> = [];

    // Test 1: Python code input -> 1 mutated output
    const pyCode1 = `def add(a, b):\n    return a + b\n`;
    const res1 = engine.processSubmission({ code: pyCode1, language: 'python', seed: 'seed_1' });
    testResults.push({
      id: 1,
      name: 'Python code input -> 1 mutated output',
      passed: res1.success && res1.mutatedCode !== pyCode1 && !!res1.metadata,
      details: res1.success
        ? {
            mutationType: res1.mutationType,
            original: res1.originalCodeHash.substring(0, 12),
            mutated: res1.mutatedCodeHash.substring(0, 12),
          }
        : { error: res1.error },
    });

    // Test 2: JavaScript code input -> 1 mutated output
    const jsCode2 = `function findMax(a, b) {\n  if (a > b) return a;\n  return b;\n}\n`;
    const res2 = engine.processSubmission({ code: jsCode2, language: 'javascript', seed: 'seed_2' });
    testResults.push({
      id: 2,
      name: 'JavaScript code input -> 1 mutated output',
      passed: res2.success && res2.mutatedCode !== jsCode2 && !!res2.metadata,
      details: res2.success
        ? {
            mutationType: res2.mutationType,
            original: res2.originalCodeHash.substring(0, 12),
            mutated: res2.mutatedCodeHash.substring(0, 12),
          }
        : { error: res2.error },
    });

    // Test 3: Same input + same seed -> exact same mutation (Determinism)
    const res3a = engine.processSubmission({ code: pyCode1, language: 'python', seed: 'seed_fixed_123' });
    const res3b = engine.processSubmission({ code: pyCode1, language: 'python', seed: 'seed_fixed_123' });
    const test3Passed =
      res3a.success &&
      res3b.success &&
      res3a.mutatedCodeHash === res3b.mutatedCodeHash &&
      res3a.mutationType === res3b.mutationType;
    testResults.push({
      id: 3,
      name: 'Same input + same seed -> exact same mutation (Determinism)',
      passed: test3Passed,
      details: {
        identicalHashes: res3a.success && res3b.success && res3a.mutatedCodeHash === res3b.mutatedCodeHash,
        hashA: res3a.success ? res3a.mutatedCodeHash.substring(0, 12) : null,
        hashB: res3b.success ? res3b.mutatedCodeHash.substring(0, 12) : null,
      },
    });

    // Test 4: Same input + different seed -> different mutation (when multiple candidate sites exist)
    const multiCandCode = `def process(items, threshold):\n    count = 0\n    for i in range(len(items)):\n        if items[i] > threshold:\n            count += 1\n    return count > 0\n`;
    const res4a = engine.processSubmission({ code: multiCandCode, language: 'python', seed: 'seed_alpha_111' });
    const res4b = engine.processSubmission({ code: multiCandCode, language: 'python', seed: 'seed_beta_999' });
    const test4Passed =
      res4a.success &&
      res4b.success &&
      (res4a.mutatedCodeHash !== res4b.mutatedCodeHash || res4a.mutationType !== res4b.mutationType);
    testResults.push({
      id: 4,
      name: 'Same input + different seed -> explores candidate space',
      passed: test4Passed,
      details: {
        seedA_mutation: res4a.success ? res4a.mutationType : null,
        seedB_mutation: res4b.success ? res4b.mutationType : null,
        differentMutations:
          res4a.success && res4b.success && res4a.mutatedCodeHash !== res4b.mutatedCodeHash,
      },
    });

    // Test 5: Comparison mutation test
    const compCode = `def check(x, y):\n    return x > y\n`;
    const res5 = engine.processSubmission({
      code: compCode,
      language: 'python',
      requestedMutationType: 'GREATER_THAN_TO_GREATER_EQUAL',
    });
    testResults.push({
      id: 5,
      name: 'Comparison mutation test (> to >=)',
      passed: res5.success && res5.mutationType === 'GREATER_THAN_TO_GREATER_EQUAL',
      details: res5.success
        ? {
            originalFragment: res5.metadata.originalFragment,
            mutatedFragment: res5.metadata.mutatedFragment,
          }
        : { error: res5.error },
    });

    // Test 6: Arithmetic mutation test
    const arithCode = `def calc(x, y):\n    return x + y\n`;
    const res6 = engine.processSubmission({
      code: arithCode,
      language: 'python',
      requestedMutationType: 'PLUS_TO_MINUS',
    });
    testResults.push({
      id: 6,
      name: 'Arithmetic mutation test (+ to -)',
      passed: res6.success && res6.mutationType === 'PLUS_TO_MINUS',
      details: res6.success
        ? {
            originalFragment: res6.metadata.originalFragment,
            mutatedFragment: res6.metadata.mutatedFragment,
          }
        : { error: res6.error },
    });

    // Test 7: Boundary off-by-one test
    const loopCode = `def loop(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total\n`;
    const res7 = engine.processSubmission({
      code: loopCode,
      language: 'python',
      requestedMutationType: 'LOOP_BOUNDARY_OFF_BY_ONE',
    });
    testResults.push({
      id: 7,
      name: 'Loop boundary off-by-one test',
      passed: res7.success && res7.mutationType === 'LOOP_BOUNDARY_OFF_BY_ONE',
      details: res7.success
        ? {
            originalFragment: res7.metadata.originalFragment,
            mutatedFragment: res7.metadata.mutatedFragment,
          }
        : { error: res7.error },
    });

    // Test 8: Return value mutation test
    const retCode = `def get_value():\n    return 42\n`;
    const res8 = engine.processSubmission({
      code: retCode,
      language: 'python',
      requestedMutationType: 'RETURN_VALUE_MUTATION',
    });
    testResults.push({
      id: 8,
      name: 'Return value mutation test',
      passed: res8.success && res8.mutationType === 'RETURN_VALUE_MUTATION',
      details: res8.success
        ? {
            originalFragment: res8.metadata.originalFragment,
            mutatedFragment: res8.metadata.mutatedFragment,
          }
        : { error: res8.error },
    });

    // Test 9: Failed parse handling (preserves original, sets error, no fake code)
    const brokenCode = `def broken_func(:\n    return\n`;
    const res9 = engine.processSubmission({ code: brokenCode, language: 'python' });
    testResults.push({
      id: 9,
      name: 'Failed parse handling (MUTATION_PROCESSING_FAILED, no fake code)',
      passed:
        res9.success === false &&
        res9.status === 'MUTATION_PROCESSING_FAILED' &&
        !(res9 as any).mutatedCode &&
        Boolean(res9.error),
      details: {
        status: res9.status,
        error: !res9.success ? res9.error : null,
        mutatedCode: (res9 as any).mutatedCode ?? null,
      },
    });

    // Test 10: Proof that original code is never overwritten with mutated code
    const origHash = computeCodeHash(pyCode1);
    const res10 = engine.processSubmission({ code: pyCode1, language: 'python' });
    const test10Passed =
      res10.success &&
      res10.mutatedCode !== pyCode1 &&
      res10.originalCodeHash === origHash &&
      res10.mutatedCodeHash !== origHash;
    testResults.push({
      id: 10,
      name: 'Proof that original code is never overwritten with mutated code',
      passed: test10Passed,
      details: {
        originalPreserved: res10.originalCodeHash === origHash,
        mutatedDistinct: res10.success && res10.mutatedCode !== pyCode1,
      },
    });

    const allPassed = testResults.every((t) => t.passed);

    res.json({
      allPassed,
      total: testResults.length,
      passedCount: testResults.filter((t) => t.passed).length,
      testResults,
    });
  } catch (err: any) {
    console.error('Error running mutation verification:', err);
    res.status(500).json({ error: 'Failed to run verification suite.' });
  }
});
