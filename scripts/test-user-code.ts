import { ComplexBugEngine } from '../server/mutation/complexBugEngine.js';

const userCode = `def calculate_grade(percentage):
    if percentage >= 90:
        return "A+"
    elif percentage >= 80:
        return "A"
    elif percentage >= 70:
        return "B"
    elif percentage >= 60:
        return "C"
    elif percentage >= 50:
        return "D"
    else:
        return "F"

student_name = input("Enter student name: ")
roll_no = input("Enter roll number: ")
num_subjects = int(input("Enter number of subjects: "))

subjects = []
for i in range(num_subjects):
    subj = input(f"Enter name of subject {i+1}: ")
    subjects.append(subj)

marks = {}
for subject in subjects:
    while True:
        try:
            score = float(input(f"Enter marks for {subject} (out of 100): "))
            if 0 <= score <= 100:
                marks[subject] = score
                break
            else:
                print("Marks must be between 0 and 100.")
        except ValueError:
            print("Invalid input. Please enter a valid number.")

total_marks = sum(marks.values())
percentage = total_marks / len(subjects)
grade = calculate_grade(percentage)

# Displaying the report card
print("\\n" + "=" * 40)
print("      FINAL RESULT")
print("=" * 40)
print(f"Student Name : {student_name}")
print(f"Roll Number  : {roll_no}")
print("-" * 40)
for subject, score in marks.items():
    print(f"{subject:<15} : {score:>6.2f}")
print("-" * 40)
print(f"Total Marks   : {total_marks:>6.2f} / {len(subjects) * 100}")
print(f"Percentage    : {percentage:>6.2f}%")
print(f"Grade         : {grade:>6}")
print("=" * 40)
`;

const engine = ComplexBugEngine.getInstance();
const candidates = engine.findComplexCandidates(userCode, 'python');
console.log('Found candidates count:', candidates.length);
candidates.forEach((c, i) => console.log(`Cand ${i+1}: [${c.mutationType}] Line ${c.location.line}: ${c.description}`));

const res = engine.selectThreeComplexBugs(userCode, 'python', 'seed_user_ary');
console.log('\nselectThreeComplexBugs result:');
console.log('bugsCount:', res.bugsCount);
console.log('Bugs:', res.bugs);
console.log('\nMutated code diff:\n', res.mutatedCode);
