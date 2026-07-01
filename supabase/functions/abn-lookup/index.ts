import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * ABN Lookup — proxies the Australian Business Register web services API.
 * The browser must never call ABR directly; all requests go through here.
 *
 * SECRET — register for a free GUID at https://abr.business.gov.au/Tools/WebServices
 *   supabase secrets set ABN_LOOKUP_GUID="your-guid-here"
 */
interface AbnRequest {
  abn: string;
}

interface AbrDetails {
  Abn?: string;
  AbnStatus?: string;
  EntityName?: string;
  EntityTypeName?: string;
  EntityTypeCode?: string;
  Message?: string;
}

function normalizeAbn(input: string): string {
  return input.replace(/\s/g, "");
}

function isValidAbn(abn: string): boolean {
  return /^\d{11}$/.test(abn);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as AbnRequest;
    const abn = normalizeAbn(body?.abn ?? "");

    if (!abn) {
      return json({ error: "ABN is required" }, 400);
    }
    if (!isValidAbn(abn)) {
      return json({ error: "Please enter a valid 11-digit ABN" }, 400);
    }

    // TODO: Replace with Deno.env.get("ABN_LOOKUP_GUID") once you have registered.
    const guid = Deno.env.get("ABN_LOOKUP_GUID") ?? "ABN_LOOKUP_GUID_PLACEHOLDER";
    if (guid === "ABN_LOOKUP_GUID_PLACEHOLDER") {
      return json(
        {
          error: "ABN Lookup is not configured yet. Set ABN_LOOKUP_GUID in Edge Function secrets.",
          configured: false,
        },
        503,
      );
    }

    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${encodeURIComponent(guid)}`;
    const abrRes = await fetch(url);
    if (!abrRes.ok) {
      console.error("abn-lookup ABR error:", abrRes.status);
      return json({ error: "ABN Lookup service unavailable. Please try again." }, 502);
    }

    const text = await abrRes.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return json({ error: "Unexpected response from ABN Lookup." }, 502);
    }

    const details = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as AbrDetails;

    if (details.Message) {
      return json({ error: details.Message, abn }, 404);
    }

    return json(
      {
        abn: details.Abn ?? abn,
        entityName: details.EntityName ?? "",
        entityTypeName: details.EntityTypeName ?? "",
        entityTypeCode: details.EntityTypeCode ?? "",
        abnStatus: details.AbnStatus ?? "",
      },
      200,
    );
  } catch (err) {
    console.error("abn-lookup error:", err);
    return json({ error: "We couldn't look up that ABN right now. Please try again." }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
