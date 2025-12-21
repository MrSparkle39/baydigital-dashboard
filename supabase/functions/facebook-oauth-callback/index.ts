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

    // First, let's debug what permissions we actually have
    const debugResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`
    )
    if (debugResponse.ok) {
      const debugData = await debugResponse.json()
      console.log('Granted permissions:', JSON.stringify(debugData.data))
    }

    // Try Method 1: Standard /me/accounts (works for personal pages)
    let pages: any[] = []
    
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,tasks&access_token=${accessToken}`
    )
    const pagesData = await pagesResponse.json()
    console.log('Pages API (/me/accounts) response:', JSON.stringify(pagesData))
    
    if (pagesResponse.ok && pagesData.data && pagesData.data.length > 0) {
      pages = pagesData.data
    }

    // Try Method 2: If no pages found, try fetching via Business accounts
    if (pages.length === 0) {
      console.log('No pages from /me/accounts, trying /me/businesses...')
      
      const businessResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?fields=id,name,owned_pages{id,name,access_token,category,tasks}&access_token=${accessToken}`
      )
      const businessData = await businessResponse.json()
      console.log('Business API response:', JSON.stringify(businessData))
      
      if (businessResponse.ok && businessData.data) {
        for (const business of businessData.data) {
          console.log(`Checking business: ${business.name} (${business.id})`)
          if (business.owned_pages && business.owned_pages.data) {
            pages.push(...business.owned_pages.data)
          }
        }
      }
    }

    // Try Method 3: Query businesses directly for client_pages
    if (pages.length === 0) {
      console.log('No pages from businesses.owned_pages, trying client_pages...')
      
      const businessResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?fields=id,name&access_token=${accessToken}`
      )
      const businessData = await businessResponse.json()
      
      if (businessResponse.ok && businessData.data) {
        for (const business of businessData.data) {
          // Try to get pages this user has access to via the business
          const bizPagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/${business.id}/client_pages?fields=id,name,access_token,category&access_token=${accessToken}`
          )
          const bizPagesData = await bizPagesResponse.json()
          console.log(`Business ${business.name} client_pages:`, JSON.stringify(bizPagesData))
          
          if (bizPagesResponse.ok && bizPagesData.data) {
            pages.push(...bizPagesData.data)
          }
        }
      }
    }

    // Get user info for error message
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
    )
    const userData = await userResponse.json()
    console.log('User data:', JSON.stringify(userData))

    if (pages.length === 0) {
      throw new Error(
        'No Facebook Pages found. Your page may be owned by a Business Portfolio. ' +
        'Please ensure: 1) You have added the Bay Digital app to your Business Portfolio in Meta Business Settings, ' +
        '2) You have assigned the page to the app, OR ' +
        '3) Try creating a Page directly from your personal Facebook account (not through Business Suite).'
      )
    }

    console.log(`Found ${pages.length} pages:`, pages.map((p: any) => p.name).join(', '))

    // For now, use the first page (in production, you'd let user choose)
    const page = pages[0]
    
    // If page doesn't have access_token, we need to get one
    let pageAccessToken = page.access_token
    if (!pageAccessToken) {
      console.log('Page has no access_token, attempting to get one...')
      // Try to get page access token using the user token
      const pageTokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=access_token&access_token=${accessToken}`
      )
      const pageTokenData = await pageTokenResponse.json()
      console.log('Page token response:', JSON.stringify(pageTokenData))
      pageAccessToken = pageTokenData.access_token || accessToken
    }
    
    const pageId = page.id
    const pageName = page.name

    console.log('Using page:', pageName, 'with tasks:', page.tasks)

    // Check if page has Instagram connected
    let instagramAccountId = null
    let instagramUsername = null

    try {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
      )

      if (igResponse.ok) {
        const igData = await igResponse.json()
        console.log('Instagram check response:', JSON.stringify(igData))
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
