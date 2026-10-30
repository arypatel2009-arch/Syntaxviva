/**
 * SyntaXViva Phase 2 — Core Application Repository Types
 * Defines domain entities and repository interfaces for PostgreSQL / Supabase and SQLite.
 */

export type UserRole = 'student' | 'faculty' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending';

export interface ProfileEntity {
  id: string; // User ID (UUID)
  email: string;
  full_name: string;
  role: UserRole;
  institution_id: string | null;
  college_id?: string | null;
  roll_number: string | null;
  class_id: string | null;
  division_id: string | null;
  avatar_url?: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  institution_id: string | null;
  roll_number: string | null;
  class_id: string | null;
  division_id: string | null;
  is_verified: boolean;
  verification_otp: string | null;
  otp_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollegeEntity {
  id: string;
  name: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassroomEntity {
  id: string;
  college_id: string;
  faculty_id: string;
  name: string;
  description?: string;
  join_code: string;
  created_at: string;
  updated_at: string;
  faculty_name?: string;
  college_name?: string;
  student_count?: number;
  assignment_count?: number;
}

export interface ClassroomEnrollmentEntity {
  id: string;
  classroom_id: string;
  student_id: string;
  enrolled_at: string;
  student_name?: string;
  student_email?: string;
  roll_number?: string;
}

export interface AssignmentEntity {
  id: string;
  classroom_id?: string;
  title: string;
  description: string;
  language: string;
  requirements: string;
  starter_code: string;
  test_cases_json: string;
  status: string;
  phase2_unlocked?: number | boolean;
  phase2Unlocked?: boolean;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  submission_count?: number;
}

export interface TestCaseEntity {
  id?: string;
  assignment_id?: string;
  input: string;
  expected: string;
  description?: string;
  is_hidden?: boolean;
}

export interface StudentAttemptEntity {
  id: string;
  assignment_id: string;
  student_id: string;
  state: string;
  language: string | null;
  original_code: string | null;
  mutated_code: string | null;
  mutation_type: string | null;
  mutation_metadata_json: string | null;
  repaired_code: string | null;
  phase2_start_time: string | null;
  phase2_deadline: string | null;
  evaluation_result_json: string | null;
  failure_reason: string | null;
  original_code_hash: string | null;
  mutated_code_hash: string | null;
  mutation_seed: string | null;
  mutation_status: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttemptMutationEntity {
  id: string;
  attempt_id: string;
  mutation_type: string;
  mutation_version: string;
  mutation_seed: string | null;
  original_code_hash: string;
  mutated_code: string | null;
  mutated_code_hash: string | null;
  mutation_metadata_json: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface Phase2ChallengeEntity {
  id: string;
  assignment_id: string;
  student_id: string;
  attempt_id: string;
  mutation_id: string | null;
  status: 'ACTIVE' | 'SUBMITTED' | 'PASSED' | 'FAILED' | 'EXPIRED' | 'SECURITY_TERMINATED';
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  final_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Phase2EvaluationEntity {
  id: string;
  challenge_id: string;
  attempt_id: string;
  assignment_id: string;
  student_id: string;
  submitted_code_hash: string;
  status: 'EVALUATING' | 'PASSED' | 'FAILED' | 'ERROR';
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  failure_reason: string | null;
  execution_metadata_json: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface SecurityEventEntity {
  id: string;
  attempt_id: string;
  challenge_id: string | null;
  student_id: string | null;
  assignment_id: string | null;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  phase: string;
  metadata_json: string;
  client_timestamp: string | null;
  server_timestamp: string;
  created_at: string;
}

export interface FacultyDivisionSessionEntity {
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

export interface MutationRegistryEntity {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  is_active: number | boolean;
  created_at: string;
}

export interface ProctoringEventEntity {
  id: string;
  attempt_id: string;
  event_type: string;
  severity: string;
  details_json: string;
  created_at: string;
}

export interface DashboardStatsEntity {
  totalAssignments?: number;
  totalStudents?: number;
  totalSubmissions?: number;
  completedAttempts?: number;
  activeAssignments?: number;
  myAttempts?: number;
  passedAttempts?: number;
}

export interface IApplicationRepository {
  // Users (Standalone Custom Auth)
  createUser(user: Partial<UserEntity> & { email: string; password_hash: string; full_name: string }): Promise<UserEntity>;
  getUserByEmail(email: string): Promise<UserEntity | null>;
  getUserById(id: string): Promise<UserEntity | null>;
  updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null>;

  // Profiles
  getProfileById(id: string): Promise<ProfileEntity | null>;
  getProfileByEmail(email: string): Promise<ProfileEntity | null>;
  getStudentByAcademicRoll(institution: string, classId: string, divisionId: string, rollNumber: string): Promise<ProfileEntity | null>;
  upsertProfile(data: Partial<ProfileEntity> & { id: string; email: string; full_name: string }): Promise<ProfileEntity>;
  updateProfile(id: string, updates: Partial<ProfileEntity>): Promise<ProfileEntity | null>;

  // Colleges (Tenant Boundary)
  getCollegeById(id: string): Promise<CollegeEntity | null>;
  getCollegeByName(name: string): Promise<CollegeEntity | null>;
  getOrCreateCollege(name: string, code?: string): Promise<CollegeEntity>;
  listColleges(): Promise<CollegeEntity[]>;

  // Classrooms (Scoped Multi-Tenant Unit)
  createClassroom(data: {
    id?: string;
    college_id: string;
    faculty_id: string;
    name: string;
    description?: string;
    join_code?: string;
  }): Promise<ClassroomEntity>;
  getClassroomById(id: string): Promise<ClassroomEntity | null>;
  getClassroomByJoinCode(joinCode: string): Promise<ClassroomEntity | null>;
  getClassroomsByFaculty(facultyId: string): Promise<ClassroomEntity[]>;
  getClassroomsByCollege(collegeId: string): Promise<ClassroomEntity[]>;
  getClassroomsByStudent(studentId: string): Promise<ClassroomEntity[]>;
  generateUniqueJoinCode(): Promise<string>;

  // Classroom Enrollments
  enrollStudent(classroomId: string, studentId: string): Promise<ClassroomEnrollmentEntity>;
  isStudentEnrolled(classroomId: string, studentId: string): Promise<boolean>;
  getEnrollmentsByClassroom(classroomId: string): Promise<ClassroomEnrollmentEntity[]>;
  getEnrollmentsByStudent(studentId: string): Promise<ClassroomEnrollmentEntity[]>;

  // Assignments
  getAssignments(filter?: {
    role?: UserRole;
    studentId?: string;
    facultyId?: string;
    collegeId?: string;
    classroomId?: string;
    status?: string;
  }): Promise<any[]>;
  getAssignmentById(id: string): Promise<AssignmentEntity | null>;
  createAssignment(data: Omit<AssignmentEntity, 'created_at' | 'updated_at'>): Promise<AssignmentEntity>;
  updateAssignment(id: string, data: Partial<AssignmentEntity>): Promise<AssignmentEntity | null>;
  deleteAssignment(id: string): Promise<boolean>;
  getDashboardStats(user: { userId: string; role: UserRole }): Promise<DashboardStatsEntity>;

  // Student Attempts
  getAttemptById(id: string): Promise<StudentAttemptEntity | null>;
  getAttemptByStudentAndAssignment(studentId: string, assignmentId: string): Promise<StudentAttemptEntity | null>;
  createAttempt(data: Partial<StudentAttemptEntity> & { id: string; assignment_id: string; student_id: string; state: string }): Promise<StudentAttemptEntity>;
  updateAttempt(id: string, updates: Partial<StudentAttemptEntity>): Promise<StudentAttemptEntity | null>;
  getSubmissions(filter?: { assignmentId?: string; studentId?: string; facultyId?: string }): Promise<any[]>;
  getEnrolledStudents(facultyId?: string): Promise<any[]>;

  // Mutations
  createAttemptMutation(data: AttemptMutationEntity): Promise<AttemptMutationEntity>;
  getAttemptMutation(attemptId: string): Promise<AttemptMutationEntity | null>;
  getMutationTypes(): Promise<MutationRegistryEntity[]>;
  toggleMutationType(code: string): Promise<MutationRegistryEntity | null>;

  // Phase 2 Challenges
  getPhase2ChallengeById(id: string): Promise<Phase2ChallengeEntity | null>;
  getPhase2ChallengeByAttempt(attemptId: string): Promise<Phase2ChallengeEntity | null>;
  createPhase2Challenge(data: Omit<Phase2ChallengeEntity, 'created_at' | 'updated_at'>): Promise<Phase2ChallengeEntity>;
  updatePhase2Challenge(id: string, updates: Partial<Phase2ChallengeEntity>): Promise<Phase2ChallengeEntity | null>;

  // Phase 2 Evaluations
  createPhase2Evaluation(data: Omit<Phase2EvaluationEntity, 'created_at'>): Promise<Phase2EvaluationEntity>;
  getEvaluationsForAttempt(attemptId: string): Promise<Phase2EvaluationEntity[]>;
  getPhase2EvaluationByChallenge(challengeId: string): Promise<Phase2EvaluationEntity | null>;

  // Security Events
  recordSecurityEvent(event: Omit<SecurityEventEntity, 'created_at'>): Promise<SecurityEventEntity>;
  getSecurityEventsForAttempt(attemptId: string): Promise<SecurityEventEntity[]>;

  // Proctoring Events
  recordProctoringEvent(event: Omit<ProctoringEventEntity, 'created_at'>): Promise<ProctoringEventEntity>;
  getProctoringEventsForAttempt(attemptId: string): Promise<ProctoringEventEntity[]>;

  // Faculty Division Sessions
  getFacultyDivisionSession(institution: string, classId: string, divisionId: string): Promise<FacultyDivisionSessionEntity | null>;
  upsertFacultyDivisionSession(session: FacultyDivisionSessionEntity): Promise<FacultyDivisionSessionEntity>;
  deleteFacultyDivisionSession(id: string): Promise<boolean>;
  claimFacultyDivisionSession(params: {
    facultyId: string;
    facultyName: string;
    facultyEmail: string;
    institution: string;
    classId: string;
    divisionId: string;
  }): Promise<{ success: boolean; session?: FacultyDivisionSessionEntity; occupiedBy?: any; error?: string }>;
  heartbeatFacultyDivisionSession(
    facultyId: string,
    institution: string,
    classId: string,
    divisionId: string
  ): Promise<{ success: boolean; session?: FacultyDivisionSessionEntity; error?: string }>;
  releaseFacultyDivisionSession(facultyId: string): Promise<{ success: boolean }>;

  // Contact Inquiries
  createInquiry(inquiry: Omit<ContactInquiryEntity, 'created_at' | 'updated_at'>): Promise<ContactInquiryEntity>;
  getInquiries(filter?: { status?: string }): Promise<ContactInquiryEntity[]>;
  updateInquiryStatus(id: string, status: 'NEW' | 'CONTACTED' | 'CLOSED'): Promise<ContactInquiryEntity | null>;
  getRecentInquiryByContact(email: string, phone: string, withinMs?: number): Promise<ContactInquiryEntity | null>;

  // Public Reviews & Benchmarks
  getReviews(filter?: { role?: string; verifiedOnly?: boolean }): Promise<ReviewEntity[]>;
  createReview(review: Omit<ReviewEntity, 'created_at' | 'updated_at'>): Promise<ReviewEntity>;
}

export interface ContactInquiryEntity {
  id: string;
  name: string;
  institution: string;
  email: string;
  phone: string;
  role: string;
  inquiry_type: string;
  expected_usage: string;
  preferred_time?: string | null;
  message?: string | null;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface ReviewEntity {
  id: string;
  author_name: string;
  author_email?: string | null;
  role: string;
  institution: string;
  lab_subject: string;
  avg_lab_score: number;
  students_evaluated: number;
  rating_fairness: number;
  rating_relevance: number;
  rating_ui: number;
  overall_rating: number;
  comment: string;
  verified: number;
  created_at: string;
  updated_at: string;
}
