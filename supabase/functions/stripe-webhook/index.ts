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

        // Fetch the subscription to get current_period_end and status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        
        // Map Stripe status to our app statuses
        const stripeStatus = subscription.status
        const mappedStatus =
          stripeStatus === 'active' || stripeStatus === 'trialing' ? 'active' :
          stripeStatus === 'past_due' ? 'past_due' :
          stripeStatus === 'canceled' ? 'cancelled' :
          stripeStatus === 'unpaid' ? 'past_due' :
          stripeStatus === 'incomplete' ? 'pending' :
          'pending'
        
        // Update user with subscription details
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: mappedStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Error updating user:', updateError)
          throw updateError
        }

        console.log('User activated:', userId, 'Status:', mappedStatus, 'Next billing:', new Date(subscription.current_period_end * 1000).toISOString())

        // Get user details for email
        const { data: userDetails } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (userDetails) {
          // Send welcome email
          await supabaseAdmin.functions.invoke('send-email', {
            body: {
              type: 'welcome',
              to: userDetails.email,
              data: {
                userName: userDetails.full_name || 'there',
                userEmail: userDetails.email,
                dashboardUrl: 'https://dashboard.bay.digital'
              }
            }
          })
        }
        
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription event:', event.type, subscription.id)
        
        const userId = subscription.metadata?.user_id
        const customerId = subscription.customer as string | null

        if (!userId) {
          console.error('No user ID found in subscription metadata')
          break
        }

        // Map Stripe status to our app statuses
        const stripeStatus = subscription.status
        const mappedStatus =
          stripeStatus === 'active' || stripeStatus === 'trialing' ? 'active' :
          stripeStatus === 'past_due' ? 'past_due' :
          stripeStatus === 'canceled' ? 'cancelled' :
          stripeStatus === 'unpaid' ? 'past_due' :
          stripeStatus === 'incomplete' ? 'pending' :
          'pending'
        
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: mappedStatus,
            stripe_customer_id: customerId ?? undefined,
            stripe_subscription_id: subscription.id,
            subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          throw updateError
        }

        console.log('Subscription synced from', event.type, 'Status:', mappedStatus, 'Next billing:', new Date(subscription.current_period_end * 1000).toISOString())
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
        
        // Get user details for email
        const { data: cancelledUser } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (cancelledUser) {
          // Send subscription cancelled email to user
          await supabaseAdmin.functions.invoke('send-email', {
            body: {
              type: 'subscription_cancelled_user',
              to: cancelledUser.email,
              data: {
                userName: cancelledUser.full_name || cancelledUser.email
              }
            }
          })
        }
        
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
        
        // Send payment failed email
        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: 'payment_failed',
            to: userData.email,
            data: {
              userName: userData.email,
              paymentAmount: `$${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
              cardLast4: invoice.charge?.payment_method_details?.card?.last4 || '****'
            }
          }
        })
        
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