import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { session_id } = await req.json()

    if (!session_id) {
      throw new Error('Missing session_id')
    }

    console.log('Verifying checkout session:', session_id)

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (!session.client_reference_id) {
      throw new Error('No user ID found in session')
    }

    const userId = session.client_reference_id

    // Verify the user exists and get their email and name
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    console.log('Checkout verified for user:', userData.email)

    // Generate a session token for automatic login
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
    })

    if (sessionError) {
      console.error('Failed to generate session:', sessionError)
      throw new Error('Failed to generate login session')
    }

    console.log('Session generated for user:', userData.email)

    // Send welcome email
    try {
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          to: userData.email,
          data: {
            userName: userData.full_name || 'there',
            userEmail: userData.email,
            dashboardUrl: 'https://dashboard.bay.digital'
          }
        }
      })
      console.log('Welcome email sent to:', userData.email)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't throw - we still want to complete the checkout verification
    }

    // Return the session data and redirect URL
    return new Response(
      JSON.stringify({ 
        success: true,
        email: userData.email,
        session: sessionData,
        redirectUrl: '/onboarding'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
