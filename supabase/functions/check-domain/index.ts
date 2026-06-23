import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckDomainRequest {
  domain: string;
}

// ---------------------------------------------------------------------------
// Synergy Wholesale integration (NOT yet enabled).
//
// This function currently returns a MOCK availability response so the /domains
// page is usable today. When ready to go live with real domain availability,
// implement `checkWithSynergy()` below and flip USE_SYNERGY to true.
//
// SECRETS — set these as Supabase Edge Function secrets (NEVER in client code):
//   supabase secrets set SYNERGY_RESELLER_ID="..."
//   supabase secrets set SYNERGY_API_KEY="..."
//   supabase secrets set SYNERGY_PIN="..."
//
// Read them server-side only, e.g.:
//   const resellerId = Deno.env.get("SYNERGY_RESELLER_ID");
//   const apiKey      = Deno.env.get("SYNERGY_API_KEY");
//   const pin         = Deno.env.get("SYNERGY_PIN");
//
// TODO(synergy): Confirm the exact Synergy Wholesale endpoint + action for
//   domain availability from their API docs. As of writing it is the JSON/REST
//   reseller API with an action such as `domainAvailable` / `checkDomain`.
//   Endpoint base is typically: https://api.synergywholesale.com
//
// TODO(synergy): IP WHITELISTING. Synergy locks the API to whitelisted IPs.
//   Supabase Edge Functions do NOT have a stable static outbound IP, so calls
//   from here may be rejected. Options to resolve before going live:
//     1. Ask Synergy to allow the relevant egress range (may not be supported).
//     2. Proxy the request through a service with a static IP
//        (e.g. a small VPS / Cloudflare Worker with a fixed IP / a NAT gateway)
//        and call Synergy from there.
//     3. Use a paid static-IP egress add-on.
//   Decide on this before enabling USE_SYNERGY.
// ---------------------------------------------------------------------------

const USE_SYNERGY = false;

async function checkWithSynergy(domain: string): Promise<{ available: boolean }> {
  // TODO(synergy): Replace this stub with a real Synergy Wholesale API call.
  //
  // const resellerId = Deno.env.get("SYNERGY_RESELLER_ID");
  // const apiKey = Deno.env.get("SYNERGY_API_KEY");
  // const pin = Deno.env.get("SYNERGY_PIN");
  // if (!resellerId || !apiKey || !pin) {
  //   throw new Error("Synergy credentials are not configured");
  // }
  //
  // const res = await fetch("https://api.synergywholesale.com/", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     resellerID: resellerId,
  //     apiKey,
  //     pin, // TODO(synergy): confirm exact auth field names from docs
  //     command: "domainAvailable", // TODO(synergy): confirm action name
  //     domainName: domain,
  //   }),
  // });
  // const data = await res.json();
  // // TODO(synergy): map Synergy's response shape to { available: boolean }
  // return { available: data.status === "available" };

  throw new Error("Synergy integration not implemented yet");
}

/**
 * Mock availability check used until Synergy is wired up.
 * Rule: any domain containing "taken" is unavailable; otherwise available.
 */
function checkWithMock(domain: string): { available: boolean } {
  return { available: !domain.toLowerCase().includes("taken") };
}

function isValidDomain(domain: string): boolean {
  // Basic shape check: label(.label)+ — lets through .com, .com.au, .net.au, etc.
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as CheckDomainRequest;
    const domain = (body?.domain ?? "").trim().toLowerCase();

    if (!domain) {
      return json({ error: "Domain is required" }, 400);
    }
    if (domain.length > 253 || !isValidDomain(domain)) {
      return json({ error: "Please enter a valid domain, e.g. yourbusiness.com.au" }, 400);
    }

    const { available } = USE_SYNERGY
      ? await checkWithSynergy(domain)
      : checkWithMock(domain);

    return json({ available, domain }, 200);
  } catch (err) {
    console.error("check-domain error:", err);
    return json({ error: "We couldn't check that domain right now. Please try again." }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
