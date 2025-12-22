import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to download image and upload to Supabase storage
// Returns both the public URL and the file path for cleanup
async function getPublicImageUrl(imageUrl: string, supabaseClient: any, userId: string): Promise<{ publicUrl: string, filePath: string | null }> {
  // If it's already a Supabase storage URL, return as-is (no cleanup needed)
  if (imageUrl.includes('supabase.co/storage')) {
    return { publicUrl: imageUrl, filePath: null }
  }
  
  // If it's a base64 data URL, decode and upload
  if (imageUrl.startsWith('data:image')) {
    console.log('Processing base64 image...')
    const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid base64 image format')
    }
    const ext = matches[1]
    const base64Data = matches[2]
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    
    const fileName = `social-post-${Date.now()}.${ext}`
    const filePath = `${userId}/${fileName}`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('social-media-images')
      .upload(filePath, binaryData, {
        contentType: `image/${ext}`,
        upsert: false
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }
    
    const { data: { publicUrl } } = supabaseClient.storage
      .from('social-media-images')
      .getPublicUrl(filePath)
    
    console.log('Uploaded base64 image to:', publicUrl)
    return { publicUrl, filePath }
  }
  
  // For external URLs (like Freepik), download and re-upload
  console.log('Downloading external image from:', imageUrl)
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const imageBlob = await response.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    
    const fileName = `social-post-${Date.now()}.${ext}`
    const filePath = `${userId}/${fileName}`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('social-media-images')
      .upload(filePath, arrayBuffer, {
        contentType: contentType,
        upsert: false
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }
    
    const { data: { publicUrl } } = supabaseClient.storage
      .from('social-media-images')
      .getPublicUrl(filePath)
    
    console.log('Re-uploaded image to Supabase:', publicUrl)
    return { publicUrl, filePath }
  } catch (error) {
    console.error('Error processing image:', error)
    // Return original URL as fallback (might work for Facebook)
    return { publicUrl: imageUrl, filePath: null }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Use service role key for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { postText, imageUrl, headline, platforms } = await req.json()

    if (!postText || !platforms || platforms.length === 0) {
      throw new Error('Post text and platforms are required')
    }

    // Instagram requires an image
    if (platforms.includes('instagram') && !imageUrl) {
      throw new Error('Instagram posts require an image')
    }

    console.log('Posting to platforms:', platforms, 'with image:', !!imageUrl)
    
    // If posting to Instagram, we need a publicly accessible image URL
    let publicImageUrl = imageUrl
    let tempFilePath: string | null = null
    
    if (imageUrl && platforms.includes('instagram')) {
      console.log('Processing image for Instagram...')
      const imageResult = await getPublicImageUrl(imageUrl, supabaseAdmin, user.id)
      publicImageUrl = imageResult.publicUrl
      tempFilePath = imageResult.filePath
      console.log('Public image URL:', publicImageUrl)
    }

    // Get user's social media connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('social_media_connections')
      .select('*')
      .eq('user_id', user.id)

    if (connectionsError) {
      throw new Error('Failed to fetch social media connections')
    }

    if (!connections || connections.length === 0) {
      throw new Error('No social media accounts connected. Please connect your Facebook/Instagram account first.')
    }

    const results: any = {
      success: true,
      facebook: null,
      instagram: null
    }

    // Post to Facebook
    if (platforms.includes('facebook')) {
      const fbConnection = connections.find(c => c.platform === 'facebook')
      
      if (!fbConnection) {
        results.facebook = { error: 'Facebook account not connected' }
      } else {
        try {
          console.log('Posting to Facebook Page:', fbConnection.page_id)
          
          let fbResponse;
          
          if (imageUrl) {
            // Post with image using /photos endpoint
            fbResponse = await fetch(
              `https://graph.facebook.com/v18.0/${fbConnection.page_id}/photos`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: imageUrl,
                  caption: postText,
                  access_token: fbConnection.access_token
                })
              }
            )
          } else {
            // Text-only post using /feed endpoint
            fbResponse = await fetch(
              `https://graph.facebook.com/v18.0/${fbConnection.page_id}/feed`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: postText,
                  access_token: fbConnection.access_token
                })
              }
            )
          }

          if (!fbResponse.ok) {
            const errorData = await fbResponse.json()
            console.error('Facebook API error:', errorData)
            throw new Error(errorData.error?.message || 'Failed to post to Facebook')
          }

          const fbData = await fbResponse.json()
          results.facebook = {
            success: true,
            post_id: fbData.id,
            post_url: `https://www.facebook.com/${fbData.id}`
          }

          console.log('Successfully posted to Facebook:', fbData.id)
        } catch (error) {
          console.error('Facebook posting error:', error)
          results.facebook = {
            error: error instanceof Error ? error.message : 'Failed to post to Facebook'
          }
          results.success = false
        }
      }
    }

    // Post to Instagram
    if (platforms.includes('instagram')) {
      const igConnection = connections.find(c => c.platform === 'facebook' && c.instagram_account_id)
      
      if (!igConnection || !igConnection.instagram_account_id) {
        results.instagram = { error: 'Instagram account not connected to Facebook Page' }
      } else {
        try {
          console.log('Posting to Instagram:', igConnection.instagram_account_id)
          console.log('Using image URL:', publicImageUrl)
          
          // Step 1: Create media container
          const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igConnection.instagram_account_id}/media`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image_url: publicImageUrl,
                caption: postText,
                access_token: igConnection.access_token
              })
            }
          )

          if (!containerResponse.ok) {
            const errorData = await containerResponse.json()
            console.error('Instagram container creation error:', errorData)
            throw new Error(errorData.error?.message || 'Failed to create Instagram media container')
          }

          const containerData = await containerResponse.json()
          const creationId = containerData.id

          console.log('Created Instagram container:', creationId)

          // Step 2: Publish the container
          const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igConnection.instagram_account_id}/media_publish`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                creation_id: creationId,
                access_token: igConnection.access_token
              })
            }
          )

          if (!publishResponse.ok) {
            const errorData = await publishResponse.json()
            console.error('Instagram publish error:', errorData)
            throw new Error(errorData.error?.message || 'Failed to publish to Instagram')
          }

          const publishData = await publishResponse.json()
          results.instagram = {
            success: true,
            post_id: publishData.id,
            post_url: `https://www.instagram.com/p/${publishData.id}`
          }

          console.log('Successfully posted to Instagram:', publishData.id)
        } catch (error) {
          console.error('Instagram posting error:', error)
          results.instagram = {
            error: error instanceof Error ? error.message : 'Failed to post to Instagram'
          }
          results.success = false
        }
      }
    }

    // Save post to database (store original imageUrl, not the temp one)
    const { error: insertError } = await supabaseClient.from('social_media_posts').insert({
      user_id: user.id,
      post_text: postText,
      image_url: imageUrl, // Store original URL, not temp storage URL
      headline: headline,
      platforms: platforms,
      facebook_post_id: results.facebook?.post_id || null,
      facebook_post_url: results.facebook?.post_url || null,
      instagram_post_id: results.instagram?.post_id || null,
      instagram_post_url: results.instagram?.post_url || null,
      status: results.success ? 'published' : 'failed',
      error_message: !results.success ? JSON.stringify(results) : null,
      published_at: results.success ? new Date().toISOString() : null
    })

    if (insertError) {
      console.error('Failed to save post to database:', insertError)
    }

    // Cleanup: Delete temporary image from storage after posting
    if (tempFilePath) {
      console.log('Cleaning up temporary image:', tempFilePath)
      const { error: deleteError } = await supabaseAdmin.storage
        .from('social-media-images')
        .remove([tempFilePath])
      
      if (deleteError) {
        console.error('Failed to delete temporary image:', deleteError)
        // Don't throw - posting was successful, cleanup failure is not critical
      } else {
        console.log('Successfully deleted temporary image')
      }
    }

    return new Response(
      JSON.stringify(results),
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
