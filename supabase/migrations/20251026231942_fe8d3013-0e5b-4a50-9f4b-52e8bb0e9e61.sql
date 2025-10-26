-- Add 'contacted' status to submission_status enum
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'contacted';