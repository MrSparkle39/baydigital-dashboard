import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * LIVE domain availability check — calls the whitelisted proxy server.
 *
 * This is NOT the same as `check-domain`, which is a public MOCK used by the
 * marketing site (/domains). Use this function only from the authenticated
 * dashboard purchase flow.
 *
 * SECRET — set via Supabase Edge Function secrets (never in client code):
 *   supabase secrets set DOMAIN_PROXY_URL="http://209.38.20.229"
 */
interface CheckRequest {
  domain: string;
}

interface ProxyRaw {
  available?: boolean;
  status?: string;
  costPrice?: number;
  premium?: boolean;
  [key: string]: unknown;
}

interface ProxyResponse {
  raw?: ProxyRaw;
}

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as CheckRequest;
    const domain = (body?.domain ?? "").trim().toLowerCase();

    if (!domain) {
      return json({ error: "Domain is required" }, 400);
    }
    if (domain.length > 253 || !isValidDomain(domain)) {
      return json({ error: "Please enter a valid domain, e.g. yourbusiness.com.au" }, 400);
    }

    const proxyBase = Deno.env.get("DOMAIN_PROXY_URL") ?? "http://209.38.20.229";
    const checkUrl = `${proxyBase.replace(/\/$/, "")}/check?domain=${encodeURIComponent(domain)}`;

    const proxyRes = await fetch(checkUrl, { method: "GET" });
    if (!proxyRes.ok) {
      console.error("domain-check-live proxy error:", proxyRes.status, await proxyRes.text());
      return json({ error: "Domain check service unavailable. Please try again." }, 502);
    }

    const proxyData = (await proxyRes.json()) as ProxyResponse;
    const raw = proxyData.raw ?? {};

    const statusStr = typeof raw.status === "string" ? raw.status.toLowerCase() : "";
    const available =
      typeof raw.available === "boolean"
        ? raw.available
        : typeof raw.available === "number"
          ? raw.available === 1
          : statusStr === "available";

    return json(
      {
        domain,
        available,
        status: raw.status ?? (available ? "available" : "unavailable"),
        costPrice: typeof raw.costPrice === "number" ? raw.costPrice : null,
        premium: Boolean(raw.premium),
        raw,
      },
      200,
    );
  } catch (err) {
    console.error("domain-check-live error:", err);
    return json({ error: "We couldn't check that domain right now. Please try again." }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
