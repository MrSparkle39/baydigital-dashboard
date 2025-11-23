-- Add image columns to blogmaker_posts
ALTER TABLE public.blogmaker_posts
ADD COLUMN main_image_url TEXT,
ADD COLUMN secondary_image_urls TEXT[];