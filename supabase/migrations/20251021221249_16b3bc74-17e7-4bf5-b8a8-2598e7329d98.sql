-- Add new fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS services TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS additional_info TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pending' CHECK (subscription_status IN ('pending', 'active', 'past_due', 'cancelled', 'inactive'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website_status TEXT DEFAULT 'pending' CHECK (website_status IN ('pending', 'in_progress', 'review', 'live'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create update_tickets table
CREATE TABLE IF NOT EXISTS public.update_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  admin_notes TEXT,
  assigned_to TEXT
);

-- Create website_assets table
CREATE TABLE IF NOT EXISTS public.website_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'photo', 'document', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on new tables
ALTER TABLE public.update_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_assets ENABLE ROW LEVEL SECURITY;

-- Update tickets RLS policies
CREATE POLICY "Users can view own tickets" 
  ON public.update_tickets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets" 
  ON public.update_tickets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" 
  ON public.update_tickets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Website assets RLS policies
CREATE POLICY "Users can view own assets" 
  ON public.website_assets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own assets" 
  ON public.website_assets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets" 
  ON public.website_assets 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.update_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.update_tickets(status);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.website_assets(user_id);

-- Create storage bucket for website assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-assets', 'website-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'website-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'website-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'website-assets' AND (storage.foldername(name))[1] = auth.uid()::text);