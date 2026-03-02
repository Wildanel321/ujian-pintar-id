
-- Create a view for students that excludes the answer column
CREATE OR REPLACE VIEW public.questions_student AS
SELECT id, subject_id, question, option_a, option_b, option_c, option_d, option_e, created_at
FROM public.questions;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Auth can view questions" ON public.questions;

-- Only admins can see full questions (with answers)
CREATE POLICY "Admin can view all questions"
ON public.questions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
