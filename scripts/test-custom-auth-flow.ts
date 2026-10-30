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

  console.log('6. Testing Forgot Password OTP generation...');
  const resetOtp = '592814';
  const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await repo.updateUser(updated.id, {
    verification_otp: resetOtp,
    otp_expires_at: resetExpiresAt,
  });

  const userWithReset = await repo.getUserByEmail(testEmail);
  if (!userWithReset || userWithReset.verification_otp !== resetOtp) {
    throw new Error('Reset OTP not saved correctly in repository!');
  }
  console.log('Reset OTP stored:', { otp: userWithReset.verification_otp, expiresAt: userWithReset.otp_expires_at });

  console.log('7. Testing Reset Password validation & hash update...');
  const newPlainPassword = 'NewSecret2026!#';
  const newPasswordHash = await bcrypt.hash(newPlainPassword, 10);

  // Update password and clear OTP
  const afterReset = await repo.updateUser(updated.id, {
    password_hash: newPasswordHash,
    verification_otp: null,
    otp_expires_at: null,
  });

  if (!afterReset || afterReset.verification_otp !== null) {
    throw new Error('Password reset failed to clear verification OTP!');
  }

  const oldMatches = await bcrypt.compare(plainPassword, afterReset.password_hash);
  if (oldMatches) {
    throw new Error('Old password should NO LONGER match after reset!');
  }

  const newMatches = await bcrypt.compare(newPlainPassword, afterReset.password_hash);
  if (!newMatches) {
    throw new Error('New password failed to match updated password_hash!');
  }
  console.log('Password successfully reset and verified with bcrypt.');

  console.log('--- ALL AUTH & PASSWORD RESET VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

runAuthTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
