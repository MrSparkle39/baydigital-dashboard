-- Add onboarding_step column to track progress
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;