-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Add missing fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_hours TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS social_media JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS brand_colors JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS content_pages JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_files TEXT[];

-- Add last_read_message_id to ticket_message_reads
ALTER TABLE public.ticket_message_reads ADD COLUMN IF NOT EXISTS last_read_message_id UUID REFERENCES public.ticket_messages(id);

-- Function to notify admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_link TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT user_id, notification_type, notification_title, notification_message, notification_link
  FROM public.user_roles
  WHERE role = 'admin';
END;
$$;

-- Trigger function for new user signups
CREATE OR REPLACE FUNCTION public.notify_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    'new_user',
    'New User Signup',
    'New user ' || COALESCE(NEW.business_name, NEW.full_name, NEW.email) || ' has signed up',
    '/admin/users/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_signup
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user_signup();

-- Trigger function for new tickets
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
    '/admin/tickets'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.update_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_ticket();

-- Trigger function for new ticket messages
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
    -- Admin sent message, notify the user
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      ticket_record.user_id,
      'ticket_reply',
      'New Reply on Your Ticket',
      'Admin replied to: ' || ticket_record.title,
      '/dashboard'
    );
  ELSE
    -- User sent message, notify all admins
    SELECT COALESCE(business_name, full_name, email) INTO user_name
    FROM public.users WHERE id = NEW.user_id;
    
    PERFORM notify_admins(
      'ticket_reply',
      'New Ticket Reply',
      user_name || ' replied to: ' || ticket_record.title,
      '/admin/tickets'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_message_notification
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_message_notification();

-- Trigger function for ticket status changes
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
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_status_change
  AFTER UPDATE ON public.update_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_change();