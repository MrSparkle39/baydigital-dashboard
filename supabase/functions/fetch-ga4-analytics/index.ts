import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyId, startDate, endDate } = await req.json();
    
    if (!propertyId) {
      throw new Error('GA4 Property ID is required');
    }

    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('Google service account key not configured');
    }

    const credentials = JSON.parse(serviceAccountKey);
    
    // Get access token
    const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = btoa(JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }));

    const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
    
    // Import the private key
    const pemKey = credentials.private_key;
    const pemContents = pemKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const jwt = `${jwtHeader}.${jwtClaimSet}.${base64Signature}`;

    // Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token error:', error);
      throw new Error('Failed to get access token');
    }

    const { access_token } = await tokenResponse.json();

    // Use 28 days to match GA4 default
    const dateRange = { startDate: startDate || "28daysAgo", endDate: endDate || "today" };

    // Run separate queries to avoid double-counting
    // Query 1: Overall metrics
    const overallResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "sessions" },
            { name: "averageSessionDuration" },
            { name: "engagementRate" }
          ],
        }),
      }
    );

    if (!overallResponse.ok) {
      const error = await overallResponse.text();
      console.error('Overall metrics error:', error);
      throw new Error('Failed to fetch overall metrics');
    }

    const overallData = await overallResponse.json();
    
    const totalVisitors = parseInt(overallData.rows?.[0]?.metricValues[0]?.value || '0');
    const totalPageViews = parseInt(overallData.rows?.[0]?.metricValues[1]?.value || '0');
    const totalSessions = parseInt(overallData.rows?.[0]?.metricValues[2]?.value || '0');
    const avgSessionDuration = Math.round(parseFloat(overallData.rows?.[0]?.metricValues[3]?.value || '0'));
    const avgEngagementRate = Math.round(parseFloat(overallData.rows?.[0]?.metricValues[4]?.value || '0') * 1000) / 10;

    // Query 2: Top pages
    const pagesResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 10,
        }),
      }
    );

    const pagesData = await pagesResponse.json();
    const topPages = pagesData.rows?.map((row: any) => ({
      page: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value || '0'),
    })) || [];

    // Query 3: Traffic sources
    const sourcesResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        }),
      }
    );

    const sourcesData = await sourcesResponse.json();
    const trafficSources = sourcesData.rows?.map((row: any) => ({
      source: row.dimensionValues[0].value,
      visitors: parseInt(row.metricValues[0].value || '0'),
    })) || [];

    // Query 4: Device breakdown
    const devicesResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),
      }
    );

    const devicesData = await devicesResponse.json();
    const devices = devicesData.rows?.map((row: any) => ({
      device: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || '0'),
    })) || [];

    // Query 5: Top countries
    const countriesResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [dateRange],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        }),
      }
    );

    const countriesData = await countriesResponse.json();
    const topCountries = countriesData.rows?.map((row: any) => ({
      country: row.dimensionValues[0].value,
      visitors: parseInt(row.metricValues[0].value || '0'),
    })) || [];

    return new Response(
      JSON.stringify({
        visitors: totalVisitors,
        pageViews: totalPageViews,
        sessions: totalSessions,
        avgSessionDuration,
        engagementRate: avgEngagementRate,
        topPages,
        trafficSources,
        devices,
        topCountries,
        dateRange: "Last 28 days",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in fetch-ga4-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
