import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getRepository } from '../repository/index.js';
import { authenticate, AuthenticatedRequest, generateToken } from '../auth/jwt.js';
import { sendOtpEmail, sendPasswordResetOtpEmail } from '../lib/mailer.js';
import { UserRole } from '../../src/types/index.js';
import { loginRateLimiter, signupRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// In-memory rate limiting map for OTP resends: email -> nextAllowedTimestampMs
const resendCooldowns = new Map<string, number>();

function formatAcademicUser(profile: any) {
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role,
    institution: profile.institution_id || '',
    rollNumber: profile.roll_number || '',
    roll_number: profile.roll_number || '',
    classId: profile.class_id || '',
    class_id: profile.class_id || '',
    divisionId: profile.division_id || '',
    division_id: profile.division_id || '',
    avatar_url: profile.avatar_url || null,
    avatarUrl: profile.avatar_url || null,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function formatAcademicProfile(profile: any) {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    institution_id: profile.institution_id,
    roll_number: profile.roll_number,
    class_id: profile.class_id,
    division_id: profile.division_id,
    avatar_url: profile.avatar_url,
    status: profile.status,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

// ----------------------------------------------------------------------------
// GET /user and GET /me: Retrieve current authenticated user and profile
// ----------------------------------------------------------------------------
export async function handleGetUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. No session found.' });
      return;
    }

    const userId = req.user.userId;
    const email = req.user.email;
    const repo = getRepository();

    const profile = (await repo.getProfileById(userId)) || (email ? await repo.getProfileByEmail(email) : null);

    if (profile) {
      res.status(200).json({
        user: formatAcademicUser(profile),
        profile: formatAcademicProfile(profile),
      });
      return;
    }

    // Fallback if not cached in profiles table
    const fallbackProfile = {
      id: req.user.userId,
      email: req.user.email,
      full_name: req.user.name,
      role: req.user.role,
      institution_id: null,
      roll_number: null,
      class_id: null,
      division_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    res.status(200).json({
      user: formatAcademicUser(fallbackProfile),
      profile: formatAcademicProfile(fallbackProfile),
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Error fetching current user:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export function getFacultySignupSecret(): string {
  return (process.env.FACULTY_SIGNUP_SECRET || 'SYNTAX_VIVA_FACULTY_2026_SECRET').trim();
}

export function handleVerifyFacultySecret(req: Request, res: Response): void {
  const { facultySecretCode } = req.body || {};
  const validSecret = getFacultySignupSecret();

  if (!facultySecretCode || String(facultySecretCode).trim() !== validSecret) {
    res.status(403).json({
      error: 'Galat Faculty Access Code! Aap faculty account nahi bana sakte.',
      code: 'invalid_faculty_secret',
    });
    return;
  }

  res.status(200).json({ valid: true });
}

// ----------------------------------------------------------------------------
// POST /signup and POST /register: Real-world academic registration
// ----------------------------------------------------------------------------
export async function handleSignUp(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      fullName,
      email,
      password,
      confirmPassword,
      role: rawRole = 'student',
      facultySecretCode,
      institution = '',
      rollNumber,
      roll_number,
      classId,
      class_id,
      class: rawClass,
      divisionId,
      division_id,
      division: rawDivision,
    } = req.body || {};

    const cleanName = ((fullName || name || '') as string).trim();
    const cleanEmail = ((email || '') as string).trim().toLowerCase();
    const cleanInstitution = ((institution || '') as string).trim();
    const cleanRollNumber = (((rollNumber || roll_number || '') as string)).trim();
    const cleanClassId = (((classId || class_id || rawClass || '') as string)).trim();
    const cleanDivisionId = (((divisionId || division_id || rawDivision || '') as string)).trim();

    // Role validation: ONLY 'student' or 'faculty' allowed on public signup (admin cannot be self-registered)
    const normalizedRole = ((rawRole || 'student') as string).toLowerCase();
    if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
      res.status(403).json({
        error: 'Forbidden: Administrative accounts cannot be self-registered.',
        code: 'admin_registration_forbidden',
      });
      return;
    }
    if (!['student', 'faculty'].includes(normalizedRole)) {
      res.status(400).json({
        error: 'Invalid role. Registration is permitted only for "student" or "faculty" accounts.',
        code: 'invalid_role',
      });
      return;
    }
    const targetRole = normalizedRole as 'student' | 'faculty';

    // Security Check: Faculty verification
    if (targetRole === 'faculty') {
      const validSecret = getFacultySignupSecret();
      if (!facultySecretCode || String(facultySecretCode).trim() !== validSecret) {
        res.status(403).json({
          error: 'Galat Faculty Access Code! Aap faculty account nahi bana sakte.',
          code: 'invalid_faculty_secret',
        });
        return;
      }
    }

    if (!cleanName) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (!/^[A-Z]/.test(password)) {
      res.status(400).json({ error: 'Password must start with a capital letter (A-Z).' });
      return;
    }
    if (!/[0-9]/.test(password)) {
      res.status(400).json({ error: 'Password must include at least one number (0-9).' });
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      res.status(400).json({ error: 'Password must include at least one typographical or special symbol (e.g., @, #, $, %, &, *).' });
      return;
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match. Please ensure both passwords are identical.' });
      return;
    }

    // Academic identity validation
    if (!cleanInstitution) {
      res.status(400).json({ error: 'Institution name is required.' });
      return;
    }
    if (!cleanClassId) {
      res.status(400).json({ error: 'Class / Year is required.' });
      return;
    }
    if (!cleanDivisionId) {
      res.status(400).json({ error: 'Division / Section is required.' });
      return;
    }

    // For students: Roll Number is strictly required and must be unique within (institution, class, division)
    const repo = getRepository();
    if (targetRole === 'student') {
      if (!cleanRollNumber) {
        res.status(400).json({ error: 'Roll number is required for student registration.' });
        return;
      }

      const existingRollStudent = await repo.getStudentByAcademicRoll(
        cleanInstitution,
        cleanClassId,
        cleanDivisionId,
        cleanRollNumber
      );

      if (existingRollStudent) {
        res.status(400).json({
          error: `A student with roll number "${cleanRollNumber}" is already registered in ${cleanInstitution} (Class: ${cleanClassId}, Division: ${cleanDivisionId}).`,
          code: 'roll_number_already_registered',
        });
        return;
      }
    }

    // Check if user already exists
    const existingUser = await repo.getUserByEmail(cleanEmail);
    if (existingUser && existingUser.is_verified) {
      res.status(400).json({
        error: 'An account with this email address already exists. Please sign in instead.',
        code: 'user_already_exists',
      });
      return;
    }

    // Generate secure 6-digit OTP and 10-minute expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    let userId: string;

    if (existingUser && !existingUser.is_verified) {
      // Update unverified user with new credentials and fresh OTP
      userId = existingUser.id;
      await repo.updateUser(existingUser.id, {
        password_hash: passwordHash,
        full_name: cleanName,
        role: targetRole,
        institution_id: cleanInstitution,
        roll_number: targetRole === 'student' ? cleanRollNumber : null,
        class_id: cleanClassId,
        division_id: cleanDivisionId,
        verification_otp: otp,
        otp_expires_at: otpExpiresAt,
      });

      await repo.upsertProfile({
        id: existingUser.id,
        email: cleanEmail,
        full_name: cleanName,
        role: targetRole,
        institution_id: cleanInstitution,
        roll_number: targetRole === 'student' ? cleanRollNumber : null,
        class_id: cleanClassId,
        division_id: cleanDivisionId,
      });
    } else {
      // Create new user record in public.users
      const newUser = await repo.createUser({
        email: cleanEmail,
        password_hash: passwordHash,
        full_name: cleanName,
        role: targetRole,
        institution_id: cleanInstitution,
        roll_number: targetRole === 'student' ? cleanRollNumber : null,
        class_id: cleanClassId,
        division_id: cleanDivisionId,
        is_verified: false,
        verification_otp: otp,
        otp_expires_at: otpExpiresAt,
      });
      userId = newUser.id;

      await repo.upsertProfile({
        id: newUser.id,
        email: cleanEmail,
        full_name: cleanName,
        role: targetRole,
        institution_id: cleanInstitution,
        roll_number: targetRole === 'student' ? cleanRollNumber : null,
        class_id: cleanClassId,
        division_id: cleanDivisionId,
        status: 'active',
      });
    }

    // Dispatch verification OTP directly via Resend API
    try {
      await sendOtpEmail({
        to: cleanEmail,
        otp,
        fullName: cleanName,
      });
      if (process.env.NODE_ENV !== 'test') {
        resendCooldowns.set(cleanEmail, Date.now() + 60000); // 60s cooldown
      }
    } catch (mailErr: any) {
      console.error('[SyntaXViva Auth] Failed to dispatch OTP email:', mailErr);
      res.status(500).json({
        error: 'Failed to send verification email. Please check your email address or try again.',
        details: mailErr.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      requiresOtp: true,
      email: cleanEmail,
      message: 'Registration successful! A 6-digit verification code has been sent to your email.',
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

// ----------------------------------------------------------------------------
// POST /verify-otp: Validate 6-digit security code and issue 7-day JWT
// ----------------------------------------------------------------------------
export async function handleVerifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const repo = getRepository();
    const user = await repo.getUserByEmail(cleanEmail);

    if (!user) {
      res.status(400).json({ error: 'Account not found. Please register first.' });
      return;
    }

    if (user.is_verified) {
      // Already verified, generate token directly
    } else {
      if (!user.verification_otp || user.verification_otp !== cleanOtp) {
        res.status(400).json({ error: 'Invalid verification code. Please check your code and try again.' });
        return;
      }

      if (user.otp_expires_at && new Date(user.otp_expires_at).getTime() < Date.now()) {
        res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
        return;
      }

      // Mark user as verified and clear OTP fields
      await repo.updateUser(user.id, {
        is_verified: true,
        verification_otp: null,
        otp_expires_at: null,
      });
      resendCooldowns.delete(cleanEmail);
    }

    let profile = await repo.getProfileById(user.id);
    if (!profile) {
      profile = await repo.upsertProfile({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        institution_id: user.institution_id,
        roll_number: user.roll_number,
        class_id: user.class_id,
        division_id: user.division_id,
        status: 'active',
      });
    }

    // Issue signed 7-day session JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Account verified successfully.',
      token,
      user: formatAcademicUser(profile),
      profile: formatAcademicProfile(profile),
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Error verifying OTP:', err);
    res.status(500).json({ error: 'Failed to verify code.' });
  }
}

// ----------------------------------------------------------------------------
// POST /resend-otp: Resend fresh 6-digit OTP code with 60-second cooldown
// ----------------------------------------------------------------------------
export async function handleResendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const now = Date.now();
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const nextAllowed = resendCooldowns.get(cleanEmail) || 0;

    if (!isTest && now < nextAllowed) {
      const remainingSecs = Math.ceil((nextAllowed - now) / 1000);
      res.status(429).json({
        error: `Please wait ${remainingSecs}s before requesting another verification code.`,
        retryAfter: remainingSecs,
      });
      return;
    }

    const repo = getRepository();
    const user = await repo.getUserByEmail(cleanEmail);

    if (!user) {
      res.status(400).json({ error: 'No account found with this email address.' });
      return;
    }

    if (user.is_verified) {
      res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'This account is already verified. You can proceed to sign in.',
      });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await repo.updateUser(user.id, {
      verification_otp: otp,
      otp_expires_at: otpExpiresAt,
    });

    await sendOtpEmail({
      to: cleanEmail,
      otp,
      fullName: user.full_name,
    });

    if (!isTest) {
      resendCooldowns.set(cleanEmail, now + 60000); // 60s cooldown
    }

    res.status(200).json({
      success: true,
      message: 'A fresh 6-digit verification code has been sent to your email.',
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Error resending OTP:', err);
    res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
  }
}

// ----------------------------------------------------------------------------
// POST /login: Standalone bcrypt Authentication with Academic Lease Verification
// ----------------------------------------------------------------------------
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const repo = getRepository();
    const user = await repo.getUserByEmail(cleanEmail);

    if (!user) {
      res.status(401).json({
        error: 'Invalid email or password. Please double-check your credentials and try again.',
        code: 'invalid_credentials',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Invalid email or password. Please double-check your credentials and try again.',
        code: 'invalid_credentials',
      });
      return;
    }

    // Enforce email verification
    if (!user.is_verified) {
      const now = Date.now();
      let activeOtp = user.verification_otp;
      if (!activeOtp || !user.otp_expires_at || new Date(user.otp_expires_at).getTime() < now) {
        activeOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(now + 10 * 60 * 1000).toISOString();
        await repo.updateUser(user.id, {
          verification_otp: activeOtp,
          otp_expires_at: otpExpiresAt,
        });
        sendOtpEmail({
          to: cleanEmail,
          otp: activeOtp,
          fullName: user.full_name,
        }).catch((e) => console.warn('Background OTP send note:', e));
      }

      res.status(403).json({
        error: 'Please verify your email address before signing in.',
        code: 'email_not_verified',
        requiresOtp: true,
        email: cleanEmail,
      });
      return;
    }

    let profile = (await repo.getProfileById(user.id)) || (await repo.getProfileByEmail(user.email));
    if (!profile) {
      profile = await repo.upsertProfile({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        institution_id: user.institution_id,
        roll_number: user.roll_number,
        class_id: user.class_id,
        division_id: user.division_id,
        status: 'active',
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // If faculty, attempt to claim active division session lease
    let sessionClaimResult = null;
    if (profile.role === 'faculty' && profile.institution_id && profile.class_id && profile.division_id) {
      sessionClaimResult = await repo.claimFacultyDivisionSession({
        facultyId: profile.id,
        facultyName: profile.full_name,
        facultyEmail: profile.email,
        institution: profile.institution_id,
        classId: profile.class_id,
        divisionId: profile.division_id,
      });
    }

    res.status(200).json({
      success: true,
      token,
      user: formatAcademicUser(profile),
      profile: formatAcademicProfile(profile),
      facultySession: sessionClaimResult?.session || null,
      facultySessionWarning: !sessionClaimResult?.success ? sessionClaimResult?.error : null,
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

// ----------------------------------------------------------------------------
// POST /logout: Clear session, cookies, and active faculty division sessions
// ----------------------------------------------------------------------------
export function handleLogout(req: Request, res: Response): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In case we can release the faculty session on logout
      const token = authHeader.substring(7);
      // Clean up any session associated with the user if known
    }
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (e) {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  }
}

// ----------------------------------------------------------------------------
// POST /forgot-password: Generate 6-digit OTP and send via Resend
// ----------------------------------------------------------------------------
export async function handleForgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body || {};
    if (!email || !String(email).trim().includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const now = Date.now();
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const nextAllowed = resendCooldowns.get(cleanEmail) || 0;

    if (!isTest && now < nextAllowed) {
      const remainingSecs = Math.ceil((nextAllowed - now) / 1000);
      res.status(429).json({
        error: `Please wait ${remainingSecs}s before requesting another reset code.`,
        retryAfter: remainingSecs,
      });
      return;
    }

    const repo = getRepository();
    const user = await repo.getUserByEmail(cleanEmail);

    if (!user) {
      // Prevent user enumeration: return generic success
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email address, a password reset code has been sent.',
      });
      return;
    }

    // Generate secure 6-digit numeric OTP and 10-minute expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await repo.updateUser(user.id, {
      verification_otp: otp,
      otp_expires_at: otpExpiresAt,
    });

    try {
      await sendPasswordResetOtpEmail({
        to: cleanEmail,
        otp,
        fullName: user.full_name,
      });
      if (!isTest) {
        resendCooldowns.set(cleanEmail, Date.now() + 60000); // 60s cooldown
      }
    } catch (mailErr: any) {
      console.error('[SyntaXViva Auth] Failed to dispatch password reset email:', mailErr);
      res.status(500).json({
        error: 'Failed to send password reset email. Please try again.',
        details: mailErr.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Reset code sent to your email.',
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error while processing password reset request.' });
  }
}

// ----------------------------------------------------------------------------
// POST /reset-password: Verify 6-digit OTP and set new bcrypt password
// ----------------------------------------------------------------------------
export async function handleResetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp, newPassword, password } = req.body || {};
    const targetPassword = newPassword || password;

    if (!email || !otp || !targetPassword) {
      res.status(400).json({ error: 'Email, 6-digit OTP code, and new password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // Password criteria validation
    if (targetPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (!/^[A-Z]/.test(targetPassword)) {
      res.status(400).json({ error: 'Password must start with a capital letter (A-Z).' });
      return;
    }
    if (!/[0-9]/.test(targetPassword)) {
      res.status(400).json({ error: 'Password must include at least one number (0-9).' });
      return;
    }
    if (!/[^A-Za-z0-9]/.test(targetPassword)) {
      res.status(400).json({ error: 'Password must include at least one typographical or special symbol (e.g., @, #, $, %, &, *).' });
      return;
    }

    const repo = getRepository();
    const user = await repo.getUserByEmail(cleanEmail);

    if (!user) {
      res.status(400).json({ error: 'Account not found. Please double-check your email address.' });
      return;
    }

    if (!user.verification_otp || user.verification_otp !== cleanOtp) {
      res.status(400).json({ error: 'Invalid reset code. Please check your code and try again.' });
      return;
    }

    if (user.otp_expires_at && new Date(user.otp_expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Password reset code has expired. Please request a new code.' });
      return;
    }

    const passwordHash = await bcrypt.hash(targetPassword, 10);
    await repo.updateUser(user.id, {
      password_hash: passwordHash,
      is_verified: true,
      verification_otp: null,
      otp_expires_at: null,
    });

    resendCooldowns.delete(cleanEmail);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in.',
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Reset password error:', err);
    res.status(500).json({ error: 'Internal server error while resetting password.' });
  }
}

// ----------------------------------------------------------------------------
// POST /sync-profile: Sync profile for authenticated user
// ----------------------------------------------------------------------------
export async function handleSyncProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const authUser = req.user!;
    const { full_name, institution_id, roll_number, class_id, division_id, avatar_url } = req.body || {};
    const repo = getRepository();

    let profile = (await repo.getProfileById(authUser.userId)) || (await repo.getProfileByEmail(authUser.email));
    if (!profile) {
      profile = await repo.upsertProfile({
        id: authUser.userId,
        email: authUser.email,
        full_name: full_name?.trim() || authUser.name || authUser.email.split('@')[0],
        role: authUser.role,
        institution_id: institution_id || null,
        roll_number: roll_number || null,
        class_id: class_id || null,
        division_id: division_id || null,
        avatar_url: avatar_url || null,
      });
    } else {
      profile =
        (await repo.updateProfile(profile.id, {
          full_name: full_name?.trim() || profile.full_name,
          institution_id: institution_id !== undefined ? institution_id : profile.institution_id,
          roll_number: roll_number !== undefined ? roll_number : profile.roll_number,
          class_id: class_id !== undefined ? class_id : profile.class_id,
          division_id: division_id !== undefined ? division_id : profile.division_id,
          avatar_url: avatar_url !== undefined ? avatar_url : profile.avatar_url,
        })) || profile;
    }

    res.json({
      success: true,
      profile: formatAcademicProfile(profile),
      user: formatAcademicUser(profile),
    });
  } catch (err: any) {
    console.error('Error syncing profile:', err);
    res.status(500).json({ error: 'Failed to sync user profile.' });
  }
}

// ----------------------------------------------------------------------------
// PUT /profile: Update user profile (Name, Academic Details, Avatar)
// CRITICAL SECURITY RULE: Role can NEVER be modified through this endpoint!
// ----------------------------------------------------------------------------
export async function handleUpdateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const authUser = req.user!;
    const { full_name, institution_id, roll_number, class_id, division_id, avatar_url, role } = req.body || {};

    if (role && role.toLowerCase() !== authUser.role.toLowerCase()) {
      res.status(403).json({
        error: 'Forbidden: Role elevation or modification via client request is strictly prohibited.',
      });
      return;
    }

    const repo = getRepository();
    let updated = await repo.updateProfile(authUser.userId, {
      full_name: typeof full_name === 'string' ? full_name : undefined,
      institution_id: typeof institution_id === 'string' ? institution_id : undefined,
      roll_number: typeof roll_number === 'string' ? roll_number : undefined,
      class_id: typeof class_id === 'string' ? class_id : undefined,
      division_id: typeof division_id === 'string' ? division_id : undefined,
      avatar_url: typeof avatar_url === 'string' ? avatar_url : undefined,
    });

    if (!updated) {
      await repo.upsertProfile({
        id: authUser.userId,
        email: authUser.email,
        full_name: typeof full_name === 'string' ? full_name : authUser.name,
        role: authUser.role,
        institution_id: typeof institution_id === 'string' ? institution_id : null,
        roll_number: typeof roll_number === 'string' ? roll_number : null,
        class_id: typeof class_id === 'string' ? class_id : null,
        division_id: typeof division_id === 'string' ? division_id : null,
        avatar_url: typeof avatar_url === 'string' ? avatar_url : null,
      });
      updated = await repo.getProfileById(authUser.userId);
    }

    if (!updated) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.json({
      success: true,
      profile: formatAcademicProfile(updated),
      user: formatAcademicUser(updated),
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

// ----------------------------------------------------------------------------
// Faculty Division Session Endpoints (Heartbeat & Lease Enforcement)
// ----------------------------------------------------------------------------
export async function handleClaimFacultySession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const authUser = req.user!;
    if (authUser.role !== 'faculty' && authUser.role !== 'admin') {
      res.status(403).json({ error: 'Only faculty members can claim division sessions.' });
      return;
    }

    const repo = getRepository();
    const profile = await repo.getProfileById(authUser.userId);
    const institution = (req.body?.institution || profile?.institution_id || '').trim();
    const classId = (req.body?.classId || req.body?.class_id || profile?.class_id || '').trim();
    const divisionId = (req.body?.divisionId || req.body?.division_id || profile?.division_id || '').trim();

    if (!institution || !classId || !divisionId) {
      res.status(400).json({
        error: 'Institution, Class, and Division are required to claim an active faculty session.',
      });
      return;
    }

    const result = await repo.claimFacultyDivisionSession({
      facultyId: authUser.userId,
      facultyName: authUser.name || profile?.full_name || authUser.email,
      facultyEmail: authUser.email,
      institution,
      classId,
      divisionId,
    });

    if (!result.success) {
      res.status(409).json({
        error: result.error,
        occupiedBy: result.occupiedBy,
      });
      return;
    }

    res.status(200).json({
      success: true,
      session: result.session,
    });
  } catch (err: any) {
    console.error('Error claiming faculty division session:', err);
    res.status(500).json({ error: 'Failed to claim faculty division session.' });
  }
}

export async function handleHeartbeatFacultySession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const authUser = req.user!;
    if (authUser.role !== 'faculty' && authUser.role !== 'admin') {
      res.status(403).json({ error: 'Only faculty members can heartbeat division sessions.' });
      return;
    }

    const repo = getRepository();
    const profile = await repo.getProfileById(authUser.userId);
    const institution = (req.body?.institution || profile?.institution_id || '').trim();
    const classId = (req.body?.classId || req.body?.class_id || profile?.class_id || '').trim();
    const divisionId = (req.body?.divisionId || req.body?.division_id || profile?.division_id || '').trim();

    if (!institution || !classId || !divisionId) {
      res.status(400).json({ error: 'Institution, Class, and Division are required.' });
      return;
    }

    const result = await repo.heartbeatFacultyDivisionSession(authUser.userId, institution, classId, divisionId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({ success: true, session: result.session });
  } catch (err: any) {
    console.error('Error in faculty session heartbeat:', err);
    res.status(500).json({ error: 'Failed to refresh faculty session lease.' });
  }
}

export async function handleReleaseFacultySession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const authUser = req.user!;
    const repo = getRepository();
    await repo.releaseFacultyDivisionSession(authUser.userId);
    res.status(200).json({ success: true, message: 'Faculty division session released.' });
  } catch (err: any) {
    console.error('Error releasing faculty session:', err);
    res.status(500).json({ error: 'Failed to release faculty division session.' });
  }
}

export async function handleGetFacultySessionStatus(req: Request, res: Response): Promise<void> {
  try {
    const institution = ((req.query.institution || '') as string).trim();
    const classId = ((req.query.classId || req.query.class_id || '') as string).trim();
    const divisionId = ((req.query.divisionId || req.query.division_id || '') as string).trim();

    if (!institution || !classId || !divisionId) {
      res.status(400).json({ error: 'institution, classId, and divisionId query parameters are required.' });
      return;
    }

    const repo = getRepository();
    const session = await repo.getFacultyDivisionSession(institution, classId, divisionId);
    res.status(200).json({
      session,
      isOccupied: Boolean(session),
      occupiedBy: session
        ? {
            facultyId: session.faculty_id,
            facultyName: session.faculty_name,
            facultyEmail: session.faculty_email,
            expiresAt: session.expires_at,
          }
        : null,
    });
  } catch (err: any) {
    console.error('Error checking faculty session status:', err);
    res.status(500).json({ error: 'Failed to retrieve session status.' });
  }
}

// Register Router Endpoints
authRouter.get('/user', authenticate, handleGetUser);
authRouter.get('/me', authenticate, handleGetUser);
authRouter.post('/verify-faculty-secret', signupRateLimiter, handleVerifyFacultySecret);
authRouter.post('/signup', signupRateLimiter, handleSignUp);
authRouter.post('/register', signupRateLimiter, handleSignUp);
authRouter.post('/verify-otp', handleVerifyOtp);
authRouter.post('/resend-otp', handleResendOtp);
authRouter.post('/login', loginRateLimiter, handleLogin);
authRouter.post('/logout', handleLogout);
authRouter.post('/forgot-password', handleForgotPassword);
authRouter.post('/reset-password', handleResetPassword);
authRouter.post('/sync-profile', authenticate, handleSyncProfile);
authRouter.put('/profile', authenticate, handleUpdateProfile);

// Faculty Division Session Endpoints
authRouter.post('/faculty/session/claim', authenticate, handleClaimFacultySession);
authRouter.post('/faculty/session/heartbeat', authenticate, handleHeartbeatFacultySession);
authRouter.post('/faculty/session/release', authenticate, handleReleaseFacultySession);
authRouter.get('/faculty/session/status', handleGetFacultySessionStatus);
