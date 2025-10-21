import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stripeSecretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // For now, we'll parse without signature verification
    // You'll need to add webhook secret for production
    const event = JSON.parse(body);
    
    console.log('Received Stripe event:', event.type);

    // Handle subscription events
    if (event.type === 'customer.subscription.created' || 
        event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;
      
      // Get the price to determine the plan
      const priceId = subscription.items.data[0]?.price.id;
      
      // Map Stripe price IDs to your plan names
      // You'll need to update these with your actual Stripe price IDs
      let plan = 'starter';
      const amount = subscription.items.data[0]?.price.unit_amount / 100;
      
      if (amount >= 99) {
        plan = 'premium';
      } else if (amount >= 49) {
        plan = 'professional';
      }

      console.log(`Updating customer ${customerId} to plan: ${plan}`);

      // Update the user in your database
      const { error } = await supabase
        .from('users')
        .update({
          stripe_customer_id: customerId,
          plan: status === 'active' ? plan : 'starter',
        })
        .eq('stripe_customer_id', customerId);

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      console.log('Successfully updated user plan');
    }

    // Handle subscription deletion
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      console.log(`Downgrading customer ${customerId} to starter plan`);

      const { error } = await supabase
        .from('users')
        .update({ plan: 'starter' })
        .eq('stripe_customer_id', customerId);

      if (error) {
        console.error('Error downgrading user:', error);
        throw error;
      }

      console.log('Successfully downgraded user to starter');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});