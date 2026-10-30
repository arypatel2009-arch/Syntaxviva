import { ComplexBugEngine } from '../server/mutation/complexBugEngine.ts';

const engine = ComplexBugEngine.getInstance();

const evenOddCode = `n = int(input())

if n % 2 == 0:
    print("Even")
else:
    print("Odd")`;

console.log('=== Testing 10 Different Systems/Students on Even/Odd ===');
const generatedVariants = new Map<string, number>();

for (let i = 1; i <= 10; i++) {
  const seed = `student_system_${i}_even_odd`;
  const result = engine.selectThreeComplexBugs(evenOddCode, 'python', seed);
  const bugSummary = result.bugs.map(b => `${b.location.line}:${b.mutationType}`).join('|');
  const count = (generatedVariants.get(bugSummary) || 0) + 1;
  generatedVariants.set(bugSummary, count);

  console.log(`\n[System/Student ${i}] Unique Key: ${bugSummary}`);
  console.log('Code:\n' + result.mutatedCode);
  for (const b of result.bugs) {
    console.log(`  - Line ${b.location.line}: ${b.name} (${b.mutationType})`);
    console.log(`    Orig: "${b.originalFragment}"`);
    console.log(`    Mut:  "${b.mutatedFragment}"`);
  }
}

console.log(`\nTotal distinct variant combinations generated across 10 systems: ${generatedVariants.size} / 10`);
