import { supabase } from "@/integrations/supabase/client";
import type { DomainPriceDisplay, TldPricingRow } from "@/types/domain-purchase";

const CACHE_KEY = "bay_domain_pricing_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PricingCacheEntry {
  pricing: TldPricingRow[];
  fetchedAt: number;
}

let memoryCache: PricingCacheEntry | null = null;

function readLocalCache(): PricingCacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PricingCacheEntry;
    if (!Array.isArray(parsed.pricing) || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalCache(entry: PricingCacheEntry): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota / private mode
  }
}

function isFresh(entry: PricingCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/** Extract TLD from a full domain, e.g. "foo.com.au" → ".com.au" */
export function extractTldFromDomain(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  if (parts.length < 2) return "";

  const auSecondLevel = new Set(["com", "net", "org", "edu", "gov", "asn", "id"]);
  if (parts.length >= 3 && parts[parts.length - 1] === "au" && auSecondLevel.has(parts[parts.length - 2])) {
    return `.${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  }

  return `.${parts[parts.length - 1]}`;
}

function normalizeTld(tld: string): string {
  const t = tld.trim().toLowerCase();
  return t.startsWith(".") ? t : `.${t}`;
}

function findTldPricing(pricing: TldPricingRow[], domain: string): TldPricingRow | undefined {
  const tld = extractTldFromDomain(domain);
  if (!tld) return undefined;
  return pricing.find((row) => normalizeTld(row.tld) === tld);
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Build customer-facing price copy for a domain result.
 * Never returns a bare price without a period label.
 */
export function buildDomainPriceDisplay(
  domain: string,
  pricingTable: TldPricingRow[],
  fallbackCostPrice: number | null,
): DomainPriceDisplay {
  const row = findTldPricing(pricingTable, domain);

  if (!row) {
    if (fallbackCostPrice != null) {
      return {
        registrationAmount: fallbackCostPrice,
        registrationYears: 1,
        registrationLabel: `${formatMoney(fallbackCostPrice)} (1 year, estimated)`,
        renewalLabel: null,
        saleLabel: null,
        isFallback: true,
        fallbackNote: "Detailed term pricing pending — shown from availability check.",
      };
    }
    return {
      registrationAmount: null,
      registrationYears: 1,
      registrationLabel: "Price on request",
      renewalLabel: null,
      saleLabel: null,
      isFallback: true,
      fallbackNote: "Pricing table unavailable for this extension.",
    };
  }

  const minYears = Math.max(1, row.minPeriod || 1);
  let registrationAmount: number;
  let registrationYears: number;

  if (minYears >= 2 && row.register_2_year > 0) {
    registrationAmount = row.register_2_year;
    registrationYears = 2;
  } else if (minYears >= 2 && row.register_1_year > 0) {
    registrationAmount = row.register_1_year * minYears;
    registrationYears = minYears;
  } else {
    registrationAmount = row.register_1_year;
    registrationYears = 1;
  }

  const registrationLabel =
    registrationYears === 1
      ? `${formatMoney(registrationAmount)}/year`
      : `${formatMoney(registrationAmount)} for ${registrationYears} years (min.)`;

  const renewalLabel = row.renew > 0 ? `renews at ${formatMoney(row.renew)}/year` : null;

  let saleLabel: string | null = null;
  if (row.sale?.register_1_year != null && row.sale.register_1_year > 0) {
    const salePrice = row.sale.register_1_year;
    if (minYears === 1) {
      saleLabel = `${formatMoney(salePrice)} first year, then ${formatMoney(row.register_1_year)}/year`;
    } else {
      saleLabel = `${formatMoney(salePrice)} promo (1st year), min. ${registrationYears}-year registration applies`;
    }
  }

  return {
    registrationAmount,
    registrationYears,
    registrationLabel,
    renewalLabel,
    saleLabel,
    isFallback: false,
    fallbackNote: null,
  };
}

/** Fetch pricing table with memory + localStorage cache. */
export async function fetchDomainPricingTable(): Promise<{
  pricing: TldPricingRow[];
  fromCache: boolean;
  available: boolean;
}> {
  if (memoryCache && isFresh(memoryCache)) {
    return { pricing: memoryCache.pricing, fromCache: true, available: memoryCache.pricing.length > 0 };
  }

  const local = readLocalCache();
  if (local && isFresh(local)) {
    memoryCache = local;
    return { pricing: local.pricing, fromCache: true, available: local.pricing.length > 0 };
  }

  const { data, error } = await supabase.functions.invoke("domain-pricing", { body: {} });
  if (error) {
    if (local) {
      memoryCache = local;
      return { pricing: local.pricing, fromCache: true, available: local.pricing.length > 0 };
    }
    return { pricing: [], fromCache: false, available: false };
  }

  const pricing = (data?.pricing ?? []) as TldPricingRow[];
  const available = Boolean(data?.available) && pricing.length > 0;

  if (pricing.length > 0) {
    const entry: PricingCacheEntry = { pricing, fetchedAt: Date.now() };
    memoryCache = entry;
    writeLocalCache(entry);
  } else if (local) {
    memoryCache = local;
    return { pricing: local.pricing, fromCache: true, available: local.pricing.length > 0 };
  }

  return { pricing, fromCache: false, available };
}
