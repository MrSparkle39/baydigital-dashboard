-- Add last_message_at to update_tickets
ALTER TABLE update_tickets ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- Create ticket_message_reads table
CREATE TABLE IF NOT EXISTS public.ticket_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES update_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

-- Enable RLS on ticket_message_reads
ALTER TABLE public.ticket_message_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_message_reads
CREATE POLICY "Users can view own read status"
  ON ticket_message_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read status"
  ON ticket_message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read status"
  ON ticket_message_reads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all read status"
  ON ticket_message_reads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert all read status"
  ON ticket_message_reads FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all read status"
  ON ticket_message_reads FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send email notifications
CREATE OR REPLACE FUNCTION notify_ticket_message()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_ticket_message_created ON ticket_messages;
CREATE TRIGGER on_ticket_message_created
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_message();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ticket_message_reads_ticket_user ON ticket_message_reads(ticket_id, user_id);
CREATE INDEX IF NOT EXISTS idx_update_tickets_last_message ON update_tickets(last_message_at DESC);