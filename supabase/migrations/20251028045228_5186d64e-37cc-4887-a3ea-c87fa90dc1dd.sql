-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can upload files to their own ticket folders
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can view their own ticket attachments
CREATE POLICY "Users can view own ticket attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Admins can view all ticket attachments
CREATE POLICY "Admins can view all ticket attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy: Users can delete their own ticket attachments
CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);