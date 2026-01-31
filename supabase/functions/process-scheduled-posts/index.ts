import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to download image and upload to Supabase storage
async function getPublicImageUrl(imageUrl: string, supabaseClient: any, userId: string): Promise<{ publicUrl: string, filePath: string | null }> {
  if (imageUrl.includes('supabase.co/storage')) {
    return { publicUrl: imageUrl, filePath: null }
  }
  
  if (imageUrl.startsWith('data:image')) {
    console.log('Processing base64 image...')
    const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid base64 image format')
    }
    const ext = matches[1]
    const base64Data = matches[2]
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    
    const fileName = `scheduled-post-${Date.now()}.${ext}`
    const filePath = `${userId}/${fileName}`
    const { error: uploadError } = await supabaseClient.storage
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
    
    return { publicUrl, filePath }
  }
  
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
    
    const fileName = `scheduled-post-${Date.now()}.${ext}`
    const filePath = `${userId}/${fileName}`
    const { error: uploadError } = await supabaseClient.storage
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
    
    return { publicUrl, filePath }
  } catch (error) {
    console.error('Error processing image:', error)
    return { publicUrl: imageUrl, filePath: null }
  }
}

// Cleanup temp image after posting
async function cleanupTempImage(supabaseClient: any, filePath: string | null) {
  if (filePath) {
    console.log('Cleaning up temporary image:', filePath)
    const { error: deleteError } = await supabaseClient.storage
      .from('social-media-images')
      .remove([filePath])
    
    if (deleteError) {
      console.error('Failed to delete temporary image:', deleteError)
    } else {
      console.log('Successfully deleted temporary image')
    }
  }
}

async function postToFacebook(connection: any, postText: string, publicImageUrl: string | null): Promise<any> {
  let fbResponse;
  
  if (publicImageUrl) {
    console.log('Posting to Facebook with image:', publicImageUrl)
    fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.page_id}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: publicImageUrl,
          caption: postText,
          access_token: connection.access_token
        })
      }
    )
  } else {
    fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.page_id}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: postText,
          access_token: connection.access_token
        })
      }
    )
  }

  if (!fbResponse.ok) {
    const errorData = await fbResponse.json()
    throw new Error(errorData.error?.message || 'Failed to post to Facebook')
  }

  return await fbResponse.json()
}

async function postToInstagram(connection: any, postText: string, publicImageUrl: string): Promise<any> {
  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${connection.instagram_account_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: publicImageUrl,
        caption: postText,
        access_token: connection.access_token
      })
    }
  )

  if (!containerResponse.ok) {
    const errorData = await containerResponse.json()
    throw new Error(errorData.error?.message || 'Failed to create Instagram media container')
  }

  const containerData = await containerResponse.json()
  const creationId = containerData.id

  // Step 2: Publish the container
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${connection.instagram_account_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: connection.access_token
      })
    }
  )

  if (!publishResponse.ok) {
    const errorData = await publishResponse.json()
    throw new Error(errorData.error?.message || 'Failed to publish to Instagram')
  }

  return await publishResponse.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Checking for scheduled posts to process...')

    // Get posts that are scheduled and due
    const now = new Date().toISOString()
    const { data: scheduledPosts, error: fetchError } = await supabaseAdmin
      .from('social_media_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(10) // Process up to 10 at a time

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError)
      throw fetchError
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log('No scheduled posts to process')
      return new Response(
        JSON.stringify({ message: 'No scheduled posts to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${scheduledPosts.length} scheduled posts to process`)

    const results = []

    for (const post of scheduledPosts) {
      console.log(`Processing post ${post.id} scheduled for ${post.scheduled_at}`)
      
      try {
        // Get user's social media connections
        const { data: connections, error: connectionsError } = await supabaseAdmin
          .from('social_media_connections')
          .select('*')
          .eq('user_id', post.user_id)

        if (connectionsError || !connections || connections.length === 0) {
          throw new Error('No social media accounts connected')
        }

        let publicImageUrl: string | null = null
        let tempFilePath: string | null = null

        // Process image if exists
        if (post.image_url) {
          const imageResult = await getPublicImageUrl(post.image_url, supabaseAdmin, post.user_id)
          publicImageUrl = imageResult.publicUrl
          tempFilePath = imageResult.filePath
        }

        const postResults: any = {
          facebook: null,
          instagram: null,
          success: true
        }

        // Post to Facebook
        if (post.platforms.includes('facebook')) {
          const fbConnection = connections.find((c: any) => c.platform === 'facebook')
          if (fbConnection) {
            try {
              const fbData = await postToFacebook(fbConnection, post.post_text, publicImageUrl)
              postResults.facebook = {
                success: true,
                post_id: fbData.id,
                post_url: `https://www.facebook.com/${fbData.id}`
              }
              console.log(`Successfully posted to Facebook: ${fbData.id}`)
            } catch (error) {
              console.error('Facebook posting error:', error)
              postResults.facebook = { error: error instanceof Error ? error.message : 'Failed' }
              postResults.success = false
            }
          }
        }

        // Post to Instagram
        if (post.platforms.includes('instagram') && publicImageUrl) {
          const igConnection = connections.find((c: any) => c.platform === 'facebook' && c.instagram_account_id)
          if (igConnection) {
            try {
              const igData = await postToInstagram(igConnection, post.post_text, publicImageUrl)
              postResults.instagram = {
                success: true,
                post_id: igData.id,
                post_url: `https://www.instagram.com/p/${igData.id}`
              }
              console.log(`Successfully posted to Instagram: ${igData.id}`)
            } catch (error) {
              console.error('Instagram posting error:', error)
              postResults.instagram = { error: error instanceof Error ? error.message : 'Failed' }
              postResults.success = false
            }
          }
        }

        // Update post status
        const { error: updateError } = await supabaseAdmin
          .from('social_media_posts')
          .update({
            status: postResults.success ? 'published' : 'failed',
            facebook_post_id: postResults.facebook?.post_id || null,
            facebook_post_url: postResults.facebook?.post_url || null,
            instagram_post_id: postResults.instagram?.post_id || null,
            instagram_post_url: postResults.instagram?.post_url || null,
            published_at: postResults.success ? new Date().toISOString() : null,
            error_message: !postResults.success ? JSON.stringify(postResults) : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)

        if (updateError) {
          console.error('Error updating post status:', updateError)
        }

        // Cleanup temp image
        await cleanupTempImage(supabaseAdmin, tempFilePath)

        results.push({ postId: post.id, ...postResults })

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error)
        
        // Mark as failed
        await supabaseAdmin
          .from('social_media_posts')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)

        results.push({ postId: post.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    console.log(`Processed ${results.length} scheduled posts`)

    return new Response(
      JSON.stringify({ message: 'Scheduled posts processed', processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
