-- Drop and recreate the trigger function with proper ticket ID in link
DROP TRIGGER IF EXISTS on_ticket_message_notification ON public.ticket_messages;
DROP FUNCTION IF EXISTS public.notify_ticket_message_notification();

-- Improved trigger function for new ticket messages with ticket ID in link
CREATE OR REPLACE FUNCTION public.notify_ticket_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  user_name TEXT;
BEGIN
  SELECT * INTO ticket_record FROM public.update_tickets WHERE id = NEW.ticket_id;
  
  IF NEW.is_admin THEN
    -- Admin sent message, notify the user with ticket ID in link
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      ticket_record.user_id,
      'ticket_reply',
      'New Reply on Your Ticket',
      'Admin replied to: ' || ticket_record.title,
      NEW.ticket_id::text  -- Store ticket ID as the link so NotificationBell can navigate properly
    );
  ELSE
    -- User sent message, notify all admins
    SELECT COALESCE(business_name, full_name, email) INTO user_name
    FROM public.users WHERE id = NEW.user_id;
    
    PERFORM notify_admins(
      'ticket_reply',
      'New Ticket Reply',
      user_name || ' replied to: ' || ticket_record.title,
      NEW.ticket_id::text  -- Store ticket ID as the link
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_ticket_message_notification
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_message_notification();

-- Also update the new ticket trigger to include ticket ID in link
DROP TRIGGER IF EXISTS on_ticket_created ON public.update_tickets;
DROP FUNCTION IF EXISTS public.notify_new_ticket();

CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
BEGIN
  SELECT COALESCE(business_name, full_name, email) INTO user_name
  FROM public.users WHERE id = NEW.user_id;
  
  PERFORM notify_admins(
    'new_ticket',
    'New Support Ticket',
    user_name || ' created a new ticket: ' || NEW.title,
    NEW.id::text  -- Store ticket ID as the link
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.update_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_ticket();

-- Update ticket status change trigger to include ticket ID
DROP TRIGGER IF EXISTS on_ticket_status_change ON public.update_tickets;
DROP FUNCTION IF EXISTS public.notify_ticket_status_change();

CREATE OR REPLACE FUNCTION public.notify_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'ticket_status',
      'Ticket Status Updated',
      'Your ticket "' || NEW.title || '" status changed to: ' || NEW.status,
      NEW.id::text  -- Store ticket ID as the link
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_status_change
  AFTER UPDATE OF status ON public.update_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_change();