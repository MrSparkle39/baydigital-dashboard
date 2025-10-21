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

    // Parse request body
    const {
      email,
      password,
      priceId,
      businessName,
      industry,
      location,
      services,
      contactName,
      phone,
      businessPhone,
      businessEmail,
      plan,
      domain,
      additionalInfo
    } = await req.json()

    // Validate required fields
    if (!email || !password || !priceId) {
      throw new Error('Missing required fields: email, password, or priceId')
    }

    console.log('Creating account for:', email)

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: contactName,
        business_name: businessName,
        plan: plan,
        setup_complete: false
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw new Error(`Failed to create account: ${authError.message}`)
    }

    const userId = authData.user.id
    console.log('User created:', userId)

    // Step 2: Update user profile in database (trigger already created basic row)
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({
        full_name: contactName,
        business_name: businessName,
        industry,
        location,
        services,
        phone,
        business_phone: businessPhone,
        business_email: businessEmail,
        plan,
        subscription_status: 'pending', // Will be updated by webhook
        domain,
        additional_info: additionalInfo,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile error:', profileError)
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(`Failed to update profile: ${profileError.message}`)
    }

    console.log('Profile updated for user:', userId)

    // Step 3: Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: userId, // This links Stripe to Supabase user
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin') || 'https://bay.digital'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin') || 'https://bay.digital'}/contact.html?canceled=true`,
      metadata: {
        user_id: userId,
        business_name: businessName,
        plan: plan
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          business_name: businessName,
          plan: plan
        }
      }
    })

    console.log('Checkout session created:', session.id)

    // Return the checkout URL
    return new Response(
      JSON.stringify({ url: session.url }),
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
