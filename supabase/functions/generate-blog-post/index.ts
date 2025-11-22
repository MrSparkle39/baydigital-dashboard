import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const NETLIFY_ACCESS_TOKEN = Deno.env.get('NETLIFY_ACCESS_TOKEN')!

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

// SHA-1 hash function for Netlify file uploads
async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate blog post HTML template
function generateBlogPostHtml(data: {
  title: string
  metaTitle: string
  metaDescription: string
  content: string
  slug: string
  publishedDate: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.metaTitle}</title>
  <meta name="description" content="${data.metaDescription}">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9fafb;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      text-decoration: none;
      color: white;
    }
    nav a {
      color: white;
      text-decoration: none;
      margin-left: 2rem;
      font-weight: 500;
    }
    nav a:hover {
      opacity: 0.8;
    }
    .container {
      max-width: 800px;
      margin: 3rem auto;
      padding: 0 2rem;
    }
    article {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: #111;
      line-height: 1.2;
    }
    .meta {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
    }
    .content h2 {
      font-size: 1.8rem;
      margin: 2rem 0 1rem;
      color: #222;
    }
    .content h3 {
      font-size: 1.4rem;
      margin: 1.5rem 0 0.8rem;
      color: #333;
    }
    .content p {
      margin-bottom: 1.2rem;
      font-size: 1.1rem;
      line-height: 1.8;
    }
    .content ul, .content ol {
      margin: 1rem 0 1rem 2rem;
    }
    .content li {
      margin-bottom: 0.5rem;
      line-height: 1.7;
    }
    .content strong {
      color: #111;
      font-weight: 600;
    }
    .back-link {
      display: inline-block;
      margin-top: 2rem;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    footer {
      text-align: center;
      padding: 2rem;
      color: #666;
      font-size: 0.9rem;
    }
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        text-align: center;
      }
      nav {
        margin-top: 1rem;
      }
      nav a {
        margin: 0 1rem;
      }
      article {
        padding: 2rem 1.5rem;
      }
      h1 {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-content">
      <a href="/" class="logo">Your Business</a>
      <nav>
        <a href="/">Home</a>
        <a href="/services">Services</a>
        <a href="/blog">Blog</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  </header>

  <div class="container">
    <article>
      <h1>${data.title}</h1>
      <div class="meta">
        Published on ${data.publishedDate}
      </div>
      <div class="content">
        ${data.content}
      </div>
      <a href="/blog" class="back-link">← Back to Blog</a>
    </article>
  </div>

  <footer>
    <p>&copy; ${new Date().getFullYear()} Your Business. All rights reserved.</p>
  </footer>
</body>
</html>`
}

// Generate blog index HTML
function generateBlogIndexHtml(posts: Array<{
  title: string
  slug: string
  excerpt: string
  publishedDate: string
}>): string {
  const postCards = posts.map(post => `
    <div class="blog-card">
      <div class="blog-card-image"></div>
      <div class="blog-card-content">
        <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
        <p class="date">${post.publishedDate}</p>
        <p class="excerpt">${post.excerpt}</p>
        <a href="/blog/${post.slug}" class="read-more">Read More →</a>
      </div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog - Your Business</title>
  <meta name="description" content="Read our latest blog posts and updates">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9fafb;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      text-decoration: none;
      color: white;
    }
    nav a {
      color: white;
      text-decoration: none;
      margin-left: 2rem;
      font-weight: 500;
    }
    nav a:hover {
      opacity: 0.8;
    }
    .container {
      max-width: 1200px;
      margin: 3rem auto;
      padding: 0 2rem;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: #111;
    }
    .subtitle {
      color: #666;
      margin-bottom: 3rem;
    }
    .blog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
    }
    .blog-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .blog-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .blog-card-image {
      width: 100%;
      height: 200px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .blog-card-content {
      padding: 1.5rem;
    }
    .blog-card h3 {
      font-size: 1.3rem;
      margin-bottom: 0.5rem;
    }
    .blog-card h3 a {
      color: #111;
      text-decoration: none;
    }
    .blog-card h3 a:hover {
      color: #667eea;
    }
    .date {
      color: #999;
      font-size: 0.85rem;
      margin-bottom: 0.8rem;
    }
    .excerpt {
      color: #666;
      margin-bottom: 1rem;
      line-height: 1.6;
    }
    .read-more {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .read-more:hover {
      text-decoration: underline;
    }
    footer {
      text-align: center;
      padding: 2rem;
      color: #666;
      font-size: 0.9rem;
      margin-top: 4rem;
    }
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        text-align: center;
      }
      nav {
        margin-top: 1rem;
      }
      nav a {
        margin: 0 1rem;
      }
      .blog-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-content">
      <a href="/" class="logo">Your Business</a>
      <nav>
        <a href="/">Home</a>
        <a href="/services">Services</a>
        <a href="/blog">Blog</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  </header>

  <div class="container">
    <h1>Our Blog</h1>
    <p class="subtitle">Read our latest insights and updates</p>

    <div class="blog-grid">
      ${postCards}
    </div>
  </div>

  <footer>
    <p>&copy; ${new Date().getFullYear()} Your Business. All rights reserved.</p>
  </footer>
</body>
</html>`
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { topic, tone, language } = await req.json()

    // Get user's site info
    const { data: sites, error: sitesError } = await supabaseClient
      .from('sites')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)

    if (sitesError || !sites || sites.length === 0) {
      throw new Error('No site found for user')
    }

    const site = sites[0]

    if (!site.netlify_site_id) {
      throw new Error('Netlify site ID not configured')
    }

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
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a professional ${tone} content writer. Write a comprehensive, SEO-optimized blog post in ${language} about: "${topic}".

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
        }]
      })
    })

    if (!claudeResponse.ok) {
      throw new Error('Failed to generate blog post with Claude')
    }

    const claudeData = await claudeResponse.json()
    let content = claudeData?.content?.[0]?.text as string

    if (!content || typeof content !== 'string') {
      throw new Error('Claude response missing text content')
    }

    // Claude sometimes wraps JSON in ```json fences; strip them before parsing
    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      const firstBrace = jsonText.indexOf('{')
      const lastBrace = jsonText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1)
      }
    }

    let blogData
    try {
      blogData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Claude JSON:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        snippet: jsonText.slice(0, 200),
      })
      throw new Error('Failed to parse AI response. Please try again.')
    }
    
    // Generate slug
    const slug = slugify(blogData.title)
    
    // Get current date
    const publishedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Generate complete blog post HTML
    const blogPostHtml = generateBlogPostHtml({
      title: blogData.title,
      metaTitle: blogData.meta_title,
      metaDescription: blogData.meta_description,
      content: blogData.body_html,
      slug,
      publishedDate
    })

    // Get existing blog posts for the index
    const { data: existingPosts } = await supabaseClient
      .from('blogmaker_posts')
      .select('title, slug, meta_description, published_at')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    // Create excerpt from meta description
    const excerpt = blogData.meta_description.slice(0, 150) + '...'

    // Prepare blog index posts array
    const indexPosts = [
      {
        title: blogData.title,
        slug,
        excerpt,
        publishedDate
      },
      ...(existingPosts || []).map((post: any) => ({
        title: post.title,
        slug: post.slug,
        excerpt: post.meta_description?.slice(0, 150) + '...' || '',
        publishedDate: new Date(post.published_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }))
    ]

    // Generate blog index HTML
    const blogIndexHtml = generateBlogIndexHtml(indexPosts)

    // Push files to Netlify using proper API
    console.log('Publishing to Netlify...')
    
    // Prepare files with SHA-1 hashes
    const blogPostPath = `blog/${slug}.html`
    const blogIndexPath = `blog.html`
    
    const blogPostSha = await sha1(blogPostHtml)
    const blogIndexSha = await sha1(blogIndexHtml)
    
    const files: Record<string, string> = {
      [blogPostPath]: blogPostSha,
      [blogIndexPath]: blogIndexSha,
    }

    // Step 1: Create deploy with file digests
    const deployResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${site.netlify_site_id}/deploys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          files,
          draft: false,
        })
      }
    )

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text()
      console.error('Netlify deploy creation failed:', errorText)
      throw new Error(`Netlify deployment failed: ${errorText}`)
    }

    const deployData = await deployResponse.json()
    console.log('Deploy created:', deployData.id)

    // Step 2: Upload files that Netlify needs
    const requiredFiles = deployData.required || []
    
    for (const filePath of requiredFiles) {
      let fileContent = ''
      if (filePath === blogPostPath) {
        fileContent = blogPostHtml
      } else if (filePath === blogIndexPath) {
        fileContent = blogIndexHtml
      }
      
      if (fileContent) {
        const uploadResponse = await fetch(
          `https://api.netlify.com/api/v1/deploys/${deployData.id}/files/${filePath}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN}`,
            },
            body: fileContent,
          }
        )

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text()
          console.error(`Failed to upload ${filePath}:`, uploadError)
        } else {
          console.log(`Uploaded ${filePath}`)
        }
      }
    }

    const publishedUrl = `https://${site.site_url}/${blogPostPath}`

    // Save to database
    const { error: insertError } = await supabaseClient
      .from('blogmaker_posts')
      .insert({
        user_id: user.id,
        site_id: site.id,
        title: blogData.title,
        slug,
        body_html: blogData.body_html,
        meta_title: blogData.meta_title,
        meta_description: blogData.meta_description,
        keywords: blogData.keywords,
        topic,
        tone,
        language,
        published_url: publishedUrl,
        status: 'published',
        published_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to save to database:', insertError)
      // Continue anyway - the post is published
    }

    return new Response(
      JSON.stringify({
        success: true,
        published_url: publishedUrl,
        title: blogData.title,
        slug,
        deploy_id: deployData.id
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
