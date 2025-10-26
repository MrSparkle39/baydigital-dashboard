-- Allow admins to create sites for any user
CREATE POLICY "Admins can create sites for any user"
ON public.sites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);