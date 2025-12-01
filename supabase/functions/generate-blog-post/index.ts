import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Slugify function
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
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

    const { topic, tone, language, images, preview, documentFile } = await req.json()

    const { data: sites, error: sitesError } = await supabaseClient
      .from('sites')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)

    if (sitesError || !sites || sites.length === 0) {
      throw new Error('No site found for user')
    }

    const site = sites[0]

    // Prepare content for Claude API
    const messageContent: any[] = [];
    
    // Add document file if provided (PDF or Word)
    if (documentFile?.data && documentFile?.mimeType) {
      messageContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: documentFile.mimeType,
          data: documentFile.data
        }
      });
      messageContent.push({
        type: 'text',
        text: `Above is a reference document. Please review its content to inform your blog post writing.`
      });
    }
    
    // Add main prompt
    messageContent.push({
      type: 'text',
      text: `You are a professional ${tone} content writer. Write a comprehensive, SEO-optimized blog post in ${language} about: "${topic}".

Requirements:
- 800-1200 words
- Include an engaging title
- Write in ${tone} tone
- Create proper HTML structure with H2 and H3 headings
- Include bullet points or numbered lists where appropriate
- Make it informative and valuable
- Include a meta description (155 characters max)
- Generate a concise meta title (60 characters max)
- Extract 5-7 relevant keywords

Return ONLY a JSON object with this exact structure:
{
  "title": "Blog Post Title",
  "meta_title": "SEO Meta Title",
  "meta_description": "SEO meta description",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "body_html": "<h2>First Section</h2><p>Content here...</p>"
}

Do not include any text outside the JSON object.`
    });

    // Generate blog post with Claude
    console.log('Generating blog post with Claude...')
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: messageContent
        }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', claudeResponse.status, errorText)
      throw new Error(`Failed to generate blog post with Claude: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    console.log('Claude response received:', JSON.stringify(claudeData).substring(0, 200))
    
    let content = claudeData?.content?.[0]?.text as string

    if (!content || typeof content !== 'string') {
      console.error('Invalid Claude response structure:', claudeData)
      throw new Error('Claude response missing text content')
    }

    console.log('Raw content from Claude:', content.substring(0, 200))

    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      const firstBrace = jsonText.indexOf('{')
      const lastBrace = jsonText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1)
      }
    }

    console.log('Cleaned JSON text:', jsonText.substring(0, 200))

    let blogData
    try {
      blogData = JSON.parse(jsonText)
      console.log('Successfully parsed blog data')
    } catch (parseError) {
      console.error('Failed to parse Claude JSON:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        snippet: jsonText.slice(0, 500),
      })
      throw new Error('Failed to parse AI response. Please try again.')
    }
    
    const slug = slugify(blogData.title)
    const publishedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    console.log('Blog data prepared successfully')

    // Return preview data if in preview mode
    if (preview) {
      return new Response(
        JSON.stringify({
          title: blogData.title,
          metaTitle: blogData.meta_title,
          metaDescription: blogData.meta_description,
          bodyHtml: blogData.body_html,
          slug,
          images,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // If not preview, this shouldn't be called - publish endpoint should be used
    throw new Error('Use publish-blog-post endpoint for publishing')

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
