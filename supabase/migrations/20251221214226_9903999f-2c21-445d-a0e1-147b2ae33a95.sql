-- Create public storage bucket for social media images
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-images', 'social-media-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload their own social media images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own social media images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own social media images"
ON storage.objects FOR DELETE
USING (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access since bucket is public
CREATE POLICY "Public read access for social media images"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media-images');