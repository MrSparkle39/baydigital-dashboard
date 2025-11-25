-- Add github_repo column to sites table for automated blog publishing
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS github_repo TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.sites.github_repo IS 'GitHub repository in format "owner/repo" for automated blog post commits (e.g., "MrSparkle39/tic")';