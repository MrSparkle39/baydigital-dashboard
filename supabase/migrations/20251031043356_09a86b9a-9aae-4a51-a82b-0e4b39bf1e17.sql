-- Fix search_path for notify_ticket_message function
CREATE OR REPLACE FUNCTION notify_ticket_message()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  user_record RECORD;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL and service role key from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, use vault (fallback)
  IF supabase_url IS NULL THEN
    supabase_url := 'https://ovhuafsxhdbhaqccfpmt.supabase.co';
  END IF;

  -- Get ticket and user info
  SELECT * INTO ticket_record FROM update_tickets WHERE id = NEW.ticket_id;
  SELECT * INTO user_record FROM users WHERE id = ticket_record.user_id;

  -- Call edge function based on who sent the message
  IF NEW.is_admin THEN
    -- Admin sent message, notify user
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'ticket_reply',
        'to', user_record.email,
        'data', jsonb_build_object(
          'ticketTitle', ticket_record.title,
          'message', NEW.message
        )
      )
    );
  ELSE
    -- User sent message, notify admin
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'ticket_reply_admin',
        'to', 'support@bay.digital',
        'data', jsonb_build_object(
          'ticketTitle', ticket_record.title,
          'message', NEW.message,
          'userName', COALESCE(user_record.business_name, user_record.full_name, user_record.email)
        )
      )
    );
  END IF;

  -- Update last_message_at on ticket
  UPDATE update_tickets SET last_message_at = NOW() WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$;

-- Move pg_net extension to extensions schema
DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;