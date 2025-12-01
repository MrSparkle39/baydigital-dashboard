-- Add ga4_measurement_id column to users table
ALTER TABLE public.users 
ADD COLUMN ga4_measurement_id text;