-- SyntaXViva Production Supabase PostgreSQL Core Application Schema Migration
-- Migration: 20260916000000_core_application_schema.sql
-- Description: Core application tables, constraints, foreign keys, indexes, and RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Academic institutions, classes, and divisions
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

-- 2. User profiles
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

-- 3. Faculty active division sessions
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

-- 4. Mutation registry
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

-- 5. Assignments & test cases
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

-- 6. Student attempts
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

-- 7. Attempt mutations
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

-- 8. Phase 2 challenges
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

-- 9. Phase 2 evaluations
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

-- 10. Security & proctoring events
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

-- 11. Row Level Security (RLS)
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
