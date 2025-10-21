import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )

    console.log('Webhook event received:', event.type)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout completed for session:', session.id)
        
        const userId = session.client_reference_id || session.metadata?.user_id
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!userId) {
          console.error('No user ID found in session')
          break
        }

        // Update user with subscription details
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_start_date: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Error updating user:', updateError)
          throw updateError
        }

        console.log('User activated:', userId)

        // TODO: Send welcome email with login credentials
        
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', subscription.id)
        
        const userId = subscription.metadata?.user_id

        if (!userId) {
          console.error('No user ID found in subscription metadata')
          break
        }

        // Update subscription status
        const status = subscription.status === 'active' ? 'active' : 'inactive'
        
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: status,
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Error updating subscription status:', updateError)
          throw updateError
        }

        console.log('Subscription status updated:', status)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription cancelled:', subscription.id)
        
        const userId = subscription.metadata?.user_id

        if (!userId) {
          console.error('No user ID found in subscription metadata')
          break
        }

        // Mark subscription as cancelled
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'cancelled',
            subscription_end_date: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Error cancelling subscription:', updateError)
          throw updateError
        }

        console.log('Subscription cancelled for user:', userId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Payment failed for invoice:', invoice.id)
        
        const customerId = invoice.customer as string

        // Find user by Stripe customer ID
        const { data: userData, error: findError } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single()

        if (findError || !userData) {
          console.error('User not found for customer:', customerId)
          break
        }

        // Update subscription status to past_due
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', userData.id)

        if (updateError) {
          console.error('Error updating payment status:', updateError)
          throw updateError
        }

        console.log('Payment failed for user:', userData.id)
        
        // TODO: Send payment failed email
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})