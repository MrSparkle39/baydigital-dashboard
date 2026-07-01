import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * LIVE domain availability check — calls the whitelisted proxy server.
 *
 * This is NOT the same as `check-domain`, which is a public MOCK used by the
 * marketing site (/domains). Use this function from the /domains/purchase flow.
 *
 * Accepts a bare name (e.g. "theinclusioncrew") and checks multiple TLDs in parallel,
 * or a full domain (e.g. "theinclusioncrew.com.au") for a single check.
 *
 * SECRET — set via Supabase Edge Function secrets (never in client code):
 *   supabase secrets set DOMAIN_PROXY_URL="http://209.38.20.229"
 */
interface CheckRequest {
  /** Search input — bare name or full domain */
  query?: string;
  /** @deprecated use query — kept for backwards compatibility */
  domain?: string;
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

export interface DomainCheckResultItem {
  domain: string;
  available: boolean;
  status: string;
  costPrice: number | null;
  premium: boolean;
  raw?: ProxyRaw;
  error?: string;
}

/** TLDs checked when user enters a bare name (order preserved in results). */
const SEARCH_TLDS = [".com.au", ".au", ".com", ".net.au", ".org.au", ".digital", ".net", ".io"] as const;

/** Max parallel proxy calls per batch — avoids hammering the proxy. */
const PROXY_CONCURRENCY = 4;

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain);
}

function isBareName(input: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(input) && !input.includes(".");
}

async function checkOneDomain(domain: string, proxyBase: string): Promise<DomainCheckResultItem> {
  try {
    const checkUrl = `${proxyBase.replace(/\/$/, "")}/check?domain=${encodeURIComponent(domain)}`;
    const proxyRes = await fetch(checkUrl, { method: "GET" });

    if (!proxyRes.ok) {
      console.error("domain-check-live proxy error:", domain, proxyRes.status);
      return {
        domain,
        available: false,
        status: "error",
        costPrice: null,
        premium: false,
        error: "Check failed",
      };
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

    return {
      domain,
      available,
      status: raw.status ?? (available ? "available" : "unavailable"),
      costPrice: typeof raw.costPrice === "number" ? raw.costPrice : null,
      premium: Boolean(raw.premium),
      raw,
    };
  } catch (err) {
    console.error("domain-check-live check error:", domain, err);
    return {
      domain,
      available: false,
      status: "error",
      costPrice: null,
      premium: false,
      error: "Check failed",
    };
  }
}

/** Run checks in batches to cap concurrent proxy requests. */
async function checkDomainsBatched(
  domains: string[],
  proxyBase: string,
): Promise<DomainCheckResultItem[]> {
  const results: DomainCheckResultItem[] = [];

  for (let i = 0; i < domains.length; i += PROXY_CONCURRENCY) {
    const batch = domains.slice(i, i + PROXY_CONCURRENCY);
    const batchResults = await Promise.all(batch.map((d) => checkOneDomain(d, proxyBase)));
    results.push(...batchResults);
  }

  return results;
}

function sortResults(results: DomainCheckResultItem[]): DomainCheckResultItem[] {
  return [...results].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return 0;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as CheckRequest;
    const input = (body?.query ?? body?.domain ?? "").trim().toLowerCase();

    if (!input) {
      return json({ error: "Please enter a domain name to search" }, 400);
    }

    const proxyBase = Deno.env.get("DOMAIN_PROXY_URL") ?? "http://209.38.20.229";

    let mode: "multi" | "single";
    let domainsToCheck: string[];

    if (isBareName(input)) {
      mode = "multi";
      domainsToCheck = SEARCH_TLDS.map((tld) => `${input}${tld}`);
    } else if (isValidDomain(input)) {
      mode = "single";
      domainsToCheck = [input];
    } else {
      return json(
        { error: "Please enter a valid name (e.g. yourbusiness) or full domain (e.g. yourbusiness.com.au)" },
        400,
      );
    }

    const results = sortResults(await checkDomainsBatched(domainsToCheck, proxyBase));

    return json({ query: input, mode, results }, 200);
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
