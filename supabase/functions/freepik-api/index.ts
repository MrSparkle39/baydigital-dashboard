import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const freepikApiKey = Deno.env.get('FREEPIK_API_KEY');
    if (!freepikApiKey) {
      throw new Error('FREEPIK_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'search': {
        const { query, page = 1, limit = 20, filters = {} } = params;
        
        // Use different endpoints for different content types
        let url;
        if (filters.type === 'icon') {
          // Icons have a separate endpoint
          url = `https://api.freepik.com/v1/icons?term=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
        } else {
          url = `https://api.freepik.com/v1/resources?term=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
          
          // Freepik API requires filters to be arrays - add [] to make them arrays
          if (filters.type && filters.type !== 'all' && filters.type !== 'icon') {
            url += `&filters[content_type][]=${filters.type}`;
          }
        }
        
        // Add common filters as arrays
        if (filters.orientation && filters.orientation !== 'all') {
          url += `&filters[orientation][]=${filters.orientation}`;
        }
        if (filters.license && filters.license !== 'all') {
          url += `&filters[license][]=${filters.license}`;
        }

        console.log('Freepik API request URL:', url);

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'x-freepik-api-key': freepikApiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Freepik API error response:', errorText);
          throw new Error(`Freepik API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'download': {
        const { resourceId, imageUrl } = params;

        // Check if user can download
        const { data: canDownload } = await supabaseClient
          .rpc('can_download_freepik', { user_id: user.id });

        if (!canDownload) {
          return new Response(
            JSON.stringify({ error: 'Download limit reached for this month' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Download image from Freepik
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to download image');
        }

        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const fileName = `freepik-${resourceId}-${Date.now()}.jpg`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('website-assets')
          .upload(`${user.id}/${fileName}`, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('website-assets')
          .getPublicUrl(`${user.id}/${fileName}`);

        // Save to website_assets table
        const { error: assetError } = await supabaseClient
          .from('website_assets')
          .insert({
            user_id: user.id,
            file_name: fileName,
            file_path: uploadData.path,
            asset_type: 'image',
            mime_type: 'image/jpeg',
            file_size: arrayBuffer.byteLength,
          });

        if (assetError) {
          console.error('Failed to save asset record:', assetError);
        }

        // Increment download counter
        const { data: userData } = await supabaseClient
          .from('users')
          .select('freepik_downloads_used')
          .eq('id', user.id)
          .single();

        await supabaseClient
          .from('users')
          .update({
            freepik_downloads_used: (userData?.freepik_downloads_used || 0) + 1,
          })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            fileName,
            publicUrl,
            path: uploadData.path 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'usage': {
        const { data: userData } = await supabaseClient
          .from('users')
          .select('freepik_downloads_used, plan')
          .eq('id', user.id)
          .single();

        const limit = userData?.plan === 'professional' ? 20 : 5;
        const used = userData?.freepik_downloads_used || 0;

        return new Response(
          JSON.stringify({ used, limit, remaining: limit - used }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in freepik-api:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
