-- SyntaXViva Migration: Safely Deprecate and Drop faculty_authorization_codes
-- Date: 2026-09-17
-- Target: Supabase PostgreSQL
-- Purpose: Remove the faculty_authorization_codes table, related indexes, and RLS policies
--          while strictly preserving all user, profile, academic, and attempt data.

-- 1. Drop RLS policies on faculty_authorization_codes if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'faculty_authorization_codes'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view and manage faculty codes" ON public.faculty_authorization_codes;
  END IF;
END $$;

-- 2. Drop indexes if they exist
DROP INDEX IF EXISTS public.idx_fac_auth_code_hash;
DROP INDEX IF EXISTS public.idx_fac_auth_status;

-- 3. Safely drop the table without affecting any other tables
DROP TABLE IF EXISTS public.faculty_authorization_codes CASCADE;
