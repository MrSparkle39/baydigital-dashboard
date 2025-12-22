-- Email System Tables

-- Email aliases (hello@, sales@, support@ etc per user)
CREATE TABLE IF NOT EXISTS email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alias VARCHAR(100) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias, domain)
);

-- Email threads (groups related emails together)
CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alias_id UUID REFERENCES email_aliases(id) ON DELETE CASCADE,
  subject VARCHAR(500),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 1,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_trash BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual emails
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES email_threads(id) ON DELETE CASCADE,
  alias_id UUID REFERENCES email_aliases(id) ON DELETE SET NULL,
  
  from_address VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  reply_to VARCHAR(255),
  
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  
  message_id VARCHAR(255),
  in_reply_to VARCHAR(255),
  email_references TEXT[],
  
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'sent', 'draft', 'failed')),
  
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  resend_id VARCHAR(255)
);

-- Email attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes INTEGER,
  storage_path VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_alias_id ON emails(alias_id);
CREATE INDEX IF NOT EXISTS idx_emails_direction ON emails(direction);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_alias_id ON email_threads(alias_id);
CREATE INDEX IF NOT EXISTS idx_email_aliases_user_id ON email_aliases(user_id);
CREATE INDEX IF NOT EXISTS idx_email_aliases_domain ON email_aliases(domain);

-- RLS Policies
ALTER TABLE email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own aliases" ON email_aliases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own aliases" ON email_aliases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own aliases" ON email_aliases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own aliases" ON email_aliases FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own threads" ON email_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own threads" ON email_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads" ON email_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads" ON email_threads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own emails" ON emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emails" ON emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emails" ON emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emails" ON emails FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own attachments" ON email_attachments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.user_id = auth.uid()));
CREATE POLICY "Users can insert own attachments" ON email_attachments FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.user_id = auth.uid()));

-- Admin policies
CREATE POLICY "Admins can view all aliases" ON email_aliases FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all threads" ON email_threads FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all emails" ON emails FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert emails" ON emails FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to update thread on new email
CREATE OR REPLACE FUNCTION update_thread_on_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE email_threads 
    SET 
      last_message_at = COALESCE(NEW.sent_at, NEW.received_at, NOW()),
      message_count = message_count + 1,
      is_read = CASE WHEN NEW.direction = 'inbound' THEN false ELSE is_read END,
      updated_at = NOW()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_thread_on_email
AFTER INSERT ON emails
FOR EACH ROW
EXECUTE FUNCTION update_thread_on_email();