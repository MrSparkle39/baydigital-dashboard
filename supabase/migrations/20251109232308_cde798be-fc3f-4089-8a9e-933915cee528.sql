-- Add Freepik download tracking to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS freepik_downloads_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS freepik_period_start DATE DEFAULT CURRENT_DATE;

-- Create function to check and reset Freepik downloads
CREATE OR REPLACE FUNCTION public.check_and_reset_freepik_downloads(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id;
  
  -- If period start is more than a month ago, reset
  IF user_record.freepik_period_start IS NOT NULL AND
     user_record.freepik_period_start + INTERVAL '1 month' <= CURRENT_DATE THEN
    UPDATE users
    SET freepik_downloads_used = 0,
        freepik_period_start = CURRENT_DATE
    WHERE id = user_id;
  END IF;
END;
$$;

-- Create function to get Freepik download limit based on plan
CREATE OR REPLACE FUNCTION public.get_freepik_limit(user_plan user_plan)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN user_plan = 'starter' THEN 5
    WHEN user_plan = 'professional' THEN 20
    WHEN user_plan = 'premium' THEN 20
    ELSE 0
  END;
$$;

-- Create function to check if user can download from Freepik
CREATE OR REPLACE FUNCTION public.can_download_freepik(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  download_limit INTEGER;
BEGIN
  -- First check and reset if needed
  PERFORM check_and_reset_freepik_downloads(user_id);
  
  -- Get user data
  SELECT * INTO user_record FROM users WHERE id = user_id;
  
  -- Get download limit for plan
  download_limit := get_freepik_limit(user_record.plan);
  
  -- Check if under limit
  RETURN COALESCE(user_record.freepik_downloads_used, 0) < download_limit;
END;
$$;