-- Fix Missing RLS Policies for Sites Table
-- This allows users to create, update, and delete their own site records

CREATE POLICY "Users can create own sites"
  ON public.sites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites"
  ON public.sites
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites"
  ON public.sites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fix Form Submissions INSERT Policy
-- This allows public form submissions only for live sites
-- Note: Application-level rate limiting and input validation should be added separately

CREATE POLICY "Allow public form submissions"
  ON public.form_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = form_submissions.site_id
      AND sites.status = 'live'
    )
  );