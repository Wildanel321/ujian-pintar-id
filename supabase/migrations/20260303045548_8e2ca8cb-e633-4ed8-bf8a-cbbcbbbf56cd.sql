
-- Drop the overly permissive policy that lets students see answer column directly
DROP POLICY IF EXISTS "Students can view questions via view" ON public.questions;
