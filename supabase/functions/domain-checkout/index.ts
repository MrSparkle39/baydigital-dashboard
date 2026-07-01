import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Domain purchase — Stripe checkout (stubbed).
 *
 * SECRET — when going live, replace STRIPE_KEY_PLACEHOLDER with:
 *   supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
 *
 * SEQUENCING: real Stripe payment must be wired and verified BEFORE the real
 * register call is enabled in domain-register, so domains are never registered
 * without payment.
 */
interface CheckoutRequest {
  action: "create-session" | "mock-success";
  domain?: string;
  costPrice?: number | null;
}

const USE_MOCK_PAYMENT = true;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as CheckoutRequest;

    if (body.action === "mock-success") {
      if (!USE_MOCK_PAYMENT) {
        return json({ error: "Mock payment is disabled." }, 403);
      }
      // Mock path only — does NOT call Stripe and does NOT trigger registration.
      return json(
        {
          mock: true,
          paymentVerified: true,
          message: "Mock payment successful (development only — no charge was made).",
        },
        200,
      );
    }

    if (body.action === "create-session") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "STRIPE_KEY_PLACEHOLDER";

      if (stripeKey === "STRIPE_KEY_PLACEHOLDER" || !stripeKey.startsWith("sk_")) {
        return json(
          {
            configured: false,
            error: "Stripe is not configured yet. Set STRIPE_SECRET_KEY in Edge Function secrets.",
          },
          503,
        );
      }

      // TODO: Wire real Stripe Checkout Session when ready.
      // const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      // const session = await stripe.checkout.sessions.create({ ... });
      // return json({ configured: true, url: session.url, sessionId: session.id }, 200);

      return json({ error: "Stripe session creation not implemented yet." }, 501);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("domain-checkout error:", err);
    return json({ error: "Payment service error. Please try again." }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
