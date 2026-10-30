import { ComplexBugEngine } from '../server/mutation/complexBugEngine.ts';

const userCode = `# Student Grade Calculator

def calculate_grade(marks):
    if marks >= 80:
        return "A"
    elif marks >= 60:
        return "B"
    elif marks >= 40:
        return "C"
    else:
        return "Fail"

    # User input
marks = float(input("Enter student marks (0 to 100): "))

# Validation and result output
if 0 <= marks <= 100:
    grade = calculate_grade(marks)
    print(f"Total Marks: {marks}/100")
    print(f"Grade: {grade}")
else:
    print("Invalid input! Please enter marks between 0 and 100.")
`;

const engine = ComplexBugEngine.getInstance();
const result = engine.selectThreeComplexBugs(userCode, 'python', 'seed_ary_patel_test_1');

console.log('--- 3 Bugs Selection on User Code ---');
console.log('Bugs Count:', result.bugsCount);
for (const b of result.bugs) {
  console.log(`[Bug ${b.bugIndex}] Type: ${b.mutationType} | Category: ${b.category} | Name: ${b.name}`);
  console.log(`    Line ${b.location.line}: "${b.originalFragment}" -> "${b.mutatedFragment}"`);
}

console.log('\n--- Mutated Code Preview ---');
console.log(result.mutatedCode);
