-- Add file_urls column to update_tickets to store attachment paths
ALTER TABLE public.update_tickets
ADD COLUMN IF NOT EXISTS file_urls text[] DEFAULT ARRAY[]::text[];

-- Optional: backfill default to empty array for existing rows
UPDATE public.update_tickets SET file_urls = COALESCE(file_urls, ARRAY[]::text[]);
