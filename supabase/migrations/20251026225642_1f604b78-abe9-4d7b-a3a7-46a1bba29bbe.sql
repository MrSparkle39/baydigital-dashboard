-- Allow additional website statuses on users table
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_website_status_check;

-- Add expanded check constraint to support pending, building, active, and live
ALTER TABLE public.users
ADD CONSTRAINT users_website_status_check
CHECK (website_status IN ('pending', 'building', 'active', 'live'));
