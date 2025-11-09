-- Fix search_path for get_freepik_limit function
CREATE OR REPLACE FUNCTION public.get_freepik_limit(user_plan user_plan)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN user_plan = 'starter' THEN 5
    WHEN user_plan = 'professional' THEN 20
    WHEN user_plan = 'premium' THEN 20
    ELSE 0
  END;
$$;