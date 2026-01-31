-- Add scheduling columns to social_media_posts
ALTER TABLE public.social_media_posts 
ADD COLUMN scheduled_at timestamp with time zone DEFAULT NULL,
ADD COLUMN scheduled_time_slot text DEFAULT NULL;

-- Update status to allow 'scheduled' value (already text, just documenting)
COMMENT ON COLUMN public.social_media_posts.status IS 'Status: draft, scheduled, published, failed';

-- Create index for efficient cron job queries
CREATE INDEX idx_social_media_posts_scheduled 
ON public.social_media_posts (scheduled_at, status) 
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;