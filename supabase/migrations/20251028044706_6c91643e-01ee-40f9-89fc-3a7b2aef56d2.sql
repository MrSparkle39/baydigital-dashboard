-- Add ticket tracking fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tickets_used_this_period INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_period_start DATE;

-- Initialize billing_period_start for existing users with active subscriptions
UPDATE public.users
SET billing_period_start = COALESCE(subscription_start_date::date, CURRENT_DATE)
WHERE billing_period_start IS NULL;

-- Function to get ticket limit based on plan
CREATE OR REPLACE FUNCTION public.get_ticket_limit(user_plan user_plan)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN user_plan = 'starter' THEN 2
    WHEN user_plan = 'premium' THEN 5
    ELSE 0
  END;
$$;

-- Function to check and reset tickets if new billing period
CREATE OR REPLACE FUNCTION public.check_and_reset_tickets(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id;
  
  -- If billing period start is more than a month ago, reset
  IF user_record.billing_period_start IS NOT NULL AND
     user_record.billing_period_start + INTERVAL '1 month' <= CURRENT_DATE THEN
    UPDATE users
    SET tickets_used_this_period = 0,
        billing_period_start = CURRENT_DATE
    WHERE id = user_id;
  END IF;
END;
$$;

-- Function to check if user can create ticket
CREATE OR REPLACE FUNCTION public.can_create_ticket(user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  ticket_limit INTEGER;
BEGIN
  -- First check and reset if needed
  PERFORM check_and_reset_tickets(user_id);
  
  -- Get user data
  SELECT * INTO user_record FROM users WHERE id = user_id;
  
  -- Get ticket limit for plan
  ticket_limit := get_ticket_limit(user_record.plan);
  
  -- Check if under limit
  RETURN COALESCE(user_record.tickets_used_this_period, 0) < ticket_limit;
END;
$$;