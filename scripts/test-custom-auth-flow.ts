import { getDatabase } from '../server/db/database.ts';
import { getRepository } from '../server/repository/index.ts';
import { generateToken, verifyToken } from '../server/auth/jwt.ts';
import bcrypt from 'bcryptjs';

async function runAuthTest() {
  console.log('--- Starting Custom Auth Flow Verification ---');
  await getDatabase();
  const repo = getRepository();

  const testEmail = `test_${Date.now()}@syntaxviva.online`;
  const plainPassword = 'Password123#';
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const testOtp = '849201';
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  console.log('1. Creating unverified user in repository...');
  const user = await repo.createUser({
    email: testEmail,
    password_hash: passwordHash,
    full_name: 'Test Student',
    role: 'student',
    institution_id: 'SyntaXViva Academic Institute',
    roll_number: `ROLL_${Date.now()}`,
    class_id: 'Batch 2026',
    division_id: 'Div A',
    verification_otp: testOtp,
    otp_expires_at: expiresAt,
  });

  console.log('User created:', { id: user.id, email: user.email, is_verified: user.is_verified });
  if (user.is_verified) {
    throw new Error('New user should initially be unverified!');
  }

  console.log('2. Testing password verification...');
  const matches = await bcrypt.compare(plainPassword, user.password_hash);
  if (!matches) throw new Error('Password hash does not match plain password!');
  console.log('Password hash verified successfully.');

  console.log('3. Testing OTP verification simulation...');
  const fetched = await repo.getUserByEmail(testEmail);
  if (!fetched || fetched.verification_otp !== testOtp) {
    throw new Error('Verification OTP did not match stored OTP!');
  }

  console.log('4. Updating user to verified...');
  const updated = await repo.updateUser(user.id, {
    is_verified: true,
    verification_otp: null,
    otp_expires_at: null,
  });

  if (!updated?.is_verified || updated.verification_otp !== null) {
    throw new Error('User update failed to set is_verified or clear OTP!');
  }
  console.log('User verified state:', { is_verified: updated.is_verified, otp: updated.verification_otp });

  console.log('5. Testing standalone JWT token generation & verification...');
  const token = generateToken({
    userId: updated.id,
    email: updated.email,
    role: updated.role,
    name: updated.full_name,
  });

  console.log('Generated JWT:', token.substring(0, 30) + '...');
  const decoded = verifyToken(token);
  if (!decoded || decoded.userId !== updated.id || decoded.email !== updated.email) {
    throw new Error('JWT token verification failed or payload corrupted!');
  }
  console.log('Decoded JWT payload:', decoded);

  console.log('--- ALL AUTH VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

runAuthTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
