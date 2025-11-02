-- Create storage bucket for onboarding files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('onboarding-files', 'onboarding-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for onboarding files uploads
CREATE POLICY "Users can upload their own onboarding files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'onboarding-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own onboarding files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'onboarding-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own onboarding files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'onboarding-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own onboarding files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'onboarding-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all onboarding files
CREATE POLICY "Admins can view all onboarding files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'onboarding-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);