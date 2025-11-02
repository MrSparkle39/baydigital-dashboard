// Supabase Edge Function: check-onboarding-reminders
// This should be set up as a cron job to run daily

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface User {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  onboarding_complete: boolean;
  onboarding_step: number;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const seventyTwoHoursAgo = new Date(now.getTime() - (72 * 60 * 60 * 1000));

    // Find users who signed up 24 hours ago and haven't completed onboarding
    const { data: users24h, error: error24h } = await supabase
      .from('users')
      .select('*')
      .eq('onboarding_complete', false)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .lt('created_at', new Date(twentyFourHoursAgo.getTime() + (60 * 60 * 1000)).toISOString()); // 24h window

    if (error24h) throw error24h;

    // Find users who signed up 72 hours ago and STILL haven't completed onboarding
    const { data: users72h, error: error72h } = await supabase
      .from('users')
      .select('*')
      .eq('onboarding_complete', false)
      .gte('created_at', seventyTwoHoursAgo.toISOString())
      .lt('created_at', new Date(seventyTwoHoursAgo.getTime() + (60 * 60 * 1000)).toISOString()); // 72h window

    if (error72h) throw error72h;

    const results = {
      reminders_24h: 0,
      reminders_72h: 0,
      errors: [] as string[]
    };

    // Send 24-hour reminders
    for (const user of users24h || []) {
      try {
        const userName = user.full_name || user.email;
        const onboardingProgress = `You've completed ${user.onboarding_step || 0} of 6 steps`;

        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            type: 'onboarding_reminder_24h',
            to: user.email,
            data: {
              userName,
              onboardingProgress
            }
          })
        });

        if (!response.ok) {
          const error = await response.text();
          results.errors.push(`24h reminder failed for ${user.email}: ${error}`);
        } else {
          results.reminders_24h++;
        }
      } catch (err) {
        results.errors.push(`24h reminder error for ${user.email}: ${err.message}`);
      }
    }

    // Send 72-hour (urgent) reminders
    for (const user of users72h || []) {
      try {
        const userName = user.full_name || user.email;

        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            type: 'onboarding_reminder_72h',
            to: user.email,
            data: {
              userName
            }
          })
        });

        if (!response.ok) {
          const error = await response.text();
          results.errors.push(`72h reminder failed for ${user.email}: ${error}`);
        } else {
          results.reminders_72h++;
        }
      } catch (err) {
        results.errors.push(`72h reminder error for ${user.email}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in check-onboarding-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
