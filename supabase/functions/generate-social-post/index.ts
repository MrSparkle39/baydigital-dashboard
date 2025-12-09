import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

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

    const { topic, tone = 'professional', customImage } = await req.json()

    if (!topic || !topic.trim()) {
      throw new Error('Topic is required')
    }

    console.log('Generating social media post for topic:', topic)

    // Generate post copy with Claude
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are a ${tone} social media content creator. Create an engaging social media post about: "${topic}".

Requirements:
- Write 2-4 sentences (100-150 characters max - keep it SHORT and punchy)
- Include 5-7 relevant hashtags at the end
- Use ${tone} tone
- Make it attention-grabbing and engaging
- Include emojis where appropriate
- Focus on value and call-to-action

Also suggest a short, punchy headline (5-7 words max) that could be overlaid on an image.

Return ONLY a JSON object with this exact structure:
{
  "post_text": "The main post content with hashtags",
  "headline": "Short Punchy Headline",
  "image_search_query": "2-3 word search term for stock photos"
}

Do not include any text outside the JSON object.`
        }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', claudeResponse.status, errorText)
      throw new Error(`Failed to generate post with Claude: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    let content = claudeData?.content?.[0]?.text as string

    if (!content || typeof content !== 'string') {
      console.error('Invalid Claude response structure:', claudeData)
      throw new Error('Claude response missing text content')
    }

    console.log('Raw content from Claude:', content.substring(0, 200))

    // Clean and parse JSON
    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      const firstBrace = jsonText.indexOf('{')
      const lastBrace = jsonText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1)
      }
    }

    let postData
    try {
      postData = JSON.parse(jsonText)
      console.log('Successfully parsed post data')
    } catch (parseError) {
      console.error('Failed to parse Claude JSON:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        snippet: jsonText.slice(0, 500),
      })
      throw new Error('Failed to parse AI response. Please try again.')
    }

    // If user provided custom image, use it
    if (customImage) {
      return new Response(
        JSON.stringify({
          success: true,
          post_text: postData.post_text,
          headline: postData.headline,
          images: [customImage]
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Otherwise, search Freepik for images
    const searchQuery = postData.image_search_query || topic.split(' ').slice(0, 3).join(' ')
    
    console.log('Searching Freepik for:', searchQuery)

    // Call Freepik API (reuse existing freepik-api function)
    const freepikResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/freepik-api`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          action: 'search',
          query: searchQuery,
          page: 1,
          limit: 3
        }),
      }
    )

    if (!freepikResponse.ok) {
      console.error('Freepik API error:', await freepikResponse.text())
      // Continue without images rather than failing
      return new Response(
        JSON.stringify({
          success: true,
          post_text: postData.post_text,
          headline: postData.headline,
          images: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const freepikData = await freepikResponse.json()
    const images = freepikData.images || []

    console.log('Successfully generated post with', images.length, 'images')

    return new Response(
      JSON.stringify({
        success: true,
        post_text: postData.post_text,
        headline: postData.headline,
        images: images.map((img: any) => ({
          id: img.id,
          url: img.url,
          thumbnail: img.thumbnail
        }))
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
