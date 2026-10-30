import {
  AuthResponse,
  Assignment,
  User,
  UserProfile,
  UserRole,
  SystemHealth,
  MutationRegistryEntry,
  Phase1DetailsResponse,
  Phase1SubmitResponse,
  Phase2StatusResponse,
  Phase2StartResponse,
  Phase2SubmitResponse,
  TestRunResponse,
  TestRunResult,
  Classroom,
  ClassroomEnrollment,
  College,
  Review,
  ReviewsResponse,
} from '../types/index.ts';

const TOKEN_KEY = 'syntaxviva_token';

// Render live backend base URL or relative path for local development
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const BACKEND_BASE_URL = isLocalhost
  ? ''
  : ((import.meta as any).env?.VITE_API_URL || 'https://syntaxviva.onrender.com').replace(/\/+$/, '');

export function getStoredToken(): string | null {
  const directToken = localStorage.getItem(TOKEN_KEY);
  if (directToken) return directToken;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (item?.access_token) return item.access_token;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  // Construct target URL pointing to Render backend
  const targetUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${BACKEND_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  let data: any = {};
  try {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text ? { message: text } : {};
    }
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    const err: any = new Error(message);
    err.status = response.status;
    err.statusCode = response.status;
    err.response = data;
    err.data = data;
    err.code = data?.code;
    err.requiresOtp = Boolean(data?.requiresOtp);
    err.email = data?.email;
    err.retryAfter = data?.retryAfter;

    if (
      response.status === 403 ||
      data?.requiresOtp ||
      data?.code === 'email_not_verified' ||
      (message && (
        message.toLowerCase().includes('verify') ||
        message.toLowerCase().includes('not confirmed') ||
        message.toLowerCase().includes('unconfirmed')
      ))
    ) {
      err.requiresOtp = true;
      err.code = data?.code || 'email_not_verified';
      if (err.response && typeof err.response === 'object') {
        err.response.requiresOtp = true;
      }
    }
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const targetUrl = `${BACKEND_BASE_URL}/api/auth/login`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text ? { message: text } : {};
        }
      } catch {
        data = {};
      }

      // Check if unverified user needing OTP transition (HTTP 403 or requiresOtp flag)
      if (
        response.status === 403 ||
        data?.requiresOtp ||
        data?.code === 'email_not_verified' ||
        (data?.error && String(data.error).toLowerCase().includes('verify')) ||
        (data?.message && String(data.message).toLowerCase().includes('verify'))
      ) {
        return {
          requiresOtp: true,
          email: data?.email || cleanEmail,
          message: data?.message || data?.error || 'We have sent a 6-digit verification code to your email. Please enter it below to activate your account.',
        };
      }

      if (!response.ok) {
        const msg = data?.message || data?.error || `Login failed with status ${response.status}`;
        const err: any = new Error(msg);
        err.status = response.status;
        err.statusCode = response.status;
        err.response = data;
        err.data = data;
        err.code = data?.code;
        throw err;
      }

      if (data?.token) {
        setStoredToken(data.token);
      }
      return data;
    } catch (err: any) {
      if (
        err?.requiresOtp ||
        err?.response?.requiresOtp ||
        err?.status === 403 ||
        err?.statusCode === 403 ||
        err?.code === 'email_not_verified' ||
        (err?.message && (
          err.message.toLowerCase().includes('verify') ||
          err.message.toLowerCase().includes('not confirmed') ||
          err.message.includes('403')
        ))
      ) {
        return {
          requiresOtp: true,
          email: err.email || err?.response?.email || cleanEmail,
          message: err.message || 'We have sent a 6-digit verification code to your email. Please enter it below to activate your account.',
        };
      }
      throw err;
    }
  },

  async verifyFacultySecret(facultySecretCode: string): Promise<{ valid: boolean }> {
    return apiFetch<{ valid: boolean }>('/api/auth/verify-faculty-secret', {
      method: 'POST',
      body: JSON.stringify({ facultySecretCode }),
    });
  },

  async register(params: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role: UserRole;
    facultySecretCode?: string;
    institution: string;
    rollNumber?: string;
    classId: string;
    divisionId: string;
  }): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async resendOtp(email: string): Promise<{ success: boolean; message: string; alreadyVerified?: boolean }> {
    return apiFetch<{ success: boolean; message: string; alreadyVerified?: boolean }>('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  },

  async getMe(): Promise<{ user: User; profile?: UserProfile }> {
    return apiFetch<{ user: User; profile?: UserProfile }>('/api/auth/me');
  },

  async syncProfile(params: {
    full_name?: string;
    institution_id?: string;
    roll_number?: string;
    class_id?: string;
    division_id?: string;
    avatar_url?: string;
  }): Promise<{ profile: UserProfile; user: User }> {
    return apiFetch<{ profile: UserProfile; user: User }>('/api/auth/sync-profile', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async updateProfile(params: {
    full_name?: string;
    institution_id?: string;
    roll_number?: string;
    class_id?: string;
    division_id?: string;
    avatar_url?: string;
  }): Promise<{ profile: UserProfile; user: User }> {
    return apiFetch<{ profile: UserProfile; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  async claimFacultySession(params?: {
    institution?: string;
    classId?: string;
    divisionId?: string;
  }): Promise<{ success: boolean; session: any }> {
    return apiFetch('/api/auth/faculty/session/claim', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  },

  async heartbeatFacultySession(params?: {
    institution?: string;
    classId?: string;
    divisionId?: string;
  }): Promise<{ success: boolean; session: any }> {
    return apiFetch('/api/auth/faculty/session/heartbeat', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  },

  async releaseFacultySession(): Promise<{ success: boolean }> {
    return apiFetch('/api/auth/faculty/session/release', {
      method: 'POST',
    });
  },

  async getFacultySessionStatus(params: {
    institution: string;
    classId: string;
    divisionId: string;
  }): Promise<{ session: any | null; isOccupied: boolean; occupiedBy: any }> {
    const q = new URLSearchParams({
      institution: params.institution,
      classId: params.classId,
      divisionId: params.divisionId,
    });
    return apiFetch(`/api/auth/faculty/session/status?${q.toString()}`);
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      removeStoredToken();
    }
  },

  // Assignments
  async getAssignments(): Promise<{ assignments: Assignment[] }> {
    return apiFetch<{ assignments: Assignment[] }>('/api/assignments');
  },

  async getAssignment(id: string): Promise<{ assignment: Assignment }> {
    return apiFetch<{ assignment: Assignment }>(`/api/assignments/${id}`);
  },

  async createAssignment(assignment: {
    title: string;
    description: string;
    language: string;
    requirements: string;
    starterCode: string;
    classroomId?: string;
    testCases?: Array<{ input: string; expected: string; description?: string }>;
    dueDate?: string;
  }): Promise<{ success: boolean; assignment: Assignment; notifiedStudentCount?: number }> {
    const res = await apiFetch<{ success: boolean; assignment: Assignment; notifiedStudentCount?: number }>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syntaxviva:notifications-updated'));
    }
    return res;
  },

  async updateAssignmentDeadline(id: string, dueDate: string): Promise<{ success: boolean; dueDate: string; notifiedStudentCount?: number }> {
    const res = await apiFetch<{ success: boolean; dueDate: string; notifiedStudentCount?: number }>(`/api/assignments/${id}/deadline`, {
      method: 'PUT',
      body: JSON.stringify({ dueDate }),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syntaxviva:notifications-updated'));
    }
    return res;
  },

  async toggleAssignmentPhase2Unlock(
    id: string,
    unlocked: boolean = true
  ): Promise<{ success: boolean; assignmentId: string; phase2Unlocked: boolean; notifiedStudentCount?: number }> {
    const res = await apiFetch<{
      success: boolean;
      assignmentId: string;
      phase2Unlocked: boolean;
      notifiedStudentCount?: number;
    }>(`/api/assignments/${id}/phase2-unlock`, {
      method: 'PUT',
      body: JSON.stringify({ unlocked }),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syntaxviva:notifications-updated'));
    }
    return res;
  },

  async unlockAllAssignmentsPhase2(
    unlocked: boolean = true
  ): Promise<{ success: boolean; phase2Unlocked: boolean; updatedCount: number; notifiedStudentCount?: number }> {
    const res = await apiFetch<{
      success: boolean;
      phase2Unlocked: boolean;
      updatedCount: number;
      notifiedStudentCount?: number;
    }>('/api/assignments/meta/unlock-all-phase2', {
      method: 'POST',
      body: JSON.stringify({ unlocked }),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syntaxviva:notifications-updated'));
    }
    return res;
  },

  async deleteAssignment(id: string): Promise<{ success: boolean; id: string }> {
    const res = await apiFetch<{ success: boolean; id: string }>(`/api/assignments/${id}`, {
      method: 'DELETE',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syntaxviva:notifications-updated'));
    }
    return res;
  },

  async getNotifications(): Promise<{ notifications: any[] }> {
    return apiFetch<{ notifications: any[] }>('/api/assignments/meta/notifications');
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>('/api/assignments/meta/notifications/read-all', {
      method: 'POST',
    });
  },

  async deleteNotification(notifId: string): Promise<{ success: boolean; id: string }> {
    return apiFetch<{ success: boolean; id: string }>(`/api/assignments/meta/notifications/${notifId}`, {
      method: 'DELETE',
    });
  },

  async clearAllNotifications(): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>('/api/assignments/meta/notifications', {
      method: 'DELETE',
    });
  },

  async getStats(): Promise<{ stats: any }> {
    return apiFetch<{ stats: any }>('/api/assignments/meta/stats');
  },

  async getAllSubmissions(): Promise<{ submissions: any[] }> {
    return apiFetch<{ submissions: any[] }>('/api/assignments/meta/all-submissions');
  },

  async getAssignmentSubmissions(assignmentId: string): Promise<{ submissions: any[] }> {
    return apiFetch<{ submissions: any[] }>(`/api/assignments/${assignmentId}/submissions`);
  },

  async getStudents(): Promise<{ students: any[] }> {
    return apiFetch<{ students: any[] }>('/api/assignments/meta/students');
  },

  // System & Registry
  async getHealth(): Promise<SystemHealth> {
    return apiFetch<SystemHealth>('/api/health');
  },

  async getMutationRegistry(): Promise<{ total: number; mutations: MutationRegistryEntry[] }> {
    return apiFetch<{ total: number; mutations: MutationRegistryEntry[] }>('/api/mutation-registry');
  },

  // Student Test Runner
  async runStudentCode(
    assignmentId: string,
    params: { code: string; language?: string }
  ): Promise<TestRunResponse> {
    return apiFetch<TestRunResponse>(`/api/student/assignments/${assignmentId}/run`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Student Phase 1
  async getStudentPhase1(assignmentId: string): Promise<Phase1DetailsResponse> {
    return apiFetch<Phase1DetailsResponse>(`/api/student/assignments/${assignmentId}/phase1`);
  },

  async submitStudentPhase1(
    assignmentId: string,
    params: { code: string; language: string }
  ): Promise<Phase1SubmitResponse> {
    return apiFetch<Phase1SubmitResponse>(`/api/student/assignments/${assignmentId}/phase1/submit`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Student Phase 2
  async getStudentPhase2(assignmentId: string): Promise<Phase2StatusResponse> {
    return apiFetch<Phase2StatusResponse>(`/api/student/assignments/${assignmentId}/phase2`);
  },

  async startStudentPhase2(assignmentId: string): Promise<Phase2StartResponse> {
    return apiFetch<Phase2StartResponse>(`/api/student/assignments/${assignmentId}/phase2/start`, {
      method: 'POST',
    });
  },

  async submitStudentPhase2(
    assignmentId: string,
    params: { challengeId: string; finalCode: string }
  ): Promise<Phase2SubmitResponse> {
    return apiFetch<Phase2SubmitResponse>(`/api/student/assignments/${assignmentId}/phase2/submit`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async retryStudentPhase2(assignmentId: string): Promise<Phase2StartResponse> {
    return apiFetch<Phase2StartResponse>(`/api/student/assignments/${assignmentId}/phase2/retry`, {
      method: 'POST',
    });
  },

  async reportPhase2SecurityEvent(
    assignmentId: string,
    params: {
      challengeId?: string;
      eventType: string;
      severity?: 'INFO' | 'WARNING' | 'CRITICAL';
      metadata?: any;
      clientTimestamp?: string;
    }
  ): Promise<{ success: boolean; terminated: boolean; message?: string; warningCount?: number; maxWarnings?: number }> {
    return apiFetch<{ success: boolean; terminated: boolean; message?: string; warningCount?: number; maxWarnings?: number }>(
      `/api/student/assignments/${assignmentId}/phase2/events`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  async getPhase2SecurityStatus(assignmentId: string): Promise<{
    success: boolean;
    attemptId: string | null;
    challengeId: string | null;
    state: string;
    isTerminated: boolean;
    warningCount: number;
    maxWarnings: number;
    events: any[];
  }> {
    return apiFetch(`/api/student/assignments/${assignmentId}/phase2/security-status`);
  },

  async terminatePhase2Challenge(
    assignmentId: string,
    params: {
      challengeId?: string;
      reason: string;
      eventType?: string;
      code?: string;
      language?: string;
      phase?: string;
      keepalive?: boolean;
    }
  ): Promise<{ success: boolean; terminated: boolean; reason?: string; message: string }> {
    const { keepalive, ...bodyParams } = params;
    return apiFetch(`/api/student/assignments/${assignmentId}/phase2/terminate`, {
      method: 'POST',
      body: JSON.stringify(bodyParams),
      ...(keepalive ? { keepalive: true } : {}),
    });
  },

  // -------------------------------------------------------------------------
  // Classrooms & Multi-Tenancy (College -> Classroom -> Assignment)
  // -------------------------------------------------------------------------
  async getClassrooms(): Promise<{ classrooms: Classroom[] }> {
    return apiFetch<{ classrooms: Classroom[] }>('/api/classrooms');
  },

  async getClassroom(id: string): Promise<{ classroom: Classroom; isEnrolled?: boolean }> {
    return apiFetch<{ classroom: Classroom; isEnrolled?: boolean }>(`/api/classrooms/${id}`);
  },

  async createClassroom(params: { name: string; description?: string }): Promise<{ classroom: Classroom; joinCode: string }> {
    return apiFetch<{ classroom: Classroom; joinCode: string }>('/api/classrooms', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async joinClassroom(joinCode: string): Promise<{
    message: string;
    classroom: Classroom;
    enrollment: ClassroomEnrollment;
  }> {
    return apiFetch<{
      message: string;
      classroom: Classroom;
      enrollment: ClassroomEnrollment;
    }>('/api/classrooms/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    });
  },

  async getClassroomStudents(id: string): Promise<{
    students: ClassroomEnrollment[];
    total: number;
  }> {
    return apiFetch<{
      students: ClassroomEnrollment[];
      total: number;
    }>(`/api/classrooms/${id}/students`);
  },

  // -------------------------------------------------------------------------
  // Public Reviews & Academic Benchmarks
  // -------------------------------------------------------------------------
  async getReviews(role?: string): Promise<ReviewsResponse> {
    const query = role && role !== 'all' ? `?role=${encodeURIComponent(role)}` : '';
    return apiFetch<ReviewsResponse>(`/api/reviews${query}`);
  },

  async submitReview(reviewData: Partial<Review>): Promise<{ success: boolean; review: Review; message: string }> {
    return apiFetch<{ success: boolean; review: Review; message: string }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },
};