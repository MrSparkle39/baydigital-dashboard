-- Add desired_emails to users to capture preferred email addresses during onboarding
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS desired_emails TEXT[] NULL;