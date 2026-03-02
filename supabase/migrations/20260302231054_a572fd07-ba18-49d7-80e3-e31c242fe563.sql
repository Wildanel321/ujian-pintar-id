
-- Fix: set view to SECURITY INVOKER (default safe behavior)
ALTER VIEW public.questions_student SET (security_invoker = on);

-- Allow authenticated users to select from the view
GRANT SELECT ON public.questions_student TO authenticated;

-- Also allow peserta to read questions (without answers) via a policy on the base table
-- The view with security_invoker means user's own permissions apply
-- We need a SELECT policy for regular users too, but only via the view (which excludes answers)
CREATE POLICY "Students can view questions via view"
ON public.questions
FOR SELECT
TO authenticated
USING (true);
