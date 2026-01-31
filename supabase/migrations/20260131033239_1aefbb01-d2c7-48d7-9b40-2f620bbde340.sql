-- Add email notification preference to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_forward_notifications boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.users.email_forward_notifications IS 'When enabled, sends notification to personal email when new mail arrives';