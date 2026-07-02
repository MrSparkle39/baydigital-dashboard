import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Domain TLD pricing table — proxies Synergy pricing via DOMAIN_PROXY_URL/pricing.
 *
 * Pricing changes infrequently; cached in-memory for CACHE_TTL_MS to avoid hammering the proxy.
 *
 * SECRET:
 *   supabase secrets set DOMAIN_PROXY_URL="http://209.38.20.229"
 *
 * Proxy /pricing (you add separately) should return an array of TLD rows, e.g.:
 *   { tld, minPeriod, maxPeriod, register_1_year, register_2_year, renew, sale? }
 */
export interface TldPricingRow {
  tld: string;
  minPeriod: number;
  maxPeriod: number;
  register_1_year: number;
  register_2_year: number;
  renew: number;
  sale?: { register_1_year?: number };
}

interface PricingCache {
  pricing: TldPricingRow[];
  fetchedAt: number;
}

/** 1 hour — pricing tables rarely change intraday. */
const CACHE_TTL_MS = 60 * 60 * 1000;

let cache: PricingCache | null = null;

function normalizeTld(tld: string): string {
  const t = tld.trim().toLowerCase();
  return t.startsWith(".") ? t : `.${t}`;
}

function normalizePricingRow(raw: Record<string, unknown>): TldPricingRow | null {
  const tld = typeof raw.tld === "string" ? normalizeTld(raw.tld) : null;
  if (!tld) return null;

  const saleRaw = raw.sale as Record<string, unknown> | undefined;
  const sale =
    saleRaw && typeof saleRaw.register_1_year === "number"
      ? { register_1_year: saleRaw.register_1_year }
      : undefined;

  return {
    tld,
    minPeriod: typeof raw.minPeriod === "number" ? raw.minPeriod : 1,
    maxPeriod: typeof raw.maxPeriod === "number" ? raw.maxPeriod : 10,
    register_1_year: typeof raw.register_1_year === "number" ? raw.register_1_year : 0,
    register_2_year: typeof raw.register_2_year === "number" ? raw.register_2_year : 0,
    renew: typeof raw.renew === "number" ? raw.renew : 0,
    sale,
  };
}

async function fetchPricingFromProxy(proxyBase: string): Promise<TldPricingRow[]> {
  const url = `${proxyBase.replace(/\/$/, "")}/pricing`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    throw new Error(`Proxy /pricing returned ${res.status}`);
  }

  const data = await res.json();

  // Accept bare array or { pricing: [...] }
  const rows: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.pricing) ? data.pricing : [];

  return rows
    .map((row) => normalizePricingRow(row as Record<string, unknown>))
    .filter((row): row is TldPricingRow => row !== null);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return json(
        {
          pricing: cache.pricing,
          cached: true,
          available: true,
          fetchedAt: cache.fetchedAt,
        },
        200,
      );
    }

    const proxyBase = Deno.env.get("DOMAIN_PROXY_URL") ?? "http://209.38.20.229";

    try {
      const pricing = await fetchPricingFromProxy(proxyBase);
      cache = { pricing, fetchedAt: now };

      return json(
        {
          pricing,
          cached: false,
          available: true,
          fetchedAt: now,
        },
        200,
      );
    } catch (proxyErr) {
      console.error("domain-pricing proxy unavailable:", proxyErr);

      // Return stale cache if we have it, even past TTL
      if (cache) {
        return json(
          {
            pricing: cache.pricing,
            cached: true,
            available: true,
            stale: true,
            fetchedAt: cache.fetchedAt,
            warning: "Using cached pricing — live pricing endpoint temporarily unavailable.",
          },
          200,
        );
      }

      return json(
        {
          pricing: [],
          cached: false,
          available: false,
          error: "Pricing endpoint not available yet. Frontend will fall back to check prices.",
        },
        200,
      );
    }
  } catch (err) {
    console.error("domain-pricing error:", err);
    return json({ error: "Could not load domain pricing." }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
