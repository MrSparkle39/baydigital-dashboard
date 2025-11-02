-- Add onboarding_complete column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Add additional onboarding-related columns needed by the form
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS business_size text,
ADD COLUMN IF NOT EXISTS service_area text,
ADD COLUMN IF NOT EXISTS years_in_business text,
ADD COLUMN IF NOT EXISTS top_services text,
ADD COLUMN IF NOT EXISTS pricing_strategy text,
ADD COLUMN IF NOT EXISTS emergency_service boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS certifications text,
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS brand_style text,
ADD COLUMN IF NOT EXISTS example_websites text,
ADD COLUMN IF NOT EXISTS competitor_websites text,
ADD COLUMN IF NOT EXISTS emergency_phone text,
ADD COLUMN IF NOT EXISTS preferred_contact_method text,
ADD COLUMN IF NOT EXISTS website_features jsonb,
ADD COLUMN IF NOT EXISTS target_keywords text,
ADD COLUMN IF NOT EXISTS unique_selling_points text,
ADD COLUMN IF NOT EXISTS special_offers text,
ADD COLUMN IF NOT EXISTS monthly_goals text,
ADD COLUMN IF NOT EXISTS existing_domain text,
ADD COLUMN IF NOT EXISTS existing_website text,
ADD COLUMN IF NOT EXISTS needs_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS business_objectives text[],
ADD COLUMN IF NOT EXISTS competitor_analysis text,
ADD COLUMN IF NOT EXISTS newsletter_signup boolean DEFAULT false;