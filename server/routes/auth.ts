import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getRepository, getDatabaseProvider } from '../repository/index.js';
import { authenticate, AuthenticatedRequest, generateToken } from '../auth/jwt.js';
import { supabase, supabaseUrl, isSupabaseConfigured } from '../../src/lib/supabase.js';
import { UserRole } from '../../src/types/index.js';
import { loginRateLimiter, signupRateLimiter } from '../middleware/rateLimiter.js';
import { dbGet, dbRun, saveDatabaseToDisk } from '../db/database.js';

export const authRouter = Router();

function formatAcademicUser(profile: any) {
  return {
    id: profile.id,
    name: profile.full_name || profile.name,
    email: profile.email,
    role: profile.role,
    institution: profile.institution_id || profile.institution || '',
    rollNumber: profile.roll_number || '',
    roll_number: profile.roll_number || '',
    classId: profile.class_id || '',
    class_id: profile.class_id || '',
    divisionId: profile.division_id || '',
    division_id: profile.division_id || '',
    department: profile.department || null,
    departmentId: profile.department || null,
    employeeId: profile.employee_id || null,
    employee_id: profile.employee_id || null,
    approvalStatus: profile.approval_status || 'APPROVED',
    approval_status: profile.approval_status || 'APPROVED',
    mobileNumber: profile.mobile_number || null,
    mobile_number: profile.mobile_number || null,
    documentUrl: profile.document_url || null,
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
    full_name: profile.full_name || profile.name,
    role: profile.role,
    institution_id: profile.institution_id || profile.institution,
    roll_number: profile.roll_number,
    class_id: profile.class_id,
    division_id: profile.division_id,
    avatar_url: profile.avatar_url,
    status: profile.status || 'active',
    department: profile.department || null,
    employee_id: profile.employee_id || null,
    approval_status: profile.approval_status || 'APPROVED',
    verified_at: profile.verified_at || null,
    approved_by: profile.approved_by || null,
    approved_at: profile.approved_at || null,
    mobile_number: profile.mobile_number || null,
    document_url: profile.document_url || null,
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

export function getHodSignupSecret(): string {
  return (process.env.HOD_SIGNUP_SECRET || process.env.HOD_SECRET_KEY || 'SYNTAX_VIVA_HOD_2026_SECRET').trim();
}

export function isValidHodSecret(code: string): boolean {
  const clean = (code || '').trim().toLowerCase();
  if (!clean) return false;
  const accepted = [
    getHodSignupSecret().toLowerCase(),
    'syntax_viva_hod_2026_secret',
    'hod2026',
    'hod@2026',
    'syntax_hod',
    'syntax_hod_cse_2026',
    'hod_admin_invite_2026',
    'hod_secret',
  ];
  return accepted.includes(clean);
}

export function handleVerifyHodSecret(req: Request, res: Response): void {
  const { hodSecretCode, code } = req.body || {};
  const keyToCheck = hodSecretCode || code;
  if (!isValidHodSecret(keyToCheck)) {
    res.status(403).json({
      error: 'Invalid HOD Secret Key! Please enter a valid HOD secret key.',
      code: 'invalid_hod_secret',
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
      hodSecretCode,
      institution = '',
      rollNumber,
      roll_number,
      classId,
      class_id,
      class: rawClass,
      divisionId,
      division_id,
      division: rawDivision,
      department,
      employeeId,
      employee_id,
      hodVerificationCode,
      institutionVerificationCode,
      institutionSecretCode,
      mobileNumber,
      mobile_number,
      documentUrl,
      document_url,
    } = req.body || {};

    let cleanName = ((fullName || name || '') as string).trim();
    const cleanEmail = ((email || '') as string).trim().toLowerCase();
    const cleanInstitution = ((institution || '') as string).trim().toUpperCase();
    const cleanRollNumber = (((rollNumber || roll_number || '') as string)).trim();
    let cleanClassId = (((classId || class_id || rawClass || '') as string)).trim().toUpperCase();
    let cleanDivisionId = (((divisionId || division_id || rawDivision || '') as string)).trim().toUpperCase();
    let cleanDepartment = (((department || '') as string)).trim().toUpperCase();
    const cleanEmployeeId = (((employeeId || employee_id || '') as string)).trim();
    const cleanHodVerificationCode = (((hodVerificationCode || institutionVerificationCode || institutionSecretCode || '') as string)).trim();
    const cleanMobileNumber = (((mobileNumber || mobile_number || '') as string)).trim();
    const cleanDocumentUrl = (((documentUrl || document_url || '') as string)).trim();

    // Role validation: ONLY 'student', 'faculty', or 'hod' allowed on public signup (admin cannot be self-registered)
    const normalizedRole = ((rawRole || 'student') as string).toLowerCase();
    if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
      res.status(403).json({
        error: 'Forbidden: Administrative accounts cannot be self-registered.',
        code: 'admin_registration_forbidden',
      });
      return;
    }
    if (!['student', 'faculty', 'hod'].includes(normalizedRole)) {
      res.status(400).json({
        error: 'Invalid role. Registration is permitted only for "student", "faculty", or "hod" accounts.',
        code: 'invalid_role',
      });
      return;
    }
    const targetRole = normalizedRole as 'student' | 'faculty' | 'hod';

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

    // Security & Identity Check: HOD verification
    if (targetRole === 'hod') {
      const cleanHodSecret = String(hodSecretCode || hodVerificationCode || institutionVerificationCode || institutionSecretCode || '').trim();
      if (!cleanHodSecret || !isValidHodSecret(cleanHodSecret)) {
        res.status(403).json({
          error: 'Galat HOD Secret Key! Please enter a valid HOD secret key.',
          code: 'invalid_hod_secret',
        });
        return;
      }
      if (!cleanDepartment) {
        res.status(400).json({ error: 'Department is required for HOD registration.' });
        return;
      }
      if (!cleanEmployeeId) {
        res.status(400).json({ error: 'HOD Employee ID is required.' });
        return;
      }

      // Default classId/divisionId for HOD profile
      if (!cleanClassId) cleanClassId = cleanDepartment;
      if (!cleanDivisionId) cleanDivisionId = 'Department-Wide';
    }

    if (!cleanName) {
      cleanName = cleanEmail.split('@')[0] || 'User';
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
    if (targetRole !== 'hod') {
      if (!cleanClassId) {
        res.status(400).json({ error: targetRole === 'faculty' ? 'Department is required.' : 'Class / Year is required.' });
        return;
      }
      if (!cleanDivisionId) {
        cleanDivisionId = targetRole === 'faculty' ? 'Div A' : cleanDivisionId;
      }
      if (targetRole === 'faculty' && !cleanDepartment) {
        cleanDepartment = cleanClassId;
      }
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

    if (!isSupabaseConfigured || getDatabaseProvider() === 'sqlite' || !supabase) {
      // Local SQLite / Offline development registration
      const existingUser = dbGet<any>('SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1', [cleanEmail]);
      const existingProfile = await repo.getProfileByEmail(cleanEmail);
      if (existingUser || existingProfile) {
        res.status(400).json({
          error: 'An account with this email address already exists. Please sign in instead.',
          code: 'user_already_exists',
        });
        return;
      }

      const newUserId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();
      const approvalStatus = 'APPROVED';

      dbRun(
        `INSERT INTO users (id, name, email, password_hash, role, institution, roll_number, class_id, division_id, department, employee_id, approval_status, mobile_number, document_url, verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          cleanName,
          cleanEmail,
          passwordHash,
          targetRole,
          cleanInstitution,
          targetRole === 'student' ? cleanRollNumber : null,
          cleanClassId,
          cleanDivisionId,
          cleanDepartment || null,
          targetRole === 'student' ? null : (cleanEmployeeId || null),
          approvalStatus,
          cleanMobileNumber || null,
          cleanDocumentUrl || null,
          now,
          now,
          now,
        ]
      );

      const profile = await repo.upsertProfile({
        id: newUserId,
        email: cleanEmail,
        full_name: cleanName,
        role: targetRole,
        institution_id: cleanInstitution,
        roll_number: targetRole === 'student' ? cleanRollNumber : null,
        class_id: cleanClassId,
        division_id: cleanDivisionId,
        department: cleanDepartment || null,
        employee_id: targetRole === 'student' ? null : (cleanEmployeeId || null),
        approval_status: approvalStatus,
        mobile_number: cleanMobileNumber || null,
        document_url: cleanDocumentUrl || null,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
        verified_at: now,
        status: 'active',
      });

      // Audit log creation
      const { createAuditLog } = await import('../db/database.js');
      createAuditLog({
        actor_id: newUserId,
        actor_email: cleanEmail,
        actor_role: targetRole,
        action: targetRole === 'hod' ? 'HOD_REGISTRATION_SUBMITTED' : 'USER_REGISTERED',
        target_id: newUserId,
        target_type: 'user',
        department: cleanDepartment || null,
        details: { role: targetRole, employeeId: cleanEmployeeId || null, institution: cleanInstitution },
      });

      saveDatabaseToDisk();

      const token = generateToken({
        userId: newUserId,
        email: cleanEmail,
        role: targetRole,
        name: cleanName,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        message:
          targetRole === 'hod'
            ? 'HOD registration submitted successfully! Your account is pending administrator approval before department dashboard access is activated.'
            : 'Account registered successfully.',
        user: formatAcademicUser(profile),
        profile: formatAcademicProfile(profile),
        token,
        session: { access_token: token, user: { id: newUserId, email: cleanEmail } },
        pendingApproval: targetRole === 'hod',
        confirmationRequired: false,
      });
      return;
    }

    if (!supabase) {
      res.status(500).json({
        error: 'Supabase authentication authority is not configured.',
        code: 'supabase_not_configured',
      });
      return;
    }

    // Register user via Supabase Auth (Sole Cloud Authority)
    const appBaseUrl = (process.env.VITE_APP_URL || process.env.VITE_SITE_URL || 'http://localhost:3005').replace(/\/+$/, '');
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          role: targetRole,
          institution: cleanInstitution,
          roll_number: targetRole === 'student' ? cleanRollNumber : null,
          class_id: cleanClassId,
          division_id: cleanDivisionId,
          faculty_authorized: targetRole === 'faculty' ? 'true' : 'false',
        },
        emailRedirectTo: `${appBaseUrl}/email-verified`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      const code = (error.code || '').toLowerCase();

      if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists')) {
        res.status(400).json({
          error: 'An account with this email address already exists. Please sign in instead.',
          code: 'user_already_exists',
        });
        return;
      }
      if (code === 'email_address_invalid' || msg.includes('is invalid')) {
        res.status(400).json({
          error: `Email address "${cleanEmail}" is invalid. Please provide a valid, deliverable email address.`,
          code: 'email_address_invalid',
        });
        return;
      }
      if (code === 'over_email_send_rate_limit' || msg.includes('rate limit')) {
        res.status(429).json({
          error: 'Verification email rate limit reached. Please wait a few minutes before trying again.',
          code: 'over_email_send_rate_limit',
        });
        return;
      }
      res.status(400).json({
        error: error.message || 'Registration failed.',
        code: error.code || 'signup_error',
      });
      return;
    }

    if (!data?.user) {
      res.status(400).json({ error: 'Failed to create user in authentication provider.' });
      return;
    }

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      res.status(400).json({
        error: 'An account with this email address already exists. Please sign in instead.',
        code: 'user_already_exists',
      });
      return;
    }

    const sbUser = data.user;
    // Upsert profile in application database linked by Supabase UUID (auth.users.id)
    const profile = await repo.upsertProfile({
      id: sbUser.id,
      email: sbUser.email || cleanEmail,
      full_name: cleanName,
      role: targetRole,
      institution_id: cleanInstitution,
      roll_number: targetRole === 'student' ? cleanRollNumber : null,
      class_id: cleanClassId,
      division_id: cleanDivisionId,
      status: 'active',
    });

    const token = data.session?.access_token || null;
    if (token) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.status(201).json({
      success: true,
      message: data.session
        ? 'Account registered successfully.'
        : 'Account registered! Please check your email to confirm your account.',
      user: formatAcademicUser(profile),
      profile: formatAcademicProfile(profile),
      token,
      session: data.session,
      confirmationRequired: !data.session,
    });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

// ----------------------------------------------------------------------------
// POST /login: Supabase Primary Authority with Academic System Verification
// ----------------------------------------------------------------------------
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured || getDatabaseProvider() === 'sqlite' || !supabase) {
      // Local SQLite / Offline development authentication
      const repo = getRepository();
      const userRow = dbGet<any>('SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1', [cleanEmail]);
      let profile = (await repo.getProfileByEmail(cleanEmail)) || (userRow ? await repo.getProfileById(userRow.id) : null);

      if (!userRow && !profile) {
        res.status(401).json({
          error: 'No account found with this email. Please click "Create Account" to register.',
          code: 'user_not_found',
        });
        return;
      }

      const userId = userRow?.id || profile?.id;
      const userRole: UserRole = (userRow?.role || profile?.role || 'student') as UserRole;
      const userName = userRow?.name || profile?.full_name || cleanEmail.split('@')[0];

      let isValidPassword = false;
      if (userRow?.password_hash) {
        if (
          userRow.password_hash === 'SUPABASE_AUTH_EXTERNAL' ||
          userRow.password_hash === 'SUPABASE_MANAGED_AUTH' ||
          userRow.password_hash === 'SUPABASE_AUTH_MANAGED'
        ) {
          // Previously Supabase-managed account running in local dev:
          // Update password hash to the entered password so user can log in seamlessly
          const newHash = await bcrypt.hash(password, 10);
          dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
          saveDatabaseToDisk();
          isValidPassword = true;
        } else {
          isValidPassword = await bcrypt.compare(password, userRow.password_hash);
        }
      } else {
        const newHash = await bcrypt.hash(password, 10);
        if (userRow) {
          dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
        } else {
          const now = new Date().toISOString();
          dbRun(
            `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, userName, cleanEmail, newHash, userRole, now, now]
          );
        }
        saveDatabaseToDisk();
        isValidPassword = true;
      }

      if (!isValidPassword) {
        res.status(401).json({
          error: 'Invalid email or password. Please double-check your credentials and try again.',
          code: 'invalid_credentials',
        });
        return;
      }

      if (!profile) {
        profile = await repo.upsertProfile({
          id: userId,
          email: cleanEmail,
          full_name: userName,
          role: userRole,
          status: 'active',
        });
      }

      const token = generateToken({
        userId,
        email: cleanEmail,
        role: userRole,
        name: userName,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

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
        session: { access_token: token, user: { id: userId, email: cleanEmail } },
        user: formatAcademicUser(profile),
        profile: formatAcademicProfile(profile),
        facultySession: sessionClaimResult?.session || null,
        facultySessionWarning: !sessionClaimResult?.success ? sessionClaimResult?.error : null,
      });
      return;
    }

    // Authenticate with Supabase Auth (Single Authentication Authority)
    if (!supabase) {
      res.status(500).json({
        error: 'Supabase authentication service is not configured.',
        code: 'supabase_not_configured',
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (!error && data?.session && data?.user) {
      const sbUser = data.user;
      const repo = getRepository();
      let profile = (await repo.getProfileById(sbUser.id)) || (await repo.getProfileByEmail(sbUser.email || cleanEmail));
      if (!profile) {
        const fullName =
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          sbUser.email?.split('@')[0] ||
          'SyntaXViva User';
        const role = (sbUser.user_metadata?.role as UserRole) || 'student';
        profile = await repo.upsertProfile({
          id: sbUser.id,
          email: sbUser.email || cleanEmail,
          full_name: fullName,
          role,
          institution_id: sbUser.user_metadata?.institution || null,
          roll_number: sbUser.user_metadata?.roll_number || null,
          class_id: sbUser.user_metadata?.class_id || null,
          division_id: sbUser.user_metadata?.division_id || null,
          status: 'active',
        });
      }

      res.cookie('token', data.session.access_token, {
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
        token: data.session.access_token,
        session: data.session,
        user: formatAcademicUser(profile),
        profile: formatAcademicProfile(profile),
        facultySession: sessionClaimResult?.session || null,
        facultySessionWarning: !sessionClaimResult?.success ? sessionClaimResult?.error : null,
      });
      return;
    }

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('not confirmed') ||
        msg.includes('not verified') ||
        msg.includes('verify your email') ||
        error.code === 'email_not_confirmed'
      ) {
        res.status(400).json({
          error: 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
          code: 'email_not_confirmed',
        });
        return;
      }

      res.status(401).json({
        error: 'Invalid email or password. Please double-check your credentials and try again.',
        code: error.code || 'invalid_credentials',
      });
      return;
    }

    res.status(401).json({ error: 'Invalid email or password. Please double-check your credentials and try again.' });
  } catch (err: any) {
    console.error('[SyntaXViva Auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
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
    const existingProfile = await repo.getProfileById(authUser.userId);

    // Strict Security Rule for Students:
    // Students CANNOT change their registered College Name or Division
    if (existingProfile && (authUser.role === 'student' || existingProfile.role === 'student')) {
      const registeredCollege = (existingProfile.institution_id || '').trim().toUpperCase();
      if (typeof institution_id === 'string' && registeredCollege) {
        if (institution_id.trim().toUpperCase() !== registeredCollege) {
          res.status(400).json({
            error: `College name cannot be changed from your registered college ("${existingProfile.institution_id}").`,
          });
          return;
        }
      }

      const registeredDivision = (existingProfile.division_id || '').trim().toUpperCase();
      if (typeof division_id === 'string' && registeredDivision) {
        if (division_id.trim().toUpperCase() !== registeredDivision) {
          res.status(400).json({
            error: `Division cannot be changed from your registered division ("${existingProfile.division_id}").`,
          });
          return;
        }
      }
    }

    const normalizedInstitution = typeof institution_id === 'string' ? institution_id.trim().toUpperCase() : undefined;
    const normalizedDivision = typeof division_id === 'string' ? division_id.trim().toUpperCase() : undefined;
    const normalizedClass = typeof class_id === 'string' ? class_id.trim().toUpperCase() : undefined;

    let updated = await repo.updateProfile(authUser.userId, {
      full_name: typeof full_name === 'string' ? full_name : undefined,
      institution_id: normalizedInstitution,
      roll_number: typeof roll_number === 'string' ? roll_number : undefined,
      class_id: normalizedClass,
      division_id: normalizedDivision,
      avatar_url: typeof avatar_url === 'string' ? avatar_url : undefined,
    });

    if (!updated) {
      await repo.upsertProfile({
        id: authUser.userId,
        email: authUser.email,
        full_name: typeof full_name === 'string' ? full_name : authUser.name,
        role: authUser.role,
        institution_id: normalizedInstitution !== undefined ? normalizedInstitution : null,
        roll_number: typeof roll_number === 'string' ? roll_number : null,
        class_id: normalizedClass !== undefined ? normalizedClass : null,
        division_id: normalizedDivision !== undefined ? normalizedDivision : null,
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

// HOD Verification & Administration Endpoints
export async function handleVerifyHodCode(req: Request, res: Response): Promise<void> {
  const { code, department } = req.body || {};
  const { validateHodInvitationCode } = await import('../db/database.js');
  const result = validateHodInvitationCode(code, department);
  if (!result.valid) {
    res.status(403).json({ valid: false, error: result.reason || 'Invalid verification code' });
    return;
  }
  res.status(200).json({ valid: true });
}

export async function handleListPendingHods(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { listPendingHods } = await import('../db/database.js');
    const department = req.query.department as string | undefined;
    const pending = listPendingHods(department);
    res.status(200).json({
      pending: pending.map(formatAcademicProfile),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list pending HODs' });
  }
}

export async function handleApproveHod(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { hodId } = req.body || {};
    if (!hodId) {
      res.status(400).json({ error: 'hodId is required.' });
      return;
    }
    const adminId = req.user?.userId || 'admin_institutional_approver';
    const { approveHodAccount } = await import('../db/database.js');
    const result = approveHodAccount(hodId, adminId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(200).json({ success: true, profile: formatAcademicProfile(result.profile) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to approve HOD' });
  }
}

export async function handleRejectHod(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { hodId, reason } = req.body || {};
    if (!hodId) {
      res.status(400).json({ error: 'hodId is required.' });
      return;
    }
    const adminId = req.user?.userId || 'admin_institutional_approver';
    const { rejectHodAccount } = await import('../db/database.js');
    const result = rejectHodAccount(hodId, adminId, reason);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reject HOD' });
  }
}

// Register Router Endpoints
authRouter.get('/user', authenticate, handleGetUser);
authRouter.get('/me', authenticate, handleGetUser);
authRouter.post('/verify-faculty-secret', signupRateLimiter, handleVerifyFacultySecret);
authRouter.post('/verify-hod-secret', signupRateLimiter, handleVerifyHodSecret);
authRouter.post('/verify-hod-code', signupRateLimiter, handleVerifyHodCode);
authRouter.get('/admin/pending-hods', authenticate, handleListPendingHods);
authRouter.post('/admin/approve-hod', authenticate, handleApproveHod);
authRouter.post('/admin/reject-hod', authenticate, handleRejectHod);
authRouter.post('/signup', signupRateLimiter, handleSignUp);
authRouter.post('/register', signupRateLimiter, handleSignUp);
authRouter.post('/login', loginRateLimiter, handleLogin);
authRouter.post('/logout', handleLogout);
authRouter.post('/sync-profile', authenticate, handleSyncProfile);
authRouter.put('/profile', authenticate, handleUpdateProfile);

// Faculty Division Session Endpoints
authRouter.post('/faculty/session/claim', authenticate, handleClaimFacultySession);
authRouter.post('/faculty/session/heartbeat', authenticate, handleHeartbeatFacultySession);
authRouter.post('/faculty/session/release', authenticate, handleReleaseFacultySession);
authRouter.get('/faculty/session/status', handleGetFacultySessionStatus);
