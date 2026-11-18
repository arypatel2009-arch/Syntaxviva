import assert from 'assert';
import { MutationEngine } from '../server/mutation/engine.js';

async function testSnippet() {
  console.log('Testing 35+ written non-blank lines snippet extraction...');

  // Create 40 non-blank written lines of code
  const codeLines: string[] = [];
  for (let i = 1; i <= 40; i++) {
    codeLines.push(`let var_${i} = ${i} + 1;`);
  }
  const fullCode = codeLines.join('\n');

  const engine = MutationEngine.getInstance();
  const result = engine.processSubmission({ code: fullCode, language: 'javascript' });

  assert(result.success, 'Mutation must succeed');
  assert.strictEqual(result.metadata?.isSnippet, true, 'isSnippet must be true for 40 lines');
  const writtenCount = result.metadata?.originalSnippet?.split('\n').filter(l => l.trim().length > 0).length;
  assert.strictEqual(writtenCount, 35, 'Original snippet must have exactly 35 non-blank written lines');
  console.log('✔ Snippet verification passed: Exactly 35 non-blank written lines extracted.');
}

testSnippet().catch((err) => {
  console.error('Snippet test failed:', err);
  process.exit(1);
});
