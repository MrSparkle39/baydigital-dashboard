-- Migration: Email notification triggers for complete user journey
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. NEW USER SIGNUP - ADMIN EMAIL ALERT
-- Trigger when a new user is created after signup
CREATE OR REPLACE FUNCTION public.notify_new_user_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  business_name TEXT;
  plan_text TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id bigint;
BEGIN
  -- Get user details
  user_name := COALESCE(NEW.full_name, NEW.email);
  business_name := COALESCE(NEW.business_name, NEW.full_name, 'New Business');
  plan_text := CASE 
    WHEN NEW.plan = 'professional' THEN 'Professional ($49/mo)'
    WHEN NEW.plan = 'starter' THEN 'Starter ($29/mo)'
    WHEN NEW.plan = 'premium' THEN 'Premium ($99/mo)'
    ELSE 'Starter'
  END;
  
  -- Get Supabase configuration
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Fallback to hardcoded URL if not set
  IF supabase_url IS NULL THEN
    supabase_url := 'https://ovhuafsxhdbhaqccfpmt.supabase.co';
  END IF;
  
  -- Send email to admin
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', 'new_user_admin',
      'to', 'support@bay.digital',
      'data', jsonb_build_object(
        'userName', user_name,
        'userEmail', NEW.email,
        'businessName', business_name,
        'plan', plan_text
      )
    )
  ) INTO request_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user admin email
DROP TRIGGER IF EXISTS on_user_signup_admin_email ON public.users;
CREATE TRIGGER on_user_signup_admin_email
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user_admin_email();

-- 3. ONBOARDING COMPLETE - ADMIN EMAIL ALERT
-- Trigger when user completes onboarding
CREATE OR REPLACE FUNCTION public.notify_onboarding_complete_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  business_name TEXT;
  onboarding_summary TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id bigint;
BEGIN
  -- Only trigger if onboarding_complete changed from false to true
  IF OLD.onboarding_complete = false AND NEW.onboarding_complete = true THEN
    -- Get user details
    user_name := COALESCE(NEW.full_name, NEW.email);
    business_name := COALESCE(NEW.business_name, NEW.full_name, 'New Business');
    
    -- Build onboarding summary
    onboarding_summary := 'Business: ' || COALESCE(NEW.business_name, 'Not provided') || E'\n' ||
                          'Description: ' || COALESCE(NEW.business_description, 'Not provided') || E'\n' ||
                          'Address: ' || COALESCE(NEW.business_address, 'Not provided') || E'\n' ||
                          'Phone: ' || COALESCE(NEW.business_phone, 'Not provided') || E'\n' ||
                          'Hours: ' || COALESCE(NEW.business_hours, 'Not provided') || E'\n' ||
                          'Social Media: ' || COALESCE(NEW.social_media::text, 'Not provided') || E'\n' ||
                          'Brand Colors: ' || COALESCE(NEW.brand_colors::text, 'Not provided');
    
    -- Get Supabase configuration
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    IF supabase_url IS NULL THEN
      supabase_url := 'https://ovhuafsxhdbhaqccfpmt.supabase.co';
    END IF;
    
    -- Send email to admin
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'onboarding_complete_admin',
        'to', 'support@bay.digital',
        'data', jsonb_build_object(
          'userName', user_name,
          'businessName', business_name,
          'userEmail', NEW.email,
          'onboardingDetails', onboarding_summary
        )
      )
    ) INTO request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for onboarding complete
DROP TRIGGER IF EXISTS on_onboarding_complete_admin ON public.users;
CREATE TRIGGER on_onboarding_complete_admin
  AFTER UPDATE OF onboarding_complete ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onboarding_complete_admin();

-- 4. WEBSITE READY FOR REVIEW - USER EMAIL
-- Trigger when website_status changes to 'review'
CREATE OR REPLACE FUNCTION public.notify_site_ready_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  business_name TEXT;
  preview_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id bigint;
  site_url_value TEXT;
