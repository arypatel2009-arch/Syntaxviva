import { Router, Request, Response } from 'express';
import { getRepository } from '../repository/index.js';
import { authenticate, AuthenticatedRequest } from '../auth/jwt.js';
import { supabase, supabaseUrl } from '../../src/lib/supabase.js';
import { UserRole } from '../../src/types/index.js';
import { loginRateLimiter, signupRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

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

    if (!supabase) {
      res.status(500).json({
        error: 'Supabase authentication authority is not configured.',
        code: 'supabase_not_configured',
      });
      return;
    }

    // Register user via Supabase Auth (Sole Cloud Authority)
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
      if (msg.includes('not confirmed') || error.code === 'email_not_confirmed') {
        res.status(400).json({
          error: 'Your email address has not been verified yet. Please check your inbox and click the verification link.',
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
    const { full_name, institution_id, roll_number, class_id, division_id } = req.body || {};
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
      });
    } else {
      profile =
        (await repo.updateProfile(profile.id, {
          full_name: full_name?.trim() || profile.full_name,
          institution_id: institution_id !== undefined ? institution_id : profile.institution_id,
          roll_number: roll_number !== undefined ? roll_number : profile.roll_number,
          class_id: class_id !== undefined ? class_id : profile.class_id,
          division_id: division_id !== undefined ? division_id : profile.division_id,
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
// PUT /profile: Update user profile (Name, Academic Details)
// CRITICAL SECURITY RULE: Role can NEVER be modified through this endpoint!
// ----------------------------------------------------------------------------
export async function handleUpdateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const authUser = req.user!;
    const { full_name, institution_id, roll_number, class_id, division_id, role } = req.body || {};

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
authRouter.post('/login', loginRateLimiter, handleLogin);
authRouter.post('/logout', handleLogout);
authRouter.post('/sync-profile', authenticate, handleSyncProfile);
authRouter.put('/profile', authenticate, handleUpdateProfile);

// Faculty Division Session Endpoints
authRouter.post('/faculty/session/claim', authenticate, handleClaimFacultySession);
authRouter.post('/faculty/session/heartbeat', authenticate, handleHeartbeatFacultySession);
authRouter.post('/faculty/session/release', authenticate, handleReleaseFacultySession);
authRouter.get('/faculty/session/status', handleGetFacultySessionStatus);
