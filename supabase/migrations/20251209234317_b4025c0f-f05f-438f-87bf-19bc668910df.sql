-- Create social_media_connections table
CREATE TABLE IF NOT EXISTS public.social_media_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    access_token TEXT NOT NULL,
    page_id TEXT,
    page_name TEXT,
    instagram_account_id TEXT,
    instagram_username TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Create social_media_posts table
CREATE TABLE IF NOT EXISTS public.social_media_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    post_text TEXT NOT NULL,
    image_url TEXT,
    headline TEXT,
    platforms TEXT[] NOT NULL,
    facebook_post_id TEXT,
    facebook_post_url TEXT,
    instagram_post_id TEXT,
    instagram_post_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed')),
    error_message TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.social_media_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_media_connections
CREATE POLICY "Users can view their own connections"
    ON public.social_media_connections
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
    ON public.social_media_connections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
    ON public.social_media_connections
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
    ON public.social_media_connections
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for social_media_posts
CREATE POLICY "Users can view their own posts"
    ON public.social_media_posts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
    ON public.social_media_posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
    ON public.social_media_posts
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
    ON public.social_media_posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Admin policies for social_media_connections
CREATE POLICY "Admins can view all connections"
    ON public.social_media_connections
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all connections"
    ON public.social_media_connections
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for social_media_posts
CREATE POLICY "Admins can view all posts"
    ON public.social_media_posts
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all posts"
    ON public.social_media_posts
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_social_media_connections_user_id ON public.social_media_connections(user_id);
CREATE INDEX idx_social_media_posts_user_id ON public.social_media_posts(user_id);
CREATE INDEX idx_social_media_posts_status ON public.social_media_posts(status);
CREATE INDEX idx_social_media_posts_created_at ON public.social_media_posts(created_at DESC);

-- Add updated_at triggers
CREATE TRIGGER update_social_media_connections_updated_at
    BEFORE UPDATE ON public.social_media_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_posts_updated_at
    BEFORE UPDATE ON public.social_media_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();