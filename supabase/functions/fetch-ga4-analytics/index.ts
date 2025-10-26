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

    // Fetch analytics data
    const analyticsResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: startDate || "30daysAgo", endDate: endDate || "today" }],
          dimensions: [
            { name: "pagePath" },
            { name: "sessionSource" },
            { name: "deviceCategory" },
            { name: "country" }
          ],
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

    if (!analyticsResponse.ok) {
      const error = await analyticsResponse.text();
      console.error('Analytics API error:', error);
      throw new Error('Failed to fetch analytics data');
    }

    const analyticsData = await analyticsResponse.json();

    // Process the data
    let totalVisitors = 0;
    let totalPageViews = 0;
    let totalSessions = 0;
    let totalEngagementTime = 0;
    let totalEngagementRate = 0;
    let rowCount = 0;
    
    const topPagesMap = new Map<string, number>();
    const trafficSourcesMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const countryMap = new Map<string, number>();

    analyticsData.rows?.forEach((row: any) => {
      const pagePath = row.dimensionValues[0].value;
      const source = row.dimensionValues[1].value;
      const device = row.dimensionValues[2].value;
      const country = row.dimensionValues[3].value;
      
      const visitors = parseInt(row.metricValues[0].value || '0');
      const pageViews = parseInt(row.metricValues[1].value || '0');
      const sessions = parseInt(row.metricValues[2].value || '0');
      const avgSessionDuration = parseFloat(row.metricValues[3].value || '0');
      const engagementRate = parseFloat(row.metricValues[4].value || '0');

      totalVisitors += visitors;
      totalPageViews += pageViews;
      totalSessions += sessions;
      totalEngagementTime += avgSessionDuration * sessions;
      totalEngagementRate += engagementRate;
      rowCount++;

      // Aggregate page views by path
      topPagesMap.set(pagePath, (topPagesMap.get(pagePath) || 0) + pageViews);
      
      // Aggregate by traffic source
      trafficSourcesMap.set(source, (trafficSourcesMap.get(source) || 0) + visitors);
      
      // Aggregate by device
      deviceMap.set(device, (deviceMap.get(device) || 0) + sessions);
      
      // Aggregate by country
      countryMap.set(country, (countryMap.get(country) || 0) + visitors);
    });

    // Format top pages
    const topPages = Array.from(topPagesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    // Format traffic sources
    const trafficSources = Array.from(trafficSourcesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, visitors]) => ({ source, visitors }));
      
    // Format devices
    const devices = Array.from(deviceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([device, sessions]) => ({ device, sessions }));
      
    // Format countries
    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, visitors]) => ({ country, visitors }));
      
    // Calculate averages
    const avgSessionDuration = totalSessions > 0 ? totalEngagementTime / totalSessions : 0;
    const avgEngagementRate = rowCount > 0 ? (totalEngagementRate / rowCount) * 100 : 0;

    return new Response(
      JSON.stringify({
        visitors: totalVisitors,
        pageViews: totalPageViews,
        sessions: totalSessions,
        avgSessionDuration: Math.round(avgSessionDuration),
        engagementRate: Math.round(avgEngagementRate * 10) / 10,
        topPages,
        trafficSources,
        devices,
        topCountries,
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
