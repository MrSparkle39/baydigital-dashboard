-- Drop the existing status check constraint
ALTER TABLE public.social_media_posts DROP CONSTRAINT social_media_posts_status_check;

-- Add new check constraint that includes 'scheduled' and 'processing' statuses
ALTER TABLE public.social_media_posts ADD CONSTRAINT social_media_posts_status_check 
  CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'processing'::text, 'published'::text, 'failed'::text]));