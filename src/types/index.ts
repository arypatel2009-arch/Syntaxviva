export type UserRole = 'faculty' | 'student' | 'admin';

export interface UserProfile {
  id: string; // UUID corresponding to auth.users.id
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: string | null;
  roll_number?: string | null;
  class_id?: string | null;
  division_id?: string | null;
  avatar_url?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution?: string;
  rollNumber?: string;
  roll_number?: string;
  classId?: string;
  class_id?: string;
  divisionId?: string;
  division_id?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyDivisionSession {
  id: string;
  faculty_id: string;
  faculty_name: string;
  faculty_email: string;
  institution: string;
  class_id: string;
  division_id: string;
  last_heartbeat: string;
  expires_at: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  profile?: UserProfile;
  facultySession?: FacultyDivisionSession | null;
  facultySessionWarning?: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  language: string;
  requirements: string;
  starterCode: string;
  testCasesJson: string;
  status: 'active' | 'draft' | 'archived';
  phase2Unlocked?: boolean;
  phase2_unlocked?: number | boolean;
  createdBy: string;
  createdByName?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
  myAttemptState?: AttemptState;
  myMutationStatus?: string;
  myPhase2Status?: string;
}

export interface AiEvaluationResult {
  result: 'PASS' | 'FAIL';
  score: number;
  is_correct: boolean;
  summary: string;
  issues: string[];
  suggestions: string[];
}

export type AttemptState =
  | 'CREATED'
  | 'PHASE1_OPEN'
  | 'PHASE1_SUBMITTED'
  | 'PHASE1_PASSED'
  | 'PHASE1_FAILED'
  | 'MUTATION_PROCESSING'
  | 'MUTATION_READY'
  | 'MUTATION_PROCESSING_FAILED'
  | 'PHASE2_LOCKED_BY_FACULTY'
  | 'PHASE2_READY'
  | 'PHASE2_STARTED'
  | 'PHASE2_ACTIVE'
  | 'PHASE2_SUBMITTED'
  | 'PHASE2_EXPIRED'
  | 'PHASE2_PASSED'
  | 'PHASE2_FAILED'
  | 'SECURITY_TERMINATED'
  | 'EVALUATING'
  | 'PASSED'
  | 'FAILED'
  | 'LOCKED';

export interface StudentAttempt {
  id: string;
  assignmentId: string;
  studentId: string;
  state: AttemptState;
  language?: string | null;
  originalCode?: string | null;
  mutatedCode?: string | null;
  mutationType?: string | null;
  mutationMetadataJson?: string | null;
  originalCodeHash?: string | null;
  mutatedCodeHash?: string | null;
  mutationSeed?: string | null;
  mutationStatus?: string | null;
  hasMutatedCode?: boolean;
  repairedCode?: string | null;
  phase2StartTime?: string | null;
  phase2Deadline?: string | null;
  evaluationResultJson?: string | null;
  failureReason?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Phase1DetailsResponse {
  assignment: Assignment;
  attempt: StudentAttempt | null;
}

export interface Phase1SubmitResponse {
  success: boolean;
  message: string;
  evaluation?: AiEvaluationResult;
  submission: {
    id: string;
    assignmentId: string;
    studentId: string;
    state: AttemptState;
    language: string;
    originalCode: string;
    originalCodeHash?: string;
    evaluationResultJson?: string;
    submittedAt?: string;
    createdAt?: string;
  };
  mutation?: {
    status: string;
    mutationType?: string;
    originalCodeHash?: string;
    mutatedCodeHash?: string;
    metadata?: any;
    error?: string;
  };
}

export interface MutationRegistryEntry {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProctoringEvent {
  id: string;
  attemptId: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  phase: string;
  metadataJson: string;
  createdAt: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'error';
  database: {
    engine: string;
    initialized: boolean;
    tables: string[];
    recordCounts: {
      users: number;
      assignments: number;
      attempts: number;
      mutationTypes: number;
    };
  };
  auth: {
    jwtEnabled: boolean;
    tokenExpiry: string;
    bcryptRounds: number;
  };
  serverTime: string;
  version: string;
}

export interface Phase2StatusResponse {
  isAvailable: boolean;
  state: AttemptState;
  phase2Unlocked?: boolean;
  reason?: string;
  assignment?: Assignment;
  challengeId?: string;
  startedAt?: string;
  deadlineAt?: string;
  remainingSeconds?: number;
  durationSeconds?: number;
  mutatedCode?: string;
  language?: string;
  submittedAt?: string | null;
  finalCode?: string | null;
  evaluationStatus?: 'PASSED' | 'FAILED' | null;
  testsTotal?: number;
  testsPassed?: number;
  testsFailed?: number;
  failureReason?: string | null;
  results?: TestRunResult[];
  durationMs?: number;
  evaluation?: {
    status?: 'PASSED' | 'FAILED' | string;
    testsTotal?: number;
    testsPassed?: number;
    testsFailed?: number;
    failureReason?: string | null;
    results?: TestRunResult[];
    durationMs?: number;
    [key: string]: any;
  } | null;
  terminated?: boolean;
  warningCount?: number;
  maxWarnings?: number;
}

export interface Phase2StartResponse {
  success: boolean;
  challengeId: string;
  assignmentId: string;
  mutatedCode: string;
  language: string;
  startedAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  status: string;
}

export interface Phase2SubmitResponse {
  success: boolean;
  message: string;
  challengeId: string;
  assignmentId: string;
  submittedAt: string;
  state: AttemptState;
  evaluationStatus?: 'PASSED' | 'FAILED';
  testsTotal?: number;
  testsPassed?: number;
  testsFailed?: number;
  failureReason?: string | null;
  results?: TestRunResult[];
  durationMs?: number;
}

export interface TestRunResult {
  testIndex: number;
  passed: boolean;
  isHidden: boolean;
  description?: string;
  input?: string;
  expected?: string;
  actual?: string;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  error?: string;
  durationMs: number;
}

export interface TestRunResponse {
  success: boolean;
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  results: TestRunResult[];
  durationMs: number;
}

