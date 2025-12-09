import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID')!
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET')!
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/facebook-oauth-callback`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // This contains our user_id
    const error = url.searchParams.get('error')

    if (error) {
      console.error('Facebook OAuth error:', error)
      // Redirect back to dashboard with error
      return Response.redirect(
        `${Deno.env.get('DASHBOARD_URL')}/social-media?error=${encodeURIComponent(error)}`,
        302
      )
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    console.log('Processing OAuth callback for user:', state)

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `code=${code}`
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange error:', errorData)
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    const shortLivedToken = tokenData.access_token

    console.log('Got short-lived token, exchanging for long-lived token...')

    // Exchange for long-lived token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `fb_exchange_token=${shortLivedToken}`
    )

    if (!longLivedResponse.ok) {
      const errorData = await longLivedResponse.text()
      console.error('Long-lived token error:', errorData)
      throw new Error('Failed to get long-lived token')
    }

    const longLivedData = await longLivedResponse.json()
    const accessToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in // Usually 60 days

    console.log('Got long-lived token, fetching user pages...')

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    )

    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch user pages')
    }

    const pagesData = await pagesResponse.json()
    const pages = pagesData.data || []

    if (pages.length === 0) {
      throw new Error('No Facebook Pages found. You need to be an admin of at least one Facebook Page.')
    }

    console.log(`Found ${pages.length} pages`)

    // For now, use the first page (in production, you'd let user choose)
    const page = pages[0]
    const pageAccessToken = page.access_token // Page token, not user token
    const pageId = page.id
    const pageName = page.name

    console.log('Using page:', pageName)

    // Check if page has Instagram connected
    let instagramAccountId = null
    let instagramUsername = null

    try {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
      )

      if (igResponse.ok) {
        const igData = await igResponse.json()
        if (igData.instagram_business_account) {
          instagramAccountId = igData.instagram_business_account.id

          // Get Instagram username
          const igDetailsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`
          )

          if (igDetailsResponse.ok) {
            const igDetails = await igDetailsResponse.json()
            instagramUsername = igDetails.username
            console.log('Found connected Instagram:', instagramUsername)
          }
        }
      }
    } catch (error) {
      console.log('No Instagram account connected:', error)
    }

    // Calculate token expiration
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn)

    // Save to database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: insertError } = await supabaseClient
      .from('social_media_connections')
      .upsert({
        user_id: state,
        platform: 'facebook',
        access_token: pageAccessToken,
        page_id: pageId,
        page_name: pageName,
        instagram_account_id: instagramAccountId,
        instagram_username: instagramUsername,
        token_expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'user_id,platform'
      })

    if (insertError) {
      console.error('Database error:', insertError)
      throw new Error('Failed to save connection to database')
    }

    console.log('Successfully saved connection to database')

    // Redirect back to dashboard with success
    return Response.redirect(
      `${Deno.env.get('DASHBOARD_URL')}/social-media?success=true&page=${encodeURIComponent(pageName)}`,
      302
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    
    // Redirect back to dashboard with error
    return Response.redirect(
      `${Deno.env.get('DASHBOARD_URL')}/social-media?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
      302
    )
  }
})