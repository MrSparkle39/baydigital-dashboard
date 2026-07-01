import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Domain registration — calls the whitelisted proxy (register-tic-test).
 *
 * The registrar endpoint is NOT working yet. This function returns a placeholder
 * response until the provider fix is in place. Swap USE_PLACEHOLDER to false and
 * uncomment the real fetch block when ready.
 *
 * SEQUENCING: only enable real registration after Stripe payment is verified
 * in domain-checkout — never register without confirmed payment.
 *
 * SECRET:
 *   supabase secrets set DOMAIN_PROXY_URL="http://209.38.20.229"
 */
interface RegisterRequest {
  domain: string;
  firstName: string;
  lastName: string;
  organisation?: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
  abn?: string;
  eligibilityType: string;
  /** Must be true — set only after verified Stripe payment (or mock in dev). */
  paymentVerified: boolean;
}

const USE_PLACEHOLDER = true;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RegisterRequest;

    if (!body.paymentVerified) {
      return json({ error: "Payment must be verified before registration." }, 402);
    }
    if (!body.domain?.trim()) {
      return json({ error: "Domain is required" }, 400);
    }

    if (USE_PLACEHOLDER) {
      return json(
        {
          status: "pending",
          message: "Registration endpoint pending provider fix",
          domain: body.domain.trim().toLowerCase(),
        },
        200,
      );
    }

    // --- Real registration (enable when register-tic-test is live) ---
    // const proxyBase = Deno.env.get("DOMAIN_PROXY_URL") ?? "http://209.38.20.229";
    // const registerUrl = `${proxyBase.replace(/\/$/, "")}/register-tic-test`;
    // const proxyRes = await fetch(registerUrl, {
    //   method: "GET", // or POST with registrant payload — confirm with proxy API
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(body),
    // });
    // const data = await proxyRes.json();
    // return json(data, proxyRes.ok ? 200 : 502);

    return json({ status: "pending", message: "Registration endpoint pending provider fix" }, 200);
  } catch (err) {
    console.error("domain-register error:", err);
    return json({ error: "Registration service error. Please try again." }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
