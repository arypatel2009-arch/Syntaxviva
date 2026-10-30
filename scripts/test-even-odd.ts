import { ComplexBugEngine } from '../server/mutation/complexBugEngine.ts';

const code = `n = int(input())

if n % 2 == 0:
    print("Even")
else:
    print("Odd")`;

const engine = ComplexBugEngine.getInstance();
const result = engine.selectThreeComplexBugs(code, 'python', 'seed_test_even_odd_1');

console.log('Original Code:\n' + code);
console.log('\nMutated Code:\n' + result.mutatedCode);
console.log('\nAre they identical?:', code === result.mutatedCode);
console.log('\nChosen bugs:');
for (const b of result.bugs) {
  console.log(`- Bug ${b.bugIndex}: ${b.name} (${b.mutationType}) on Line ${b.location.line}`);
  console.log(`  Orig: "${b.originalFragment}"`);
  console.log(`  Mut:  "${b.mutatedFragment}"`);
}
