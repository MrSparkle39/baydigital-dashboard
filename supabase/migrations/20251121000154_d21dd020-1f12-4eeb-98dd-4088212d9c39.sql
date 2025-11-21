-- Create enum for blog post status
CREATE TYPE public.blog_post_status AS ENUM ('draft', 'published', 'failed');

-- Create blogmaker_posts table
CREATE TABLE public.blogmaker_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  body_html TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  topic TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'professional',
  language TEXT NOT NULL DEFAULT 'English',
  published_url TEXT,
  status public.blog_post_status DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_blogmaker_posts_user_id ON public.blogmaker_posts(user_id);
CREATE INDEX idx_blogmaker_posts_site_id ON public.blogmaker_posts(site_id);
CREATE INDEX idx_blogmaker_posts_status ON public.blogmaker_posts(status);
CREATE INDEX idx_blogmaker_posts_published_at ON public.blogmaker_posts(published_at);

-- Enable RLS
ALTER TABLE public.blogmaker_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own blog posts
CREATE POLICY "Users can view own blog posts"
  ON public.blogmaker_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own blog posts
CREATE POLICY "Users can create own blog posts"
  ON public.blogmaker_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own blog posts
CREATE POLICY "Users can update own blog posts"
  ON public.blogmaker_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own blog posts
CREATE POLICY "Users can delete own blog posts"
  ON public.blogmaker_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all blog posts
CREATE POLICY "Admins can view all blog posts"
  ON public.blogmaker_posts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all blog posts
CREATE POLICY "Admins can update all blog posts"
  ON public.blogmaker_posts
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_blogmaker_posts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_blogmaker_posts_timestamp
  BEFORE UPDATE ON public.blogmaker_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blogmaker_posts_updated_at();

-- Add netlify_site_id to sites table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sites' 
    AND column_name = 'netlify_site_id'
  ) THEN
    ALTER TABLE public.sites ADD COLUMN netlify_site_id TEXT;
  END IF;
END $$;