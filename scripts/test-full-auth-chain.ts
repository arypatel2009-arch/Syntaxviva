import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../server/db/database.ts';
import { initRepository, getRepository } from '../server/repository/index.ts';
import { authRouter } from '../server/routes/auth.ts';
import { verifyToken } from '../server/auth/jwt.ts';

// Configure test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_autonomous_qa_lead_2026_super_secure';

async function runAutonomousAuthChain() {
  console.log('\n========================================================================');
  console.log('🚀 AUTONOMOUS END-TO-END AUTH CHAIN & 403 VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  // 1. Initialize local repository & database
  console.log('[Setup] Initializing SQLite database and repository...');
  await getDatabase();
  await initRepository();
  const repo = getRepository();

  // 2. Start local ephemeral Express HTTP server
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[Setup] Ephemeral test server active on ${baseUrl}\n`);

  try {
    const timestamp = Date.now();
    const testEmail = `test_autonomous_${timestamp}@syntaxviva.online`;
    const initialPassword = 'InitialSecure123#';
    const newPassword = 'NewSecretUpdated2026!#';

    // ------------------------------------------------------------------------
    // STEP 1: Registration Flow
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('STEP 1: Registration Flow');
    console.log('------------------------------------------------------------------------');
    console.log(`Registering academic user: ${testEmail}`);

    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Autonomous QA Student',
        email: testEmail,
        password: initialPassword,
        confirmPassword: initialPassword,
        role: 'student',
        institution: 'SyntaxViva Autonomous Academy',
        rollNumber: `AUTO_${timestamp}`,
        classId: 'Batch 2026',
        divisionId: 'Div A',
      }),
    });

    const registerData = await registerRes.json();
    console.log(`Registration Response [HTTP ${registerRes.status}]:`, registerData);

    if (registerRes.status !== 201 && registerRes.status !== 200) {
      throw new Error(`Registration failed with status ${registerRes.status}: ${JSON.stringify(registerData)}`);
    }
    if (!registerData.requiresOtp) {
      throw new Error(`Expected registration to require OTP, received: ${JSON.stringify(registerData)}`);
    }

    const createdUser = await repo.getUserByEmail(testEmail);
    if (!createdUser) {
      throw new Error(`User was not persisted to the database: ${testEmail}`);
    }
    if (createdUser.is_verified) {
      throw new Error(`New user must be created with is_verified: false!`);
    }
    if (!createdUser.verification_otp || createdUser.verification_otp.length !== 6) {
      throw new Error(`Expected 6-digit OTP in database, received: "${createdUser.verification_otp}"`);
    }
    console.log(`✅ Step 1 Passed: User created unverified with 6-digit OTP (${createdUser.verification_otp}).\n`);

    // ------------------------------------------------------------------------
    // STEP 2: Unverified Login Attempt (The Crucial 403 Test)
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('STEP 2: Unverified Login Attempt (HTTP 403 Requires OTP Test)');
    console.log('------------------------------------------------------------------------');
    console.log(`Attempting login with unverified account credentials...`);

    const unverifiedLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });

    const unverifiedLoginData = await unverifiedLoginRes.json();
    console.log(`Server HTTP Status: ${unverifiedLoginRes.status}`);
    console.log('Server Response Payload:', unverifiedLoginData);

    // Assert backend returns 403 Forbidden with unverified details
    if (unverifiedLoginRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for unverified login, received ${unverifiedLoginRes.status}`);
    }
    if (!unverifiedLoginData.requiresOtp || unverifiedLoginData.code !== 'email_not_verified') {
      throw new Error(`Expected requiresOtp: true and code: 'email_not_verified', received: ${JSON.stringify(unverifiedLoginData)}`);
    }
    if (unverifiedLoginData.email !== testEmail) {
      throw new Error(`Expected email "${testEmail}" in response, received: "${unverifiedLoginData.email}"`);
    }

    // Now test frontend api.login logic behavior against this 403 response
    // Simulating how api.login handles this exact response without crashing:
    const simulateApiLogin = async (emailInput: string, passwordInput: string) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (
        response.status === 403 ||
        data?.requiresOtp ||
        data?.code === 'email_not_verified' ||
        (data?.error && String(data.error).toLowerCase().includes('verify'))
      ) {
        return {
          success: false,
          requiresOtp: true,
          email: data?.email || emailInput,
          message: data?.message || data?.error || 'Please verify your email.',
        };
      }

      if (!response.ok) {
        throw new Error(data?.error || `Status ${response.status}`);
      }
      return data;
    };

    const clientHandledResult = await simulateApiLogin(testEmail, initialPassword);
    console.log('Client-side api.login handled result:', clientHandledResult);
    if (!clientHandledResult.requiresOtp || clientHandledResult.email !== testEmail) {
      throw new Error('Client-side login handler failed to return requiresOtp: true without throwing!');
    }
    console.log('✅ Step 2 Passed: 403 unverified login correctly flags requiresOtp: true without crashing.\n');

    // ------------------------------------------------------------------------
    // STEP 3: OTP Verification & Account Activation
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('STEP 3: OTP Verification & Account Activation');
    console.log('------------------------------------------------------------------------');
    const userOtp = (await repo.getUserByEmail(testEmail))?.verification_otp;
    console.log(`Submitting correct 6-digit OTP: "${userOtp}" for ${testEmail}`);

    const verifyOtpRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: userOtp,
      }),
    });

    const verifyOtpData = await verifyOtpRes.json();
    console.log(`OTP Verification Response [HTTP ${verifyOtpRes.status}]:`, verifyOtpData);

    if (verifyOtpRes.status !== 200 || !verifyOtpData.success) {
      throw new Error(`OTP verification failed with status ${verifyOtpRes.status}: ${JSON.stringify(verifyOtpData)}`);
    }
    if (!verifyOtpData.token) {
      throw new Error('Expected signed JWT token in verification response!');
    }

    const verifiedUserInDb = await repo.getUserByEmail(testEmail);
    if (!verifiedUserInDb?.is_verified) {
      throw new Error('Database record did not update is_verified: true after verification!');
    }
    if (verifiedUserInDb.verification_otp !== null) {
      throw new Error(`Expected verification_otp to be cleared (null), still found: "${verifiedUserInDb.verification_otp}"`);
    }
    console.log('✅ Step 3 Passed: OTP verified successfully. User is now is_verified: true and OTP is cleared.\n');

    // ------------------------------------------------------------------------
    // STEP 4: Verified Login Attempt
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('STEP 4: Verified Login Attempt');
    console.log('------------------------------------------------------------------------');
    console.log(`Signing in with now-verified account...`);

    const verifiedLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });

    const verifiedLoginData = await verifiedLoginRes.json();
    console.log(`Verified Login Response [HTTP ${verifiedLoginRes.status}]:`, {
      success: verifiedLoginData.success,
      hasToken: Boolean(verifiedLoginData.token),
      userName: verifiedLoginData.user?.name,
      role: verifiedLoginData.user?.role,
    });

    if (verifiedLoginRes.status !== 200 || !verifiedLoginData.token) {
      throw new Error(`Expected HTTP 200 and session token for verified login, received status ${verifiedLoginRes.status}`);
    }
    if (verifiedLoginData.requiresOtp) {
      throw new Error('Verified user should not be prompted for OTP!');
    }

    const verifiedDecoded = verifyToken(verifiedLoginData.token);
    if (!verifiedDecoded || verifiedDecoded.email !== testEmail) {
      throw new Error('JWT token validation failed for verified login session!');
    }
    console.log('✅ Step 4 Passed: Verified login succeeded with HTTP 200 and valid JWT.\n');

    // ------------------------------------------------------------------------
    // STEP 5: Forgot Password & Reset Chain
    // ------------------------------------------------------------------------
    console.log('------------------------------------------------------------------------');
    console.log('STEP 5: Forgot Password & Reset Chain');
    console.log('------------------------------------------------------------------------');
    console.log(`Requesting password reset for: ${testEmail}`);

    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    const forgotData = await forgotRes.json();
    console.log(`Forgot Password Response [HTTP ${forgotRes.status}]:`, forgotData);
    if (forgotRes.status !== 200 || !forgotData.success) {
      throw new Error(`Forgot password request failed: ${JSON.stringify(forgotData)}`);
    }

    const userWithResetOtp = await repo.getUserByEmail(testEmail);
    const resetOtp = userWithResetOtp?.verification_otp;
    if (!resetOtp || resetOtp.length !== 6) {
      throw new Error(`Expected 6-digit reset OTP in database, found: "${resetOtp}"`);
    }
    console.log(`Found generated reset OTP in database: "${resetOtp}"`);

    console.log(`Submitting reset OTP with new secure password: "${newPassword}"...`);
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: resetOtp,
        password: newPassword,
        confirmPassword: newPassword,
      }),
    });

    const resetData = await resetRes.json();
    console.log(`Reset Password Response [HTTP ${resetRes.status}]:`, resetData);
    if (resetRes.status !== 200 || !resetData.success) {
      throw new Error(`Password reset failed: ${JSON.stringify(resetData)}`);
    }

    // Verify old password fails
    console.log('Verifying that OLD password is now rejected...');
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });
    if (oldLoginRes.status !== 401) {
      throw new Error(`Expected HTTP 401 for old password, received ${oldLoginRes.status}`);
    }
    console.log('Confirmed: Old password properly rejected with HTTP 401.');

    // Verify new password succeeds
    console.log('Verifying that NEW password authenticates successfully...');
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: newPassword,
      }),
    });
    const newLoginData = await newLoginRes.json();
    if (newLoginRes.status !== 200 || !newLoginData.token) {
      throw new Error(`Expected HTTP 200 with new password, received status ${newLoginRes.status}`);
    }
    console.log('Confirmed: New password authenticated successfully with HTTP 200.');
    console.log('✅ Step 5 Passed: Full forgot/reset password chain verified.\n');

    console.log('========================================================================');
    console.log('🎉 ALL 5 AUTHENTICATION CHAIN & 403 RECOVERY TESTS PASSED 100%! 🎉');
    console.log('========================================================================\n');
  } finally {
    server.close();
  }
}

runAutonomousAuthChain().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', err);
  process.exit(1);
});