BEGIN
  -- Only trigger if status changed to 'review'
  IF NEW.website_status = 'review' AND (OLD.website_status IS NULL OR OLD.website_status != 'review') THEN
    -- Get user details
    user_name := COALESCE(NEW.full_name, NEW.email);
    business_name := COALESCE(NEW.business_name, NEW.full_name, 'Your Business');
    
    -- Get site URL from sites table if exists
    SELECT site_url INTO site_url_value FROM public.sites WHERE user_id = NEW.id LIMIT 1;
    preview_url := COALESCE(NEW.preview_url, site_url_value, NEW.website_url, 'https://preview.bay.digital/' || NEW.id);
    
    -- Get Supabase configuration
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    IF supabase_url IS NULL THEN
      supabase_url := 'https://ovhuafsxhdbhaqccfpmt.supabase.co';
    END IF;
    
    -- Send email to user
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'site_ready_review',
        'to', NEW.email,
        'data', jsonb_build_object(
          'userName', user_name,
          'businessName', business_name,
          'previewUrl', preview_url
        )
      )
    ) INTO request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for site ready review
DROP TRIGGER IF EXISTS on_site_ready_review ON public.users;
CREATE TRIGGER on_site_ready_review
  AFTER UPDATE OF website_status ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_site_ready_review();

-- 5. WEBSITE LAUNCHED - USER EMAIL
-- Trigger when website_status changes to 'live' or sites.status changes to 'live'
CREATE OR REPLACE FUNCTION public.notify_site_launched()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  business_name TEXT;
  site_url_value TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id bigint;
  user_record RECORD;
BEGIN
  -- Handle users table update
  IF TG_TABLE_NAME = 'users' THEN
    IF NEW.website_status = 'live' AND (OLD.website_status IS NULL OR OLD.website_status != 'live') THEN
      user_name := COALESCE(NEW.full_name, NEW.email);
      business_name := COALESCE(NEW.business_name, NEW.full_name, 'Your Business');
      
      -- Get site URL
      SELECT site_url INTO site_url_value FROM public.sites WHERE user_id = NEW.id LIMIT 1;
      site_url_value := COALESCE(NEW.website_url, site_url_value, 'https://yourbusiness.bay.digital');
      
      -- Get config
      supabase_url := current_setting('app.settings.supabase_url', true);
      service_role_key := current_setting('app.settings.service_role_key', true);
      
      IF supabase_url IS NULL THEN
        supabase_url := 'https://ovhuafsxhdbhaqccfpmt.supabase.co';
      END IF;
      
      -- Send email
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'site_launched',
          'to', NEW.email,
          'data', jsonb_build_object(
            'userName', user_name,
            'businessName', business_name,
            'siteUrl', site_url_value
          )
        )
      ) INTO request_id;
    END IF;
  END IF;
  
  -- Handle sites table update
  IF TG_TABLE_NAME = 'sites' THEN
    IF NEW.status = 'live' AND (OLD.status IS NULL OR OLD.status != 'live') THEN
      -- Get user info
      SELECT * INTO user_record FROM public.users WHERE id = NEW.user_id;
      
      user_name := COALESCE(user_record.full_name, user_record.email);
      business_name := COALESCE(user_record.business_name, user_record.full_name, NEW.site_name);
      site_url_value := NEW.site_url;
      
      -- Get config
      supabase_url := current_setting('app.settings.supabase_url', true);
      service_role_key := current_setting('app.settings.service_role_key', true);
      
      IF supabase_url IS NULL THEN
        supabase_url := 'https://ovhuafsxhdbhaqccfpmt.supabase.co';
      END IF;
      
      -- Send email
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'site_launched',
          'to', user_record.email,
          'data', jsonb_build_object(
            'userName', user_name,
            'businessName', business_name,
            'siteUrl', site_url_value
          )
        )
      ) INTO request_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for site launched
DROP TRIGGER IF EXISTS on_site_launched_users ON public.users;
CREATE TRIGGER on_site_launched_users
  AFTER UPDATE OF website_status ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_site_launched();

DROP TRIGGER IF EXISTS on_site_launched_sites ON public.sites;
CREATE TRIGGER on_site_launched_sites
  AFTER UPDATE OF status ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_site_launched();