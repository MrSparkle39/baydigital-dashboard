-- Add custom notification email to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notification_email text;

-- Add comment for clarity
COMMENT ON COLUMN public.users.notification_email IS 'Custom email address for receiving email notifications (defaults to account email if null)';