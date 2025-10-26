-- Allow admins to view all sites
CREATE POLICY "Admins can view all sites"
ON public.sites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);