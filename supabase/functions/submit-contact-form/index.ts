import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactFormSubmission {
  site_id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { site_id, name, email, phone, message }: ContactFormSubmission = await req.json();

    // Validate inputs
    if (!site_id || !name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: site_id, name, email, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths
    if (name.trim().length === 0 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Name must be between 1 and 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Email must be less than 255 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.trim().length === 0 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message must be between 1 and 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify site exists and is live
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, status')
      .eq('id', site_id)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: 'Invalid site ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (site.status !== 'live') {
      return new Response(
        JSON.stringify({ error: 'Site is not accepting submissions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the form submission
    const { data, error } = await supabase
      .from('form_submissions')
      .insert({
        site_id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        message: message.trim(),
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting form submission:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to submit form' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submitted successfully',
        submission_id: data.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-contact-form:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});