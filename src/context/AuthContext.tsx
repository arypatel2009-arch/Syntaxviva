import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserProfile, UserRole } from '../types/index.ts';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api.ts';
import { supabase, isSupabaseConfigured, supabaseUrl } from '../lib/supabase.ts';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isSupabaseConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role?: UserRole;
    facultySecretCode?: string;
    hodSecretCode?: string;
    institution?: string;
    rollNumber?: string;
    classId?: string;
    divisionId?: string;
    department?: string;
    employeeId?: string;
    hodVerificationCode?: string;
    mobileNumber?: string;
    documentUrl?: string;
  }) => Promise<{ user: any; session: any; confirmationRequired?: boolean }>;
  register: (params: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    facultySecretCode?: string;
    hodSecretCode?: string;
    institution?: string;
    rollNumber?: string;
    classId?: string;
    divisionId?: string;
    department?: string;
    employeeId?: string;
    hodVerificationCode?: string;
    mobileNumber?: string;
    documentUrl?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (updates: {
    full_name?: string;
    institution_id?: string;
    roll_number?: string;
    class_id?: string;
    division_id?: string;
    avatar_url?: string;
  }) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function isProfileComplete(
  user: User | null,
  profile: UserProfile | null,
  role: UserRole | null
): boolean {
  if (!user && !profile) return false;
  const targetRole = role || profile?.role || user?.role || 'student';

  const name = profile?.full_name || user?.name || '';
  const institution = profile?.institution_id || user?.institution || '';

  if (!name || name.trim().length < 2) return false;

  // Faculty who registered with their details are fully authorized to create assignments
  if (targetRole === 'faculty') {
    return true;
  }

  if (!institution || !institution.trim()) return false;

  // Profile photo is optional and not a blocker for academic actions like creating assignments
  // Avatar fallback is auto-generated if not uploaded yet

  if (targetRole === 'student') {
    const rollNumber = profile?.roll_number || user?.rollNumber || user?.roll_number || '';
    const classId = profile?.class_id || user?.classId || user?.class_id || '';
    const divisionId = profile?.division_id || user?.divisionId || user?.division_id || '';

    if (!rollNumber || !rollNumber.trim()) return false;
    if (!classId || !classId.trim()) return false;
    if (!divisionId || !divisionId.trim()) return false;
  }

  if (targetRole === 'hod') {
    const dept = (profile as any)?.department || (user as any)?.department || '';
    const empId = (profile as any)?.employee_id || (user as any)?.employeeId || (user as any)?.employee_id || '';
    if (!dept || !dept.trim()) return false;
    if (!empId || !empId.trim()) return false;
  }

  return true;
}

// Helper to construct dynamic redirect URL for email verification & auth callbacks
export function getAuthRedirectUrl(path: string = '/login'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${cleanPath}`;
  }

  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
  const procEnv = typeof process !== 'undefined' && process?.env ? process.env : {};
  const envUrl = (metaEnv.VITE_APP_URL || metaEnv.VITE_SITE_URL || procEnv.VITE_APP_URL || procEnv.VITE_SITE_URL || '').trim();

  let baseUrl = envUrl;
  if (!baseUrl) {
    baseUrl = 'http://localhost:3000';
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  return `${cleanBaseUrl}${cleanPath}`;
}

// Helper to format clean user-facing authentication errors
export function formatAuthError(err: any): string {
  if (!err) return 'An unexpected authentication error occurred.';
  const rawMsg = err.message || String(err);
  const msg = rawMsg.toLowerCase();
  const code = (err.code || '').toLowerCase();
  const status = err.status || err.statusCode;

  if (
    code === 'over_email_send_rate_limit' ||
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('over_email_send_rate_limit')
  ) {
    return 'Too many verification emails have been requested. Please wait a while before requesting another email.';
  }
  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (code === 'user_already_confirmed' || msg.includes('already confirmed') || msg.includes('already verified')) {
    return 'This account is already verified. You can proceed to sign in.';
  }
  if (
    code === 'email_not_confirmed' ||
    code === 'email_not_verified' ||
    msg.includes('email not confirmed') ||
    msg.includes('email_not_confirmed') ||
    msg.includes('not confirmed') ||
    msg.includes('not verified') ||
    msg.includes('unconfirmed') ||
    msg.includes('verify your email')
  ) {
    return 'Please verify your email address before signing in. Check your inbox for the confirmation link.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('invalid email or password')) {
    return 'Invalid email or password. Please double-check your credentials and try again.';
  }
  if (msg.includes('password should be at least') || msg.includes('password must be at least')) {
    return 'Password must be at least 8 characters long, start with a capital letter, and include a number and symbol.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Unable to connect to the authentication server. Please check your internet connection.';
  }
  return err.message || 'Authentication error. Please try again.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize profile data into application state
  const applyProfile = useCallback((prof: UserProfile) => {
    setProfile(prof);
    setUser({
      id: prof.id,
      name: prof.full_name,
      email: prof.email,
      role: prof.role,
      institution: prof.institution_id || '',
      rollNumber: prof.roll_number || '',
      roll_number: prof.roll_number || '',
      classId: prof.class_id || '',
      class_id: prof.class_id || '',
      divisionId: prof.division_id || '',
      division_id: prof.division_id || '',
      department: prof.department || null,
      departmentId: prof.department || null,
      employeeId: prof.employee_id || null,
      employee_id: prof.employee_id || null,
      approvalStatus: prof.approval_status || null,
      approval_status: prof.approval_status || null,
      mobileNumber: prof.mobile_number || null,
      mobile_number: prof.mobile_number || null,
      documentUrl: prof.document_url || null,
      avatar_url: prof.avatar_url || null,
      avatarUrl: prof.avatar_url || null,
      createdAt: prof.created_at || new Date().toISOString(),
      updatedAt: prof.updated_at || new Date().toISOString(),
    });
  }, []);

  // Fetch or provision user profile from database/API
  const loadProfile = useCallback(
    async (sbUser: SupabaseUser, accessToken?: string): Promise<UserProfile | null> => {
      if (accessToken) {
        setStoredToken(accessToken);
        setToken(accessToken);
      }

      // 1. Fetch authoritative profile from application backend API (SQLite/Supabase Repository)
      try {
        const meRes = await api.getMe();
        if (meRes?.profile) {
          applyProfile(meRes.profile);
          return meRes.profile;
        }
      } catch (meErr) {
        console.warn('[AuthContext] Backend getMe warning:', meErr);
      }

      // 2. Try fetching profile directly from Supabase public.profiles if backend getMe is unavailable
      if (supabase) {
        try {
          const { data, error: sbErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .single();

          if (!sbErr && data) {
            const loadedProf: UserProfile = {
              id: data.id,
              email: data.email,
              full_name: data.full_name,
              role: data.role as UserRole,
              institution_id: data.institution_id,
              roll_number: data.roll_number,
              class_id: data.class_id,
              division_id: data.division_id,
              avatar_url: data.avatar_url,
              status: data.status,
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
            applyProfile(loadedProf);
            return loadedProf;
          }
        } catch {
          // Fall through
        }
      }

      // 3. Sync profile via backend API
      try {
        const syncRes = await api.syncProfile({
          full_name:
            sbUser.user_metadata?.full_name ||
            sbUser.user_metadata?.name ||
            sbUser.email?.split('@')[0] ||
            'SyntaXViva User',
          institution_id: sbUser.user_metadata?.institution,
          roll_number: sbUser.user_metadata?.roll_number,
          class_id: sbUser.user_metadata?.class_id,
          division_id: sbUser.user_metadata?.division_id,
        });
        if (syncRes?.profile) {
          applyProfile(syncRes.profile);
          return syncRes.profile;
        }
      } catch (syncErr) {
        console.warn('Backend profile sync note:', syncErr);
      }

      // 4. Fallback: synthesize local profile defaulting safely to student
      const fallbackProf: UserProfile = {
        id: sbUser.id,
        email: sbUser.email || '',
        full_name:
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          sbUser.email?.split('@')[0] ||
          'Student User',
        role: (sbUser.user_metadata?.role as UserRole) || 'student',
        institution_id: sbUser.user_metadata?.institution || null,
        roll_number: sbUser.user_metadata?.roll_number || null,
        class_id: sbUser.user_metadata?.class_id || null,
        division_id: sbUser.user_metadata?.division_id || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      applyProfile(fallbackProf);
      return fallbackProf;
    },
    [applyProfile]
  );

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      setIsLoading(true);

      if (isSupabaseConfigured && supabase) {
        try {
          const {
            data: { session: initialSession },
          } = await supabase.auth.getSession();

          if (initialSession && initialSession.user && isMounted) {
            setSession(initialSession);
            setSupabaseUser(initialSession.user);
            setToken(initialSession.access_token);
            setStoredToken(initialSession.access_token);
            await loadProfile(initialSession.user, initialSession.access_token);
            setIsLoading(false);
            return;
          }
        } catch (sbErr) {
          console.warn('[SyntaXViva Auth] Supabase getSession error:', sbErr);
        }
      }

      // Check stored authoritative session token
      const storedToken = getStoredToken();
      if (storedToken && isMounted) {
        try {
          const meData = await api.getMe();
          if (meData?.user && isMounted) {
            setToken(storedToken);
            if (meData.profile) {
              applyProfile(meData.profile);
            } else {
              setUser(meData.user);
            }
            setIsLoading(false);
            return;
          }
        } catch {
          removeStoredToken();
        }
      }

      // If no valid session is returned, clear state
      if (isMounted) {
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setProfile(null);
        setToken(null);
        removeStoredToken();
        setIsLoading(false);
      }
    }

    initAuth();

    // Setup Supabase onAuthStateChange listener
    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setSupabaseUser(null);
          setProfile(null);
          setUser(null);
          setToken(null);
          removeStoredToken();
          setIsLoading(false);
        } else if (newSession?.user) {
          setSession(newSession);
          setSupabaseUser(newSession.user);
          setToken(newSession.access_token);
          setStoredToken(newSession.access_token);
          await loadProfile(newSession.user, newSession.access_token);
          setIsLoading(false);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [loadProfile, applyProfile]);

  // Login method: Supabase Auth primary authority
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (!cleanEmail || !password) {
        throw new Error('Please enter both email and password.');
      }

      // Temporary Development Diagnostics (Task 12: Never log plaintext password)
      console.log('[Auth Diagnostics Frontend]', {
        authOperation: 'login',
        email: cleanEmail,
        supabaseProjectUrl: supabaseUrl,
        passwordProvided: Boolean(password),
        passwordLength: password?.length,
      });

      // Authenticate with Supabase Auth (or fall back to local server auth if Supabase is not configured)
      if (!isSupabaseConfigured || !supabase) {
        const res = await api.login(cleanEmail, password);
        if (res?.token) {
          setToken(res.token);
          setStoredToken(res.token);
          if (res.profile) {
            applyProfile(res.profile);
          } else if (res.user) {
            setUser(res.user);
          }
          return;
        }
        throw new Error('Invalid email or password. Please double-check your credentials and try again.');
      }

      const { data, error: sbErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (sbErr) {
        throw sbErr;
      }

      if (data?.session && data?.user) {
        setSession(data.session);
        setSupabaseUser(data.user);
        setToken(data.session.access_token);
        setStoredToken(data.session.access_token);
        await loadProfile(data.user, data.session.access_token);
        return;
      }

      throw new Error('Invalid email or password. Please double-check your credentials and try again.');
    } catch (err: any) {
      const friendlyMsg = formatAuthError(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // SignUp method: Supabase Auth sole authority
  const signUp = async (params: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role?: UserRole;
    facultySecretCode?: string;
    hodSecretCode?: string;
    institution?: string;
    rollNumber?: string;
    classId?: string;
    divisionId?: string;
    department?: string;
    employeeId?: string;
    hodVerificationCode?: string;
    mobileNumber?: string;
    documentUrl?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.fullName?.trim() || cleanEmail.split('@')[0] || 'User';
    const cleanInstitution = params.institution?.trim() || 'SyntaXViva Academic Institute';
    let cleanClassId = params.classId?.trim() || 'Batch 2025';
    let cleanDivisionId = params.divisionId?.trim() || 'Div A';
    const cleanRollNumber = params.rollNumber?.trim();
    const cleanDepartment = params.department?.trim() || '';
    const cleanEmployeeId = params.employeeId?.trim() || '';
    const cleanHodSecret = (params.hodSecretCode || params.hodVerificationCode || '').trim();
    const targetRole = params.role || 'student';

    try {
      // Validate inputs
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        throw new Error('Please enter a valid email address.');
      }
      if (!params.password || params.password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      if (!/^[A-Z]/.test(params.password)) {
        throw new Error('Password must start with a capital letter (A-Z).');
      }
      if (!/[0-9]/.test(params.password)) {
        throw new Error('Password must include at least one number (0-9).');
      }
      if (!/[^A-Za-z0-9]/.test(params.password)) {
        throw new Error('Password must include at least one typographical or special symbol (e.g., @, #, $, %, &, *).');
      }
      if (params.confirmPassword !== undefined && params.password !== params.confirmPassword) {
        throw new Error('Passwords do not match. Please ensure both passwords are identical.');
      }

      if (targetRole === 'admin') {
        throw new Error('Administrative accounts cannot be self-registered.');
      }

      if (targetRole === 'faculty') {
        const cleanSecret = params.facultySecretCode?.trim() || '';
        if (!cleanSecret) {
          throw new Error('Galat Faculty Access Code! Aap faculty account nahi bana sakte.');
        }
        await api.verifyFacultySecret(cleanSecret);
      }

      if (targetRole === 'hod') {
        if (!cleanHodSecret) {
          throw new Error('HOD Secret Key is required.');
        }
        await api.verifyHodSecret(cleanHodSecret);
        if (!cleanDepartment) {
          throw new Error('Department name is required for HOD registration.');
        }
        if (!cleanEmployeeId) {
          throw new Error('HOD Employee ID is required.');
        }
        if (!params.classId) cleanClassId = cleanDepartment;
        if (!params.divisionId) cleanDivisionId = 'Department-Wide';
      }

      if (targetRole === 'student' && !cleanRollNumber) {
        throw new Error('Roll number is required for student registration.');
      }

      // Temporary Development Diagnostics (Task 12: Never log plaintext password)
      console.log('[Auth Diagnostics Frontend]', {
        authOperation: 'signup',
        email: cleanEmail,
        supabaseProjectUrl: supabaseUrl,
        passwordProvided: Boolean(params.password),
        passwordLength: params.password?.length,
      });

      // Register with Supabase Auth (or fall back to local server registration if Supabase is not configured)
      if (!isSupabaseConfigured || !supabase) {
        const res = await api.register({
          name: cleanName,
          email: cleanEmail,
          password: params.password,
          confirmPassword: params.confirmPassword,
          role: targetRole,
          facultySecretCode: params.facultySecretCode,
          hodSecretCode: cleanHodSecret,
          institution: cleanInstitution,
          rollNumber: cleanRollNumber,
          classId: cleanClassId,
          divisionId: cleanDivisionId,
          department: cleanDepartment,
          employeeId: cleanEmployeeId,
          hodVerificationCode: cleanHodSecret,
          mobileNumber: params.mobileNumber,
          documentUrl: params.documentUrl,
        });

        if (res?.token) {
          setToken(res.token);
          setStoredToken(res.token);
          if (res.profile) {
            applyProfile(res.profile);
          } else if (res.user) {
            setUser(res.user);
          }
          return {
            user: res.user,
            session: { access_token: res.token } as any,
            confirmationRequired: false,
          };
        }

        return {
          user: res.user,
          session: null,
          confirmationRequired: false,
        };
      }

      const { data, error: sbErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            full_name: cleanName,
            roll_number: targetRole === 'student' ? cleanRollNumber : null,
            institution_id: cleanInstitution,
            class: cleanClassId,
            class_id: cleanClassId,
            division: cleanDivisionId,
            division_id: cleanDivisionId,
            role: targetRole,
            faculty_authorized: targetRole === 'faculty' ? 'true' : 'false',
          },
          emailRedirectTo: getAuthRedirectUrl('/login'),
        },
      });

      if (sbErr) {
        const msg = sbErr.message.toLowerCase();
        const code = ((sbErr as any).code || '').toLowerCase();
        if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists')) {
          throw new Error('An account with this email address already exists. Please sign in instead.');
        }
        throw sbErr;
      }

      if (data?.user) {
        // If the user already exists, Supabase returns a user object with empty identities array
        if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error('An account with this email address already exists. Please sign in instead.');
        }

        if (data.session) {
          setSession(data.session);
          setSupabaseUser(data.user);
          setToken(data.session.access_token);
          setStoredToken(data.session.access_token);
          await loadProfile(data.user, data.session.access_token);

          // Sync profile to backend with valid access token
          api.syncProfile({
            full_name: cleanName,
            institution_id: cleanInstitution,
            roll_number: cleanRollNumber,
            class_id: cleanClassId,
            division_id: cleanDivisionId,
          }).catch((err) => console.warn('Background profile sync note:', err));

          return {
            user: data.user,
            session: data.session,
            confirmationRequired: false,
          };
        }

        // Email confirmation is required by Supabase (data.session is null).
        // Strictly DO NOT attempt auto-login (signInWithPassword), which triggers 400 Bad Request.
        return {
          user: data.user,
          session: null,
          confirmationRequired: true,
        };
      }

      throw new Error('Registration could not be completed. Please try again.');
    } catch (err: any) {
      const friendlyMsg = formatAuthError(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Register compatibility wrapper
  const register = async (params: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    facultySecretCode?: string;
    hodSecretCode?: string;
    institution?: string;
    rollNumber?: string;
    classId?: string;
    divisionId?: string;
    department?: string;
    employeeId?: string;
    hodVerificationCode?: string;
    mobileNumber?: string;
    documentUrl?: string;
  }) => {
    await signUp({
      fullName: params.name,
      email: params.email,
      password: params.password,
      role: params.role,
      facultySecretCode: params.facultySecretCode,
      institution: params.institution,
      rollNumber: params.rollNumber,
      classId: params.classId,
      divisionId: params.divisionId,
      department: params.department,
      employeeId: params.employeeId,
      hodVerificationCode: params.hodVerificationCode,
      mobileNumber: params.mobileNumber,
      documentUrl: params.documentUrl,
    });
  };

  // Logout method: uses supabase.auth.signOut()
  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      await api.logout();
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      setSession(null);
      setSupabaseUser(null);
      setUser(null);
      setProfile(null);
      setToken(null);
      setError(null);
      removeStoredToken();
    }
  };

  const signOut = logout;

  // Forgot password method: uses supabase.auth.resetPasswordForEmail()
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      throw new Error(msg);
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const redirectTo = getAuthRedirectUrl('/reset-password');
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });

        if (resetErr) {
          throw new Error(formatAuthError(resetErr));
        }

        return {
          success: true,
          message: 'Password reset instructions have been sent to your email address.',
        };
      }

      return {
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
      };
    } catch (err: any) {
      const friendly = formatAuthError(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  // Update password method: uses supabase.auth.updateUser({ password })
  const updatePassword = async (newPassword: string): Promise<{ success: boolean }> => {
    setError(null);

    let msg: string | null = null;
    if (!newPassword || newPassword.length < 8) {
      msg = 'Password must be at least 8 characters long.';
    } else if (!/^[A-Z]/.test(newPassword)) {
      msg = 'Password must start with a capital letter (A-Z).';
    } else if (!/[0-9]/.test(newPassword)) {
      msg = 'Password must include at least one number (0-9).';
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      msg = 'Password must include at least one typographical or special symbol (e.g., @, #, $, %, &, *).';
    }
    if (msg) {
      setError(msg);
      throw new Error(msg);
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateErr) {
          throw new Error(formatAuthError(updateErr));
        }

        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      const friendly = formatAuthError(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  // Resend verification email: uses supabase.auth.resend({ type: 'signup', email })
  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      throw new Error(msg);
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: true,
        message: 'Email verification is bypassed in local development mode.',
      };
    }

    try {
      const redirectTo = getAuthRedirectUrl('/login');
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (resendErr) {
        throw resendErr;
      }

      return {
        success: true,
        message: 'Verification email sent! Please check your inbox and verify your email before logging in.',
      };
    } catch (err: any) {
      const friendly = formatAuthError(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  // Update profile attributes (full_name, institution, roll_number, class_id, division_id, avatar_url) without allowing role elevation
  const updateUserProfile = async (updates: {
    full_name?: string;
    institution_id?: string;
    roll_number?: string;
    class_id?: string;
    division_id?: string;
    avatar_url?: string;
  }) => {
    try {
      if (isSupabaseConfigured && supabase && supabaseUser) {
        try {
          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', supabaseUser.id);
        } catch (sbErr) {
          console.warn('Supabase profile update note:', sbErr);
        }
      }
      const res = await api.updateProfile(updates);
      if (res.profile) {
        applyProfile(res.profile);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update profile.');
    }
  };

  // Verify OTP for password recovery or email verification
  const verifyOtp = async (email: string, token: string): Promise<{ success: boolean; message: string }> => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken) {
      const msg = 'Please enter both your email address and 6-digit OTP code.';
      setError(msg);
      throw new Error(msg);
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: true,
        message: 'Email verification is bypassed in local development mode.',
      };
    }

    try {
      const { data, error: otpErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      if (otpErr) {
        throw otpErr;
      }

      if (data?.session) {
        setSession(data.session);
        setSupabaseUser(data.user);
        setToken(data.session.access_token);
        setStoredToken(data.session.access_token);
      }

      return {
        success: true,
        message: 'OTP verified successfully. You can now set your new password.',
      };
    } catch (err: any) {
      const friendly = formatAuthError(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  // Refresh user state
  const refreshUser = async () => {
    if (session?.user) {
      await loadProfile(session.user, session.access_token);
    } else {
      const stored = getStoredToken();
      if (stored) {
        try {
          const res = await api.getMe();
          if (res.profile) {
            applyProfile(res.profile);
          } else if (res.user) {
            setUser(res.user);
          }
        } catch {
          // ignore
        }
      }
    }
  };

  const clearError = () => setError(null);

  const isAuthenticated = useMemo(() => {
    return Boolean((session && supabaseUser) || (user && token));
  }, [session, supabaseUser, user, token]);

  const effectiveRole = useMemo(() => {
    return profile?.role || user?.role || null;
  }, [profile, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        supabaseUser,
        role: effectiveRole,
        token,
        isLoading,
        isAuthenticated,
        error,
        isSupabaseConnected: isSupabaseConfigured,
        login,
        signUp,
        register,
        logout,
        signOut,
        resetPassword,
        updatePassword,
        resendVerificationEmail,
        updateUserProfile,
        verifyOtp,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
