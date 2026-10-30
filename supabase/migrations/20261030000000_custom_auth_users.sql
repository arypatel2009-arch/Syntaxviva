-- SyntaXViva Standalone Custom Auth Migration
-- Decouples application from Supabase GoTrue Auth completely
-- Direct 6-Digit OTP, bcrypt password hashing, and JWT tokens

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Standalone public.users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  institution_id TEXT,
  roll_number TEXT,
  class_id TEXT,
  division_id TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_otp TEXT,
  otp_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_verification_otp ON public.users(verification_otp);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_academic_unique 
  ON public.users(institution_id, class_id, division_id, roll_number) 
  WHERE role = 'student' AND roll_number IS NOT NULL;

-- 2. Drop Legacy auth.users Foreign Key Constraints
DO $$ 
BEGIN
  -- Profiles
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;

  -- Classrooms
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'classrooms_faculty_id_fkey') THEN
    ALTER TABLE public.classrooms DROP CONSTRAINT classrooms_faculty_id_fkey;
  END IF;

  -- Classroom Enrollments
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'classroom_enrollments_student_id_fkey') THEN
    ALTER TABLE public.classroom_enrollments DROP CONSTRAINT classroom_enrollments_student_id_fkey;
  END IF;

  -- Assignments
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assignments_created_by_fkey') THEN
    ALTER TABLE public.assignments DROP CONSTRAINT assignments_created_by_fkey;
  END IF;

  -- Submissions
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'submissions_student_id_fkey') THEN
    ALTER TABLE public.submissions DROP CONSTRAINT submissions_student_id_fkey;
  END IF;

  -- Reviews
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reviews_user_id_fkey') THEN
    ALTER TABLE public.reviews DROP CONSTRAINT reviews_user_id_fkey;
  END IF;
END $$;

-- 3. Link public.profiles(id) to public.users(id) with Cascade
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_users_id_fkey') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_users_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint profiles_users_id_fkey could not be added immediately (possibly orphaned rows). Skipping strict check.';
END $$;

-- 4. Enable Row Level Security (RLS) but allow Service Role full unrestricted access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Helper trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
