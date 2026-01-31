-- Enable the pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the process-scheduled-posts function to run every 5 minutes
SELECT cron.schedule(
  'process-scheduled-posts',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ovhuafsxhdbhaqccfpmt.supabase.co/functions/v1/process-scheduled-posts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHVhZnN4aGRiaGFxY2NmcG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODI3MzEsImV4cCI6MjA3NjQ1ODczMX0.77yad25rXps5TMvxRdnRTUAp6m1T1veJGUZxYHAyR6o"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);