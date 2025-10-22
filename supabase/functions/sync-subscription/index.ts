import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user's subscription ID
    const { data: userData, error: fetchError } = await supabaseClient
      .from('users')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (fetchError || !userData?.stripe_subscription_id) {
      throw new Error('No subscription found')
    }

    console.log('Syncing subscription:', userData.stripe_subscription_id)

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id)

    // Map Stripe status to our app statuses
    const stripeStatus = subscription.status
    const mappedStatus =
      stripeStatus === 'active' || stripeStatus === 'trialing' ? 'active' :
      stripeStatus === 'past_due' ? 'past_due' :
      stripeStatus === 'canceled' ? 'cancelled' :
      stripeStatus === 'unpaid' ? 'past_due' :
      stripeStatus === 'incomplete' ? 'pending' :
      'pending'

    // Update user with latest subscription data
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        subscription_status: mappedStatus,
        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      throw updateError
    }

    console.log('Subscription synced:', mappedStatus, 'Next billing:', new Date(subscription.current_period_end * 1000).toISOString())

    return new Response(
      JSON.stringify({
        success: true,
        status: mappedStatus,
        next_billing: new Date(subscription.current_period_end * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Sync error:', error)
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
