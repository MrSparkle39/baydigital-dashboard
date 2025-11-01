-- Drop all existing ticket message triggers and functions
DROP TRIGGER IF EXISTS on_ticket_message ON public.ticket_messages;
DROP TRIGGER IF EXISTS on_ticket_message_created ON public.ticket_messages;
DROP TRIGGER IF EXISTS on_ticket_message_notification ON public.ticket_messages;
DROP TRIGGER IF EXISTS on_ticket_message_email ON public.ticket_messages;
DROP FUNCTION IF EXISTS public.notify_ticket_message() CASCADE;
DROP FUNCTION IF EXISTS public.notify_ticket_message_notification() CASCADE;

-- Unified trigger function that both creates notifications AND sends emails
CREATE OR REPLACE FUNCTION public.notify_ticket_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  user_record RECORD;
  user_name TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get ticket and user info
  SELECT * INTO ticket_record FROM public.update_tickets WHERE id = NEW.ticket_id;
  SELECT * INTO user_record FROM public.users WHERE id = ticket_record.user_id;
  
  -- Get Supabase URL from environment (for calling edge function)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Fallback to hardcoded URL if not set
  IF supabase_url IS NULL THEN
    supabase_url := 'https://ovhuafsxhdbhaqccfpmt.supabase.co';
  END IF;
  
  IF NEW.is_admin THEN
    -- Admin sent message, notify the user
    -- 1. Create in-app notification
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      ticket_record.user_id,
      'ticket_reply',
      'New Reply on Your Ticket',
      'Admin replied to: ' || ticket_record.title,
      NEW.ticket_id::text
    );
    
    -- 2. Send email notification
    PERFORM extensions.http_post(
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
    -- User sent message, notify all admins
    user_name := COALESCE(user_record.business_name, user_record.full_name, user_record.email);
    
    -- 1. Create in-app notifications for admins
    PERFORM notify_admins(
      'ticket_reply',
      'New Ticket Reply',
      user_name || ' replied to: ' || ticket_record.title,
      NEW.ticket_id::text
    );
    
    -- 2. Send email notification to admin
    PERFORM extensions.http_post(
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
          'userName', user_name
        )
      )
    );
  END IF;

  -- Update last_message_at on ticket
  UPDATE public.update_tickets SET last_message_at = NOW() WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$;

-- Create the unified trigger
CREATE TRIGGER on_ticket_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_message();