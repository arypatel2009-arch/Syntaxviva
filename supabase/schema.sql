-- SyntaXViva Production Supabase PostgreSQL Core Application Schema
-- Phase 2: Complete Relational Schema & Row Level Security (RLS)
-- Database: PostgreSQL (Supabase)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. INSTITUTIONS & ACADEMIC STRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_classes (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.divisions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. USER PROFILES & IDENTITY (Linked to auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')) DEFAULT 'student',
  institution_id TEXT,
  roll_number TEXT,
  class_id TEXT,
  division_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles(institution_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_academic_unique 
  ON public.profiles(institution_id, class_id, division_id, roll_number) 
  WHERE role = 'student' AND roll_number IS NOT NULL;

-- ============================================================================
-- 3. FACULTY ACTIVE DIVISION SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.faculty_division_sessions (
  id TEXT PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  faculty_name TEXT NOT NULL,
  faculty_email TEXT NOT NULL,
  institution TEXT NOT NULL,
  class_id TEXT NOT NULL,
  division_id TEXT NOT NULL,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_div_unique 
  ON public.faculty_division_sessions(institution, class_id, division_id);
CREATE INDEX IF NOT EXISTS idx_faculty_div_faculty 
  ON public.faculty_division_sessions(faculty_id);

-- ============================================================================
-- 4. MUTATION REGISTRY (Extensible AST Mutation Operators)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mutation_registry (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mutation_registry_code ON public.mutation_registry(code);

-- ============================================================================
-- 5. ASSIGNMENTS & TEST CASES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'python',
  requirements TEXT NOT NULL DEFAULT '',
  starter_code TEXT NOT NULL DEFAULT '',
  test_cases_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'published', 'open')),
  created_by TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON public.assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);

CREATE TABLE IF NOT EXISTS public.assignment_test_cases (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected TEXT NOT NULL,
  description TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_cases_assignment ON public.assignment_test_cases(assignment_id);

-- ============================================================================
-- 6. STUDENT ATTEMPTS (Phase 1 Code Intake & Immutability)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_attempts (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'CREATED' 
    CHECK (state IN (
      'CREATED', 
      'PHASE1_SUBMITTED', 
      'MUTATION_IN_PROGRESS', 
      'MUTATION_READY', 
      'MUTATION_PROCESSING_FAILED', 
      'PHASE2_ACTIVE', 
      'PHASE2_SUBMITTED', 
      'PHASE2_PASSED', 
      'PHASE2_FAILED', 
      'PHASE2_EXPIRED', 
      'SECURITY_TERMINATED'
    )),
  language TEXT DEFAULT 'python',
  original_code TEXT,
  mutated_code TEXT,
  mutation_type TEXT,
  mutation_metadata_json JSONB,
  repaired_code TEXT,
  phase2_start_time TIMESTAMPTZ,
  phase2_deadline TIMESTAMPTZ,
  evaluation_result_json JSONB,
  failure_reason TEXT,
  original_code_hash TEXT,
  mutated_code_hash TEXT,
  mutation_seed TEXT,
  mutation_status TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON public.student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_assignment ON public.student_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_assignment_student ON public.student_attempts(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_state ON public.student_attempts(state);

-- ============================================================================
-- 7. ATTEMPT MUTATIONS (Isolated AST Mutation Audits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attempt_mutations (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  mutation_type TEXT NOT NULL,
  mutation_version TEXT NOT NULL DEFAULT '1.0.0',
  mutation_seed TEXT,
  original_code_hash TEXT NOT NULL,
  mutated_code TEXT,
  mutated_code_hash TEXT,
  mutation_metadata_json JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempt_mutations_attempt ON public.attempt_mutations(attempt_id);

-- ============================================================================
-- 8. PHASE 2 DEBUGGING CHALLENGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phase2_challenges (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  mutation_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUBMITTED', 'PASSED', 'FAILED', 'EXPIRED', 'SECURITY_TERMINATED')),
  started_at TIMESTAMPTZ NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  final_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase2_challenges_attempt ON public.phase2_challenges(attempt_id);
CREATE INDEX IF NOT EXISTS idx_phase2_challenges_student_asg ON public.phase2_challenges(student_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_phase2_challenges_status ON public.phase2_challenges(status);

-- ============================================================================
-- 9. PHASE 2 DETERMINISTIC EVALUATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phase2_evaluations (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES public.phase2_challenges(id) ON DELETE CASCADE,
  attempt_id TEXT NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  submitted_code_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('EVALUATING', 'PASSED', 'FAILED', 'ERROR')),
  tests_total INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  execution_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase2_evaluations_challenge ON public.phase2_evaluations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_phase2_evaluations_attempt ON public.phase2_evaluations(attempt_id);
CREATE INDEX IF NOT EXISTS idx_phase2_evaluations_student ON public.phase2_evaluations(student_id);

-- ============================================================================
-- 10. SECURITY & PROCTORING AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  challenge_id TEXT,
  student_id TEXT,
  assignment_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  phase TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_attempt ON public.security_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_security_events_student ON public.security_events(student_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

CREATE TABLE IF NOT EXISTS public.proctoring_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  phase TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_events_attempt ON public.proctoring_events(attempt_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_division_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutation_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase2_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase2_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security function: check if caller has faculty or admin role
CREATE OR REPLACE FUNCTION public.is_faculty_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('faculty', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11.1 Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_faculty_or_admin());

DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
CREATE POLICY "Users can update own profile except role"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 11.2 Assignments Policies
DROP POLICY IF EXISTS "Anyone authenticated can view active assignments" ON public.assignments;
CREATE POLICY "Anyone authenticated can view active assignments"
  ON public.assignments FOR SELECT TO authenticated
  USING (
    status IN ('active', 'published', 'open') 
    OR created_by = auth.uid()::text 
    OR public.is_faculty_or_admin()
  );

DROP POLICY IF EXISTS "Faculty and admin can insert assignments" ON public.assignments;
CREATE POLICY "Faculty and admin can insert assignments"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_faculty_or_admin());

DROP POLICY IF EXISTS "Faculty can update own assignments or admin" ON public.assignments;
CREATE POLICY "Faculty can update own assignments or admin"
  ON public.assignments FOR UPDATE TO authenticated
  USING (created_by = auth.uid()::text OR public.is_faculty_or_admin());

-- 11.3 Student Attempts Policies
DROP POLICY IF EXISTS "Students can view own attempts" ON public.student_attempts;
CREATE POLICY "Students can view own attempts"
  ON public.student_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid()::text OR public.is_faculty_or_admin());

DROP POLICY IF EXISTS "Students can insert own attempts" ON public.student_attempts;
CREATE POLICY "Students can insert own attempts"
  ON public.student_attempts FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid()::text OR public.is_faculty_or_admin());

DROP POLICY IF EXISTS "Students can update own attempts" ON public.student_attempts;
CREATE POLICY "Students can update own attempts"
  ON public.student_attempts FOR UPDATE TO authenticated
  USING (student_id = auth.uid()::text OR public.is_faculty_or_admin());

-- 11.4 Phase 2 Challenges Policies
DROP POLICY IF EXISTS "Students can view own challenges" ON public.phase2_challenges;
CREATE POLICY "Students can view own challenges"
  ON public.phase2_challenges FOR SELECT TO authenticated
  USING (student_id = auth.uid()::text OR public.is_faculty_or_admin());

DROP POLICY IF EXISTS "Students can update own challenges" ON public.phase2_challenges;
CREATE POLICY "Students can update own challenges"
  ON public.phase2_challenges FOR UPDATE TO authenticated
  USING (student_id = auth.uid()::text OR public.is_faculty_or_admin());

-- 11.5 Phase 2 Evaluations Policies
DROP POLICY IF EXISTS "Students can view own evaluations" ON public.phase2_evaluations;
CREATE POLICY "Students can view own evaluations"
  ON public.phase2_evaluations FOR SELECT TO authenticated
  USING (student_id = auth.uid()::text OR public.is_faculty_or_admin());

-- 11.6 Security & Proctoring Events Policies
DROP POLICY IF EXISTS "Students can view own security events" ON public.security_events;
CREATE POLICY "Students can view own security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (student_id = auth.uid()::text OR public.is_faculty_or_admin());

DROP POLICY IF EXISTS "Authenticated users can insert security events" ON public.security_events;
CREATE POLICY "Authenticated users can insert security events"
  ON public.security_events FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid()::text OR public.is_faculty_or_admin());

-- 11.7 Mutation Registry Policies (Read-only for users)
DROP POLICY IF EXISTS "Anyone can view active mutation types" ON public.mutation_registry;
CREATE POLICY "Anyone can view active mutation types"
  ON public.mutation_registry FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- 12. SUPABASE AUTH USER CREATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Role assignment: Allow 'faculty' or 'student' from user signup, defaulting to 'student' (admin is forbidden from self-registration).
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    institution_id,
    roll_number,
    class_id,
    division_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    extracted_name,
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'faculty' THEN 'faculty'
      ELSE 'student'
    END,
    COALESCE(NEW.raw_user_meta_data->>'institution_id', NEW.raw_user_meta_data->>'institution'),
    NEW.raw_user_meta_data->>'roll_number',
    COALESCE(NEW.raw_user_meta_data->>'class_id', NEW.raw_user_meta_data->>'class'),
    COALESCE(NEW.raw_user_meta_data->>'division_id', NEW.raw_user_meta_data->>'division'),
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE
      WHEN profiles.role = 'admin' THEN 'admin'
      WHEN EXCLUDED.role = 'faculty' THEN 'faculty'
      ELSE profiles.role
    END,
    roll_number = COALESCE(EXCLUDED.roll_number, profiles.roll_number),
    class_id = COALESCE(EXCLUDED.class_id, profiles.class_id),
    division_id = COALESCE(EXCLUDED.division_id, profiles.division_id),
    institution_id = COALESCE(EXCLUDED.institution_id, profiles.institution_id),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

