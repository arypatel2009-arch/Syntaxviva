import { generateToken } from '../server/auth/jwt.ts';

async function main() {
  const token = generateToken({
    userId: 'usr_ary_patel_student',
    email: 'ary.student@syntaxviva.edu',
    name: 'Ary Patel',
    role: 'student',
  });

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const asgId = 'asg_1792319158183_u3fp6';

  console.log('1. Testing GET Phase 2 Status...');
  const res1 = await fetch(`http://localhost:5000/api/student/assignments/${asgId}/phase2`, { headers });
  const data1 = await res1.json();
  console.log('Status code:', res1.status);
  console.log('Response state:', data1.state);
  console.log('isAvailable:', data1.isAvailable);
  console.log('bugsCount:', data1.bugsCount);
  console.log('bugs length:', data1.bugs?.length);
  if (data1.bugs) {
    for (const b of data1.bugs) {
      console.log(` - [${b.category}] ${b.name} (Line ${b.location?.line || b.line}): ${b.description}`);
    }
  }

  console.log('\n2. Testing POST Phase 2 Start...');
  const res2 = await fetch(`http://localhost:5000/api/student/assignments/${asgId}/phase2/start`, {
    method: 'POST',
    headers,
  });
  const data2 = await res2.json();
  console.log('Start code:', res2.status);
  console.log('Challenge ID:', data2.challengeId);
  console.log('Remaining seconds:', data2.remainingSeconds);
  console.log('Start bugsCount:', data2.bugsCount);
  console.log('Start bugs length:', data2.bugs?.length);

  console.log('\n3. Testing POST Phase 2 Retry...');
  const res3 = await fetch(`http://localhost:5000/api/student/assignments/${asgId}/phase2/retry`, {
    method: 'POST',
    headers,
  });
  const data3 = await res3.json();
  console.log('Retry code:', res3.status);
  console.log('Retry challenge ID:', data3.challengeId);
  console.log('Retry bugsCount:', data3.bugsCount);
  console.log('Retry bugs length:', data3.bugs?.length);
  if (data3.bugs) {
    for (const b of data3.bugs) {
      console.log(` - [${b.category}] ${b.name} (Line ${b.location?.line || b.line}): ${b.description}`);
    }
  }
}

main().catch(console.error);
