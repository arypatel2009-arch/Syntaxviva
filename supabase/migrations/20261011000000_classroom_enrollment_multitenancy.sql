-- SyntaXViva Phase 5: Hierarchical Multi-Tenancy (College -> Classroom -> Assignment)
-- Migration: 20261011000000_classroom_enrollment_multitenancy.sql

-- 1. COLLEGES TABLE (Tenant Boundary)
CREATE TABLE IF NOT EXISTS public.colleges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill colleges from institutions if present
INSERT INTO public.colleges (id, name, code, created_at, updated_at)
SELECT 
  'col_' || LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '_', 'g')),
  name,
  COALESCE(code, UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 6))),
  created_at,
  updated_at
FROM public.institutions
ON CONFLICT (name) DO NOTHING;

-- 2. CLASSROOMS TABLE (Scoped to College & Owned by Faculty)
CREATE TABLE IF NOT EXISTS public.classrooms (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL REFERENCES public.colleges(id) ON DELETE RESTRICT,
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_college ON public.classrooms(college_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_faculty ON public.classrooms(faculty_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON public.classrooms(join_code);

-- 3. CLASSROOM ENROLLMENTS TABLE (Student <-> Classroom Many-to-Many)
CREATE TABLE IF NOT EXISTS public.classroom_enrollments (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_classroom_student_enrollment UNIQUE (classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_enrollments_classroom ON public.classroom_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_enrollments_student ON public.classroom_enrollments(student_id);

-- 4. ADD classroom_id TO ASSIGNMENTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'classroom_id'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN classroom_id TEXT REFERENCES public.classrooms(id) ON DELETE CASCADE;
    CREATE INDEX idx_assignments_classroom_id ON public.assignments(classroom_id);
  END IF;
END $$;

-- 5. ADD college_id TO PROFILES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'college_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN college_id TEXT REFERENCES public.colleges(id) ON DELETE SET NULL;
    CREATE INDEX idx_profiles_college_id ON public.profiles(college_id);
  END IF;
END $$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colleges are readable by authenticated users"
  ON public.colleges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Classrooms are readable by faculty owner or enrolled students"
  ON public.classrooms FOR SELECT
  TO authenticated
  USING (
    faculty_id = auth.uid() OR
    id IN (SELECT classroom_id FROM public.classroom_enrollments WHERE student_id = auth.uid())
  );

CREATE POLICY "Faculty can create classrooms"
  ON public.classrooms FOR INSERT
  TO authenticated
  WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "Enrollments readable by enrolled student or classroom faculty"
  ON public.classroom_enrollments FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    classroom_id IN (SELECT id FROM public.classrooms WHERE faculty_id = auth.uid())
  );

CREATE POLICY "Students can enroll via join code verification"
  ON public.classroom_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());
