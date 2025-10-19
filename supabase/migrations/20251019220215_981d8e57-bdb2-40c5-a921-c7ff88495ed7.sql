-- Create enum for user plans
CREATE TYPE public.user_plan AS ENUM ('starter', 'professional', 'premium');

-- Create enum for site status
CREATE TYPE public.site_status AS ENUM ('live', 'building', 'maintenance');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create enum for submission status
CREATE TYPE public.submission_status AS ENUM ('new', 'read');

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan public.user_plan NOT NULL DEFAULT 'starter',
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Create sites table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  site_url TEXT NOT NULL,
  site_name TEXT NOT NULL,
  status public.site_status NOT NULL DEFAULT 'building',
  launched_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Users can view their own sites
CREATE POLICY "Users can view own sites"
  ON public.sites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create analytics table
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  visitors INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  top_pages JSONB,
  traffic_sources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Users can view analytics for their own sites
CREATE POLICY "Users can view own analytics"
  ON public.analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = analytics.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Create form_submissions table
CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.submission_status DEFAULT 'new',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view submissions for their own sites
CREATE POLICY "Users can view own submissions"
  ON public.form_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = form_submissions.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Users can update submissions for their own sites
CREATE POLICY "Users can update own submissions"
  ON public.form_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = form_submissions.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Create change_requests table
CREATE TABLE public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  file_urls TEXT[],
  status public.request_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own change requests
CREATE POLICY "Users can view own requests"
  ON public.change_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own change requests
CREATE POLICY "Users can create own requests"
  ON public.change_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  VALUES (
    NEW.id,
    NEW.email,
    'starter'
  );
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();