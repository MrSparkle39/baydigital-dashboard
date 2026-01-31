-- Create user_domains table to track domain provisioning for each user
CREATE TABLE public.user_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  resend_domain_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, dns_required, verifying, verified, failed
  receiving_enabled BOOLEAN DEFAULT false,
  dns_records JSONB, -- Store the DNS records returned by Resend
  region TEXT DEFAULT 'us-east-1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  last_verification_attempt TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  UNIQUE(domain)
);

-- Enable RLS
ALTER TABLE public.user_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own domains
CREATE POLICY "Users can view own domains"
ON public.user_domains
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own domains
CREATE POLICY "Users can insert own domains"
ON public.user_domains
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own domains
CREATE POLICY "Users can update own domains"
ON public.user_domains
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all domains
CREATE POLICY "Admins can view all domains"
ON public.user_domains
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all domains
CREATE POLICY "Admins can update all domains"
ON public.user_domains
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert domains for any user
CREATE POLICY "Admins can insert domains"
ON public.user_domains
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_user_domains_updated_at
BEFORE UPDATE ON public.user_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();