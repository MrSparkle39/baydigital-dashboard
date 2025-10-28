-- Fix ticket limit function to use correct plan names
CREATE OR REPLACE FUNCTION public.get_ticket_limit(user_plan user_plan)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN user_plan = 'starter' THEN 2
    WHEN user_plan = 'professional' THEN 5
    WHEN user_plan = 'premium' THEN 5
    ELSE 0
  END;
$$;