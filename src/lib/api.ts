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

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    if (text.startsWith('<')) {
      data = null;
    } else {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    const message = data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (data === null) {
    throw new Error(`Received unexpected non-JSON response from server for ${endpoint}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async verifyFacultySecret(facultySecretCode: string): Promise<{ valid: boolean }> {
    return apiFetch<{ valid: boolean }>('/api/auth/verify-faculty-secret', {
      method: 'POST',
      body: JSON.stringify({ facultySecretCode }),
    });
  },

  async verifyHodSecret(hodSecretCode: string): Promise<{ valid: boolean }> {
    return apiFetch<{ valid: boolean }>('/api/auth/verify-hod-secret', {
      method: 'POST',
      body: JSON.stringify({ hodSecretCode }),
    });
  },

  async verifyHodCode(code: string, department?: string): Promise<{ valid: boolean; error?: string }> {
    return apiFetch<{ valid: boolean; error?: string }>('/api/auth/verify-hod-code', {
      method: 'POST',
      body: JSON.stringify({ code, department }),
    });
  },

  async register(params: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role: UserRole;
    facultySecretCode?: string;
    hodSecretCode?: string;
    institution: string;
    rollNumber?: string;
    classId: string;
    divisionId: string;
    department?: string;
    employeeId?: string;
    hodVerificationCode?: string;
    mobileNumber?: string;
    documentUrl?: string;
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

  async getMe(): Promise<{ user: User; profile?: UserProfile }> {
    return apiFetch<{ user: User; profile?: UserProfile }>('/api/auth/me');
  },

  async getHodOverview(department?: string): Promise<any> {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiFetch<any>(`/api/hod/overview${q}`);
  },

  async getHodFaculty(department?: string): Promise<any> {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiFetch<any>(`/api/hod/faculty${q}`);
  },

  async getHodFacultyDetails(facultyId: string): Promise<any> {
    return apiFetch<any>(`/api/hod/faculty/${encodeURIComponent(facultyId)}`);
  },

  async getHodStudents(department?: string): Promise<any> {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiFetch<any>(`/api/hod/students${q}`);
  },

  async getHodStudentDetails(studentId: string): Promise<any> {
    return apiFetch<any>(`/api/hod/students/${encodeURIComponent(studentId)}`);
  },

  async getHodAssignments(department?: string): Promise<any> {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiFetch<any>(`/api/hod/assignments${q}`);
  },

  async getHodClassrooms(department?: string): Promise<any> {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiFetch<any>(`/api/hod/classrooms${q}`);
  },

  async getHodEvaluations(department?: string): Promise<any> {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiFetch<any>(`/api/hod/evaluations${q}`);
  },

  async getHodAuditLogs(department?: string): Promise<any> {
    const q = department ? `?department=${encodeURIComponent(department)}` : '';
    return apiFetch<any>(`/api/hod/audit-logs${q}`);
  },

  async getHodReportsIntelligence(branch?: string, year?: string, semester?: string): Promise<any> {
    const params = new URLSearchParams();
    if (branch) params.append('branch', branch);
    if (year) params.append('year', year);
    if (semester) params.append('semester', semester);
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/hod/reports-intelligence${q}`);
  },

  // Institutional Intelligence Center Endpoints
  async getInstitutionalOverview(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/overview${q}`);
  },

  async getInstitutionalSemesterPerformance(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/performance/semester${q}`);
  },

  async getInstitutionalSubjectPerformance(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/performance/subjects${q}`);
  },

  async getInstitutionalAssignmentAnalytics(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/assignments/analytics${q}`);
  },

  async getInstitutionalVivaAnalytics(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/viva/analytics${q}`);
  },

  async getInstitutionalDepartmentComparison(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/departments/comparison${q}`);
  },

  async getInstitutionalMonthlyActivity(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/activity/monthly${q}`);
  },

  async getInstitutionalReports(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/reports${q}`);
  },

  async previewInstitutionalReport(reportId: string, filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/reports/${reportId}/preview${q}`);
  },

  async exportInstitutionalReport(data: { reportId: string; format: string; title: string; filters?: Record<string, string> }): Promise<any> {
    return apiFetch<any>('/api/institutional/reports/export', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInstitutionalExportHistory(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/export-history${q}`);
  },

  async getInstitutionalCopoAnalytics(filters?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams(filters || {});
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/api/institutional/accreditation/copo${q}`);
  },

  async quickApproveHodDev(hodId?: string): Promise<any> {
    return apiFetch<any>('/api/hod/quick-approve-dev', {
      method: 'POST',
      body: JSON.stringify({ hodId }),
    });
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

  async getAssignmentStudentsReport(assignmentId: string): Promise<{
    assignment: any;
    stats: {
      totalStudents: number;
      completedCount: number;
      pendingCount: number;
      passedCount: number;
      failedCount: number;
      passRate: number;
    };
    students: any[];
    allAssignments: any[];
  }> {
    return apiFetch<{
      assignment: any;
      stats: {
        totalStudents: number;
        completedCount: number;
        pendingCount: number;
        passedCount: number;
        failedCount: number;
        passRate: number;
      };
      students: any[];
      allAssignments: any[];
    }>(`/api/assignments/${assignmentId}/students-report`);
  },

  async getStudents(): Promise<{ students: any[] }> {
    return apiFetch<{ students: any[] }>('/api/assignments/meta/students');
  },

  async getMatrixReport(): Promise<{
    facultyDivision: string;
    facultyCollege: string;
    assignmentsCount: number;
    studentsCount: number;
    assignments: any[];
    students: any[];
  }> {
    return apiFetch<{
      facultyDivision: string;
      facultyCollege: string;
      assignmentsCount: number;
      studentsCount: number;
      assignments: any[];
      students: any[];
    }>('/api/assignments/meta/matrix-report');
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

  async getStudentSubmissionDossier(assignmentId: string): Promise<{ success: boolean; submission: any }> {
    return apiFetch<{ success: boolean; submission: any }>(`/api/student/assignments/${assignmentId}/submission-dossier`);
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

  async createClassroom(params: { name: string; description?: string; division_id?: string; department?: string }): Promise<{ classroom: Classroom; joinCode: string }> {
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