import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GITHUB_ACCESS_TOKEN = Deno.env.get('GITHUB_ACCESS_TOKEN')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { blogPost, topic, tone, language } = await req.json()

    const { data: sites, error: sitesError } = await supabaseClient
      .from('sites')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)

    if (sitesError || !sites || sites.length === 0) {
      throw new Error('No site found for user')
    }

    const site = sites[0]

    // TODO: Generate HTML using the templates from generate-blog-post
    // TODO: Commit to GitHub using the same logic as before
    // TODO: Save to database with image URLs
    
    const publishedUrl = `https://${site.site_url}/blog/${blogPost.slug}.html`

    return new Response(
      JSON.stringify({
        success: true,
        published_url: publishedUrl,
        title: blogPost.title,
        slug: blogPost.slug,
        message: 'Blog post committed to GitHub. Netlify will deploy in ~30-60 seconds.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
