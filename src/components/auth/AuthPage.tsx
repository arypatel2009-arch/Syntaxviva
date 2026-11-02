import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  GraduationCap,
  Briefcase,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  FileText,
} from 'lucide-react';
import { Logo } from '../common/Logo.tsx';
import { StudentRoleLogo, FacultyRoleLogo, HodRoleLogo } from '../common/RoleLogos.tsx';
import { Button } from '../common/UIComponents.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';

interface AuthPageProps {
  initialMode?: 'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'reset-password' | 'email-verified';
  onSuccess?: () => void;
  onNavigateHome?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onSuccess,
  onNavigateHome,
}) => {
  const {
    login,
    signUp,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    verifyOtp,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'reset-password' | 'email-verified'>(initialMode);
  const [signupRole, setSignupRole] = useState<'student' | 'faculty' | 'hod'>('student');

  // Form fields
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [classId, setClassId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [facultySecretCode, setFacultySecretCode] = useState('');
  const [hodSecretCode, setHodSecretCode] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [hodVerificationCode, setHodVerificationCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showFacultySecret, setShowFacultySecret] = useState(false);
  const [showHodSecret, setShowHodSecret] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState<string | null>(null);
  const [unverifiedLoginEmail, setUnverifiedLoginEmail] = useState<string | null>(null);

  // Resend Verification State & Cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Password reset completed state
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);

  // Synchronize when initialMode changes or URL hash dictates recovery
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const query = window.location.search || '';

      if (hash.includes('error=') || query.includes('error=')) {
        const params = new URLSearchParams(hash.replace(/^#/, '') || query.replace(/^\?/, ''));
        const errDesc = params.get('error_description') || params.get('error');
        if (errDesc) {
          setFormError(decodeURIComponent(errDesc.replace(/\+/g, ' ')));
        }
      }

      if (hash.includes('type=recovery')) {
        setMode('reset-password');
      } else if (hash.includes('type=signup') || hash.includes('type=email_verification')) {
        setMode('email-verified');
      } else {
        setMode(initialMode);
      }
    }
  }, [initialMode]);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const switchMode = (newMode: 'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'reset-password' | 'email-verified') => {
    if (emailVerificationSent) {
      setEmail(emailVerificationSent);
    }
    setMode(newMode);
    setFormError(null);
    setFormSuccess(null);
    setEmailVerificationSent(null);
    setUnverifiedLoginEmail(null);
    setResendFeedback(null);
    setPasswordResetComplete(false);
    clearError();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setFormSuccess(null);
    setUnverifiedLoginEmail(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password.';
      setFormError(msg);
      if (
        msg.toLowerCase().includes('not verified') ||
        msg.toLowerCase().includes('not confirmed') ||
        msg.toLowerCase().includes('verify your email') ||
        msg.toLowerCase().includes('email_not_confirmed') ||
        msg.toLowerCase().includes('unconfirmed')
      ) {
        setUnverifiedLoginEmail(cleanEmail);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordValidationError = (pwd: string): string | null => {
    if (!pwd) return 'Please enter a password.';
    const missing: string[] = [];
    if (!/^[A-Z]/.test(pwd)) {
      missing.push('first letter capital');
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      missing.push('symbols');
    }
    if (!/[0-9]/.test(pwd)) {
      missing.push('numbers');
    }
    if (pwd.length < 8) {
      missing.push('minimum 8 characters');
    }
    if (missing.length > 0) {
      return `Please write ${missing.join(', ')} in password.`;
    }
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setFormSuccess(null);
    clearError();

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'User');
    const cleanInstitution = institution.trim().toUpperCase();
    const cleanClass = classId.trim().toUpperCase();
    const cleanDivision = divisionId.trim().toUpperCase();
    const cleanRoll = rollNumber.trim();
    const cleanFacultySecret = facultySecretCode.trim();
    const cleanHodSecret = hodSecretCode.trim();
    const cleanDepartment = department.trim().toUpperCase();
    const cleanEmployeeId = employeeId.trim();
    const cleanHodVerificationCode = hodVerificationCode.trim() || cleanHodSecret;
    const cleanMobileNumber = mobileNumber.trim();
    const cleanDocumentUrl = documentUrl.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Please enter a valid official academic email address.');
      return;
    }
    if (!cleanInstitution) {
      setFormError('Please enter your institution / college name.');
      return;
    }

    if (signupRole === 'student') {
      if (!cleanClass) {
        setFormError('Please enter your class / batch.');
        return;
      }
      if (!cleanDivision) {
        setFormError('Please enter your division / section.');
        return;
      }
      if (!cleanRoll) {
        setFormError('Roll number is required for student registration.');
        return;
      }
    } else if (signupRole === 'faculty') {
      if (!cleanFacultySecret) {
        setFormError('Invalid Faculty Access Code! You cannot create a faculty account without a valid access code.');
        return;
      }
      if (!cleanClass) {
        setFormError('Please enter your department / class.');
        return;
      }
      if (!cleanDivision) {
        setFormError('Please enter your division / section.');
        return;
      }
    } else if (signupRole === 'hod') {
      if (!cleanHodSecret) {
        setFormError('HOD Secret Key is required.');
        return;
      }
      if (!cleanDepartment) {
        setFormError('Department is required for HOD registration.');
        return;
      }
      if (!cleanEmployeeId) {
        setFormError('HOD Employee ID is required.');
        return;
      }
    }

    const passwordValidationError = getPasswordValidationError(password);
    if (passwordValidationError) {
      setFormError(passwordValidationError);
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);
    try {
      await signUp({
        fullName: cleanName,
        email: cleanEmail,
        password,
        confirmPassword,
        role: signupRole,
        facultySecretCode: signupRole === 'faculty' ? cleanFacultySecret : undefined,
        hodSecretCode: signupRole === 'hod' ? cleanHodSecret : undefined,
        institution: cleanInstitution,
        rollNumber: signupRole === 'student' ? cleanRoll : undefined,
        classId: signupRole === 'hod' ? cleanDepartment : cleanClass,
        divisionId: signupRole === 'hod' ? (cleanDivision || undefined) : cleanDivision,
        department: signupRole === 'hod' ? cleanDepartment : (signupRole === 'faculty' ? cleanClass : undefined),
        employeeId: signupRole === 'hod' ? cleanEmployeeId : undefined,
        hodVerificationCode: signupRole === 'hod' && cleanHodVerificationCode ? cleanHodVerificationCode : undefined,
        mobileNumber: signupRole === 'hod' && cleanMobileNumber ? cleanMobileNumber : undefined,
        documentUrl: signupRole === 'hod' && cleanDocumentUrl ? cleanDocumentUrl : undefined,
      });

      if (signupRole === 'hod') {
        setFormSuccess(
          'HOD account registered successfully! You can now sign in to your Department Intelligence Dashboard.'
        );
        switchMode('login');
      } else {
        setEmailVerificationSent(cleanEmail);
        setResendCooldown(60);
      }
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = emailVerificationSent || unverifiedLoginEmail || email.trim();
    if (!targetEmail || isResending || resendCooldown > 0) return;

    setIsResending(true);
    setResendFeedback(null);
    clearError();

    try {
      const res = await resendVerificationEmail(targetEmail);
      setResendFeedback({
        type: 'success',
        message: res.message || 'Verification email sent! Please check your inbox.',
      });
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err.message || 'Failed to resend verification email.';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        setResendFeedback({
          type: 'error',
          message: 'Too many verification emails have been requested. Please wait a while before requesting another email.',
        });
        setResendCooldown(60);
      } else if (msg.toLowerCase().includes('already verified') || msg.toLowerCase().includes('already confirmed')) {
        setResendFeedback({
          type: 'info',
          message: 'This account is already verified. You can proceed to sign in.',
        });
      } else {
        setResendFeedback({
          type: 'error',
          message: msg,
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setFormSuccess(null);
    clearError();

    const targetEmail = (emailVerificationSent || unverifiedLoginEmail || email).trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!targetEmail) {
      setFormError('Target email address is missing.');
      return;
    }

    if (!cleanOtp || cleanOtp.length < 6) {
      setFormError('Please enter the 6-digit OTP security code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(targetEmail, cleanOtp);
      setFormSuccess(res.message || 'Account verified and activated successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setFormError(err.message || 'Invalid or expired OTP verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setFormSuccess(null);
    clearError();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(cleanEmail);
      setFormSuccess('Password reset link sent! Please check your email inbox and click the link to set a new password.');
    } catch (err: any) {
      setFormError(err.message || 'Could not send reset instructions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setFormSuccess(null);
    clearError();

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanEmail) {
      setFormError('Please enter your registered email address.');
      return;
    }
    if (!cleanOtp || cleanOtp.length < 6) {
      setFormError('Please enter the 6-digit OTP security code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(cleanEmail, cleanOtp);
      setFormSuccess('OTP code verified successfully! Please set your new password.');
      setMode('reset-password');
    } catch (err: any) {
      setFormError(err.message || 'Invalid or expired OTP security code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setFormSuccess(null);
    clearError();

    const passwordValidationError = getPasswordValidationError(password);
    if (passwordValidationError) {
      setFormError(passwordValidationError);
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setPasswordResetComplete(true);
      setFormSuccess('Password updated successfully.');
    } catch (err: any) {
      setFormError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div
          className="inline-block cursor-pointer"
          onClick={onNavigateHome}
          title="Return to Home"
        >
          <Logo variant="light" size="lg" showTagline />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {emailVerificationSent
                ? 'Verify Your Account'
                : mode === 'email-verified'
                ? 'Email Verified Successfully!'
                : mode === 'verify-otp'
                ? 'Verify Security Code'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'login'
                ? 'Welcome Back'
                : mode === 'forgot-password'
                ? 'Reset Password'
                : 'Set New Password'}
            </h1>
            <p className="text-xs text-slate-500">
              {emailVerificationSent
                ? 'Check your email to verify your SyntaXViva account.'
                : mode === 'email-verified'
                ? 'Your email address has been confirmed.'
                : mode === 'verify-otp'
                ? 'Enter the 6-digit OTP code sent to your email.'
                : mode === 'signup'
                ? 'Register your academic account to access oral vivas.'
                : mode === 'login'
                ? 'Sign in to access your dashboard and assignments.'
                : mode === 'forgot-password'
                ? 'Enter your registered email to receive password reset instructions.'
                : 'Enter and confirm your new secure password.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {!emailVerificationSent && (mode === 'login' || mode === 'signup') && (
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {(formError || error) && !emailVerificationSent && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="font-medium">{formError || error}</div>
                {unverifiedLoginEmail && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailVerificationSent(unverifiedLoginEmail);
                        setResendCooldown(0);
                        setResendFeedback(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold underline underline-offset-2 cursor-pointer"
                    >
                      Resend verification email &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {formSuccess && !emailVerificationSent && !passwordResetComplete && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{formSuccess}</div>
            </div>
          )}

          {/* EMAIL VERIFICATION SCREEN */}
          {emailVerificationSent ? (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                <Mail className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Verification Code Sent!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  We have sent a 6-digit OTP verification code to{' '}
                  <span className="font-semibold text-slate-900">{emailVerificationSent}</span>.
                  Please check your inbox (and spam folder) and enter the 6-digit code below to activate your account.
                </p>
              </div>

              {/* Feedback Messages */}
              {(formError || error) && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{formError || error}</div>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{formSuccess}</div>
                </div>
              )}

              {/* Resend Status Feedback */}
              {resendFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs text-left flex items-start gap-2.5 ${
                    resendFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : resendFeedback.type === 'info'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {resendFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 font-medium">{resendFeedback.message}</div>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifySignupOtp} className="space-y-4 text-left pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-center font-mono text-lg font-bold tracking-[0.35em] text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">
                    Check your email inbox or spam folder for your 6-digit code.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  disabled={loading || otpCode.trim().length !== 6}
                  className="w-full font-bold shadow-md shadow-emerald-600/20"
                >
                  {loading ? 'Verifying Code...' : 'Verify & Activate Account'}
                </Button>
              </form>

              {/* Resend button with cooldown */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending || resendCooldown > 0}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition cursor-pointer ${
                    isResending || resendCooldown > 0
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  {isResending
                    ? 'Sending verification email...'
                    : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend OTP Code'}
                </button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => switchMode('login')}
                  className="w-full font-semibold border-slate-200 text-slate-600 hover:text-slate-900"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* LOGIN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot-password')}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full shadow-md shadow-emerald-600/20 font-bold"
                  >
                    Sign In
                  </Button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-slate-500">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Create an Account
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* SIGNUP FORM */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 block">
                        Select Academic Role
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Professional Identity
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Student Card with Professional Logo */}
                      <button
                        type="button"
                        onClick={() => {
                          setSignupRole('student');
                          setFacultySecretCode('');
                          setHodSecretCode('');
                          setHodVerificationCode('');
                        }}
                        className={`relative p-2.5 sm:p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 group ${
                          signupRole === 'student'
                            ? 'bg-emerald-50/80 text-emerald-950 border-emerald-400 ring-2 ring-emerald-500/25 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <StudentRoleLogo size="md" glow={signupRole === 'student'} />
                        <div className="space-y-0.5">
                          <div className="text-xs font-black tracking-tight">Student</div>
                          <div className="text-[10px] text-slate-500 font-semibold">Scholar</div>
                        </div>
                        {signupRole === 'student' && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs"></span>
                        )}
                      </button>

                      {/* Faculty Card with Professional Logo */}
                      <button
                        type="button"
                        onClick={() => {
                          setSignupRole('faculty');
                          setHodSecretCode('');
                          setHodVerificationCode('');
                        }}
                        className={`relative p-2.5 sm:p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 group ${
                          signupRole === 'faculty'
                            ? 'bg-emerald-50/80 text-emerald-950 border-emerald-400 ring-2 ring-emerald-500/25 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <FacultyRoleLogo size="md" glow={signupRole === 'faculty'} />
                        <div className="space-y-0.5">
                          <div className="text-xs font-black tracking-tight">Faculty</div>
                          <div className="text-[10px] text-slate-500 font-semibold">Educator</div>
                        </div>
                        {signupRole === 'faculty' && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs"></span>
                        )}
                      </button>

                      {/* HOD Card with Professional Logo */}
                      <button
                        type="button"
                        onClick={() => {
                          setSignupRole('hod');
                          setFacultySecretCode('');
                        }}
                        className={`relative p-2.5 sm:p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 group ${
                          signupRole === 'hod'
                            ? 'bg-emerald-50/80 text-emerald-950 border-emerald-400 ring-2 ring-emerald-500/25 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <HodRoleLogo size="md" glow={signupRole === 'hod'} />
                        <div className="space-y-0.5">
                          <div className="text-xs font-black tracking-tight">HOD</div>
                          <div className="text-[10px] text-slate-500 font-semibold">Dept Head</div>
                        </div>
                        {signupRole === 'hod' && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs"></span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Active Role Professional Identity Banner */}
                  {signupRole === 'student' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-950 shadow-2xs">
                      <StudentRoleLogo size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Student Portal Registration</span>
                          <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 py-0.2 rounded font-mono font-bold">SCHOLAR</span>
                        </div>
                        <span className="text-[11px] text-emerald-700 block truncate">AI-evaluated coding labs, algorithmic defense, and viva transcripts</span>
                      </div>
                    </div>
                  )}

                  {signupRole === 'faculty' && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-950 shadow-2xs">
                      <FacultyRoleLogo size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Faculty Workspace Registration</span>
                          <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-mono font-bold">EDUCATOR</span>
                        </div>
                        <span className="text-[11px] text-amber-800 block truncate">Coursework creation, code mutation injection, and automated grading</span>
                      </div>
                    </div>
                  )}

                  {signupRole === 'hod' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300 flex items-center gap-2.5 text-xs text-emerald-950 shadow-2xs">
                      <HodRoleLogo size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Department Head (HOD) Registration</span>
                          <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-mono font-bold">EXECUTIVE</span>
                        </div>
                        <span className="text-[11px] text-emerald-700 block truncate">Institutional intelligence, faculty workload, and department governance</span>
                      </div>
                    </div>
                  )}

                  {signupRole === 'faculty' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 transition-all">
                      <label className="text-xs font-semibold uppercase tracking-wider text-amber-900 block">
                        Faculty Secret Access Key <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type={showFacultySecret ? 'text' : 'password'}
                          required
                          className="w-full rounded-lg border border-amber-300 bg-white pl-3 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={facultySecretCode}
                          onChange={(e) => setFacultySecretCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowFacultySecret(!showFacultySecret)}
                          className="absolute right-3 top-2 text-amber-700/70 hover:text-amber-900 cursor-pointer"
                        >
                          {showFacultySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {signupRole === 'hod' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 transition-all">
                      <label className="text-xs font-semibold uppercase tracking-wider text-emerald-900 block">
                        HOD Secret Key <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type={showHodSecret ? 'text' : 'password'}
                          required
                          className="w-full rounded-lg border border-emerald-300 bg-white pl-3 pr-10 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={hodSecretCode}
                          onChange={(e) => setHodSecretCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowHodSecret(!showHodSecret)}
                          className="absolute right-3 top-2 text-emerald-700/70 hover:text-emerald-900 cursor-pointer"
                        >
                          {showHodSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      {signupRole === 'hod' ? 'Official Academic Email' : 'Academic Email'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Institution / College Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value.toUpperCase())}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {signupRole !== 'hod' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 block">
                            {signupRole === 'student' ? 'Class / Batch' : 'Department'}
                          </label>
                          <input
                            type="text"
                            required
                            value={classId}
                            onChange={(e) => setClassId(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 block">
                            Division
                          </label>
                          <input
                            type="text"
                            required
                            value={divisionId}
                            onChange={(e) => setDivisionId(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                        </div>
                      </div>

                      {signupRole === 'student' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 block">
                            Roll Number
                          </label>
                          <input
                            type="text"
                            required
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* HOD Specific Fields */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 block">
                            Department <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 block">
                            HOD Employee ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Mobile Number <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                        </label>
                        <input
                          type="tel"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password.length > 0 && getPasswordValidationError(password) && (
                      <p className="text-[11px] text-rose-600 font-medium pt-0.5">
                        {getPasswordValidationError(password)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full shadow-md shadow-emerald-600/20 font-bold flex items-center justify-center gap-2"
                  >
                    {signupRole === 'student' ? (
                      <>
                        <StudentRoleLogo size="sm" className="w-4 h-4" />
                        <span>Create Student Account</span>
                      </>
                    ) : signupRole === 'faculty' ? (
                      <>
                        <FacultyRoleLogo size="sm" className="w-4 h-4" />
                        <span>Create Faculty Account</span>
                      </>
                    ) : (
                      <>
                        <HodRoleLogo size="sm" className="w-4 h-4" />
                        <span>Register HOD Account</span>
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-slate-500">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {mode === 'forgot-password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full shadow-md shadow-emerald-600/20 font-bold"
                  >
                    Send Password Reset Link
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* VERIFY OTP FORM (Fallback) */}
              {mode === 'verify-otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      6-Digit Security OTP Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 pt-0.5">
                      Enter the 6-digit verification code sent to your email.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full shadow-md shadow-emerald-600/20 font-bold"
                  >
                    Verify OTP Code
                  </Button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Resend / Change Email
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* EMAIL VERIFIED CONFIRMATION SCREEN */}
              {mode === 'email-verified' && (
                <div className="space-y-5 text-center py-2">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Welcome to SyntaxViva! Your email has been verified successfully.
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      Your academic account is active. You can now sign in and access your oral viva dashboard.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        if (onSuccess) onSuccess();
                        else switchMode('login');
                      }}
                      className="w-full shadow-md shadow-emerald-600/20 font-bold"
                    >
                      Continue to Sign In
                    </Button>
                  </div>
                </div>
              )}

              {/* RESET PASSWORD FORM */}
              {mode === 'reset-password' && (
                <div className="space-y-4">
                  {passwordResetComplete ? (
                    <div className="space-y-4 text-center py-2">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Password Updated Successfully
                        </h3>
                        <p className="text-xs text-slate-500">
                          Your password has been updated. You can now sign in with your new credentials.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => switchMode('login')}
                        className="w-full font-semibold"
                      >
                        Continue to Sign In
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {password.length > 0 && getPasswordValidationError(password) && (
                          <p className="text-[11px] text-rose-600 font-medium pt-0.5">
                            {getPasswordValidationError(password)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        className="w-full shadow-md shadow-emerald-600/20 font-bold"
                      >
                        Update Password
                      </Button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => switchMode('login')}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Back to Sign In
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};