import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GITHUB_ACCESS_TOKEN = Deno.env.get('GITHUB_ACCESS_TOKEN')!

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

// Generate blog post HTML with TIC branding and images
function generateBlogPostHtml(data: {
  title: string
  metaTitle: string
  metaDescription: string
  content: string
  slug: string
  publishedDate: string
  mainImage: string
  secondaryImages: string[]
}): string {
  // Insert secondary images into content sections
  let enhancedContent = data.content
  const h2Sections = enhancedContent.split('</h2>')
  
  if (data.secondaryImages.length > 0 && h2Sections.length > 1) {
    // Insert first secondary image after first section
    if (data.secondaryImages[0]) {
      h2Sections[1] = `</h2>
        <div class="content-image">
          <img src="${data.secondaryImages[0]}" alt="Supporting visual">
        </div>` + h2Sections[1]
    }
    
    // Insert second secondary image after second section if available
    if (data.secondaryImages[1] && h2Sections.length > 2) {
      h2Sections[2] = `</h2>
        <div class="content-image">
          <img src="${data.secondaryImages[1]}" alt="Supporting visual">
        </div>` + h2Sections[2]
    }
    
    enhancedContent = h2Sections.join('')
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.metaTitle}</title>
    <meta name="description" content="${data.metaDescription}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #00bcd4;
            --secondary-color: #ffeb3b;
            --dark-bg: #2c2c2c;
            --light-bg: #f8f9fa;
            --text-dark: #333333;
            --text-light: #666666;
            --white: #ffffff;
            --shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            color: var(--text-dark);
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        .header {
            background: #2c2c2c;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            padding: 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            height: 80px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .logo-container img {
            height: 80px;
            width: auto;
        }
        
        nav {
            display: flex;
            gap: 40px;
        }
        
        nav a {
            color: var(--white);
            text-decoration: none;
            font-weight: 500;
            transition: var(--transition);
        }
        
        nav a:hover {
            color: var(--primary-color);
        }
        
        .header-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .ndis-header-logo {
            height: 75px;
            width: auto;
            padding: 8px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .cta-button {
            background: var(--primary-color);
            color: var(--white);
            padding: 12px 30px;
            border-radius: 30px;
            font-weight: 600;
            text-decoration: none;
            transition: var(--transition);
        }
        
        .cta-button:hover {
            background: #00a3b8;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 188, 212, 0.3);
        }
        
        .hero-banner {
            position: relative;
            height: 500px;
            background: linear-gradient(135deg, var(--primary-color) 0%, #0097a7 100%);
            overflow: hidden;
        }
        
        .hero-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.3;
        }
        
        .hero-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, rgba(0,188,212,0.8), rgba(0,151,167,0.9));
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        
        .hero-title {
            color: var(--white);
            font-size: 3.5rem;
            font-weight: 700;
            text-align: center;
            max-width: 900px;
            line-height: 1.2;
            text-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .blog-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 20px;
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 60px;
        }
        
        .main-content {
            background: var(--white);
        }
        
        .meta {
            color: var(--text-light);
            font-size: 0.95rem;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--light-bg);
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .content h2 {
            font-size: 2rem;
            color: var(--text-dark);
            margin: 50px 0 20px;
            font-weight: 600;
            position: relative;
            padding-left: 20px;
        }
        
        .content h2::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--primary-color);
            border-radius: 2px;
        }
        
        .content h3 {
            font-size: 1.5rem;
            color: var(--text-dark);
            margin: 35px 0 15px;
            font-weight: 600;
        }
        
        .content p {
            margin-bottom: 20px;
            font-size: 1.1rem;
            line-height: 1.8;
            color: var(--text-dark);
        }
        
        .content ul, .content ol {
            margin: 20px 0 20px 40px;
        }
        
        .content li {
            margin-bottom: 12px;
            line-height: 1.7;
            color: var(--text-dark);
        }
        
        .content strong {
            color: var(--text-dark);
            font-weight: 600;
        }
        
        .content-image {
            margin: 40px 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: var(--shadow);
        }
        
        .content-image img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .sidebar {
            position: sticky;
            top: 100px;
            height: fit-content;
        }
        
        .sidebar-section {
            background: var(--white);
            padding: 30px;
            border-radius: 12px;
            box-shadow: var(--shadow);
            margin-bottom: 30px;
        }
        
        .sidebar-section h3 {
            font-size: 1.3rem;
            color: var(--text-dark);
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .sidebar-cta {
            background: linear-gradient(135deg, var(--primary-color) 0%, #0097a7 100%);
            color: var(--white);
            padding: 25px;
            border-radius: 12px;
            text-align: center;
        }
        
        .sidebar-cta h4 {
            font-size: 1.2rem;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .sidebar-cta p {
            font-size: 0.95rem;
            margin-bottom: 20px;
            opacity: 0.95;
        }
        
        .sidebar-cta-button {
            background: var(--white);
            color: var(--primary-color);
            padding: 12px 25px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            transition: var(--transition);
        }
        
        .sidebar-cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        
        .back-link {
            display: inline-block;
            margin-top: 40px;
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 600;
            transition: var(--transition);
            font-size: 1.1rem;
        }
        
        .back-link:hover {
            color: #00a3b8;
            transform: translateX(-5px);
        }
        
        .footer {
            background: var(--dark-bg);
            color: var(--white);
            padding: 60px 20px 30px;
            margin-top: 80px;
        }
        
        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .footer-logo {
            height: 80px;
            width: auto;
            margin-bottom: 20px;
        }
        
        .footer-section h4 {
            color: var(--primary-color);
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .footer-section ul {
            list-style: none;
        }
        
        .footer-section li {
            margin-bottom: 10px;
        }
        
        .footer-section a {
            color: var(--white);
            text-decoration: none;
            transition: var(--transition);
        }
        
        .footer-section a:hover {
            color: var(--primary-color);
        }
        
        .footer-ndis-badge {
            margin-top: 20px;
        }
        
        .ndis-footer-logo {
            max-width: 150px;
            height: auto;
            padding: 8px 12px;
            background: var(--white);
            border-radius: 8px;
        }
        
        .footer-bottom {
            text-align: center;
            padding-top: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            max-width: 1200px;
            margin: 0 auto;
        }
        
        @media (max-width: 1024px) {
            .blog-container {
                grid-template-columns: 1fr;
            }
            
            .sidebar {
                position: static;
            }
        }
        
        @media (max-width: 768px) {
            .header-content {
                padding: 0 20px;
                flex-wrap: wrap;
                height: auto;
                padding: 15px 20px;
            }
            
            nav {
                display: none;
            }
            
            .header-right {
                gap: 10px;
            }
            
            .ndis-header-logo {
                height: 50px;
            }
            
            .cta-button {
                padding: 10px 20px;
                font-size: 0.9rem;
            }
            
            .hero-banner {
                height: 350px;
            }
            
            .hero-title {
                font-size: 2rem;
            }
            
            .content h2 {
                font-size: 1.5rem;
            }
            
            .content h3 {
                font-size: 1.2rem;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo-container">
                <a href="/index.html">
                    <img src="/logo.png" alt="The Inclusion Crew Logo" class="logo">
                </a>
            </div>
            <nav>
                <a href="/index.html">Home</a>
                <a href="/about.html">About</a>
                <a href="/services.html">Services</a>
                <a href="/contact.html">Contact</a>
            </nav>
            <div class="header-right">
                <img src="/ndis-logo.png" alt="NDIS Registered Provider" class="ndis-header-logo">
                <a href="/contact.html" class="cta-button">Get Started</a>
            </div>
        </div>
    </header>

    <section class="hero-banner">
        <img src="${data.mainImage}" alt="${data.title}" class="hero-image">
        <div class="hero-overlay">
            <h1 class="hero-title">${data.title}</h1>
        </div>
    </section>

    <div class="blog-container">
        <article class="main-content">
            <div class="meta">
                <div class="meta-item">
                    <span>📅</span>
                    <span>${data.publishedDate}</span>
                </div>
                <div class="meta-item">
                    <span>⏱️</span>
                    <span>5 min read</span>
                </div>
            </div>
            
            <div class="content">
                ${enhancedContent}
            </div>
            
            <a href="/blog.html" class="back-link">← Back to Blog</a>
        </article>

        <aside class="sidebar">
            <div class="sidebar-cta">
                <h4>Need NDIS Support?</h4>
                <p>Get personalized assistance from our experienced team.</p>
                <a href="/contact.html" class="sidebar-cta-button">Contact Us Today</a>
            </div>
            
            <div class="sidebar-section">
                <h3>Quick Links</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 12px;"><a href="/services.html" style="color: var(--text-dark); text-decoration: none;">Our Services</a></li>
                    <li style="margin-bottom: 12px;"><a href="/about.html" style="color: var(--text-dark); text-decoration: none;">About Us</a></li>
                    <li style="margin-bottom: 12px;"><a href="/blog.html" style="color: var(--text-dark); text-decoration: none;">More Articles</a></li>
                </ul>
            </div>
        </aside>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <img src="/logo.png" alt="The Inclusion Crew Logo" class="footer-logo">
                <p>Professional NDIS disability support services delivered with respect, flexibility, and genuine care.</p>
                <div class="footer-ndis-badge">
                    <img src="/ndis-logo.png" alt="NDIS Registered Provider" class="ndis-footer-logo">
                </div>
            </div>
            <div class="footer-section">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="/index.html">Home</a></li>
                    <li><a href="/about.html">About</a></li>
                    <li><a href="/services.html">Services</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Services</h4>
                <ul>
                    <li><a href="/services.html#in-home-support">In Home Support</a></li>
                    <li><a href="/services.html#personal-care">Personal Care</a></li>
                    <li><a href="/services.html#community-participation">Community Participation</a></li>
                    <li><a href="/services.html#transportation">Transportation</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Contact Us</h4>
                <ul>
                    <li><a href="tel:1800986574">Phone: 1800 986 574</a></li>
                    <li><a href="mailto:contact@theinclusioncrew.com.au">contact@theinclusioncrew.com.au</a></li>
                    <li>Greater Sydney Based | Australia-Wide Registered</li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; ${new Date().getFullYear()} The Inclusion Crew. All rights reserved. | Registered NDIS Provider</p>
        </div>
    </footer>
</body>
</html>`
}

// Generate blog index HTML with thumbnails
function generateBlogIndexHtml(posts: Array<{
  title: string
  slug: string
  excerpt: string
  publishedDate: string
  thumbnail: string
}>): string {
  const postCards = posts.map(post => `
    <div class="blog-card">
      <div class="blog-card-image" style="background-image: url('${post.thumbnail}')"></div>
      <div class="blog-card-content">
        <h3><a href="/blog/${post.slug}.html">${post.title}</a></h3>
        <p class="date">${post.publishedDate}</p>
        <p class="excerpt">${post.excerpt}</p>
        <a href="/blog/${post.slug}.html" class="read-more">Read More →</a>
      </div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - The Inclusion Crew | NDIS Support Insights</title>
    <meta name="description" content="Read our latest NDIS support insights, disability services tips, and community inclusion updates from The Inclusion Crew.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #00bcd4;
            --secondary-color: #ffeb3b;
            --dark-bg: #2c2c2c;
            --light-bg: #f8f9fa;
            --text-dark: #333333;
            --text-light: #666666;
            --white: #ffffff;
            --shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            --shadow-hover: 0 8px 30px rgba(0, 0, 0, 0.15);
            --transition: all 0.3s ease;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            color: var(--text-dark);
            line-height: 1.6;
            overflow-x: hidden;
            background: var(--light-bg);
        }
        
        .header {
            background: #2c2c2c;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            padding: 0;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            height: 80px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .logo-container img {
            height: 80px;
            width: auto;
        }
        
        nav {
            display: flex;
            gap: 40px;
        }
        
        nav a {
            color: var(--white);
            text-decoration: none;
            font-weight: 500;
            transition: var(--transition);
        }
        
        nav a:hover {
            color: var(--primary-color);
        }
        
        .header-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .ndis-header-logo {
            height: 75px;
            width: auto;
            padding: 8px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .cta-button {
            background: var(--primary-color);
            color: var(--white);
            padding: 12px 30px;
            border-radius: 30px;
            font-weight: 600;
            text-decoration: none;
            transition: var(--transition);
        }
        
        .cta-button:hover {
            background: #00a3b8;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 188, 212, 0.3);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 100px 20px 60px;
        }
        
        h1 {
            font-size: 3rem;
            color: var(--text-dark);
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .subtitle {
            color: var(--text-light);
            font-size: 1.2rem;
            margin-bottom: 50px;
        }
        
        .blog-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
        }
        
        .blog-card {
            background: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: var(--shadow);
            transition: var(--transition);
        }
        
        .blog-card:hover {
            transform: translateY(-8px);
            box-shadow: var(--shadow-hover);
        }
        
        .blog-card-image {
            width: 100%;
            height: 220px;
            background-size: cover;
            background-position: center;
            background-color: var(--primary-color);
        }
        
        .blog-card-content {
            padding: 25px;
        }
        
        .blog-card h3 {
            font-size: 1.4rem;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .blog-card h3 a {
            color: var(--text-dark);
            text-decoration: none;
            transition: var(--transition);
        }
        
        .blog-card h3 a:hover {
            color: var(--primary-color);
        }
        
        .date {
            color: var(--text-light);
            font-size: 0.9rem;
            margin-bottom: 12px;
        }
        
        .excerpt {
            color: var(--text-dark);
            margin-bottom: 15px;
            line-height: 1.7;
        }
        
        .read-more {
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 600;
            transition: var(--transition);
        }
        
        .read-more:hover {
            color: #00a3b8;
        }
        
        .footer {
            background: var(--dark-bg);
            color: var(--white);
            padding: 60px 20px 30px;
            margin-top: 80px;
        }
        
        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .footer-logo {
            height: 80px;
            width: auto;
            margin-bottom: 20px;
        }
        
        .footer-section h4 {
            color: var(--primary-color);
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .footer-section ul {
            list-style: none;
        }
        
        .footer-section li {
            margin-bottom: 10px;
        }
        
        .footer-section a {
            color: var(--white);
            text-decoration: none;
            transition: var(--transition);
        }
        
        .footer-section a:hover {
            color: var(--primary-color);
        }
        
        .footer-ndis-badge {
            margin-top: 20px;
        }
        
        .ndis-footer-logo {
            max-width: 150px;
            height: auto;
            padding: 8px 12px;
            background: var(--white);
            border-radius: 8px;
        }
        
        .footer-bottom {
            text-align: center;
            padding-top: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            max-width: 1200px;
            margin: 0 auto;
        }
        
        @media (max-width: 768px) {
            .header-content {
                padding: 0 20px;
                flex-wrap: wrap;
                height: auto;
                padding: 15px 20px;
            }
            
            nav {
                display: none;
            }
            
            .header-right {
                gap: 10px;
            }
            
            .ndis-header-logo {
                height: 50px;
            }
            
            .cta-button {
                padding: 10px 20px;
                font-size: 0.9rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .blog-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo-container">
                <a href="/index.html">
                    <img src="/logo.png" alt="The Inclusion Crew Logo" class="logo">
                </a>
            </div>
            <nav>
                <a href="/index.html">Home</a>
                <a href="/about.html">About</a>
                <a href="/services.html">Services</a>
                <a href="/contact.html">Contact</a>
            </nav>
            <div class="header-right">
                <img src="/ndis-logo.png" alt="NDIS Registered Provider" class="ndis-header-logo">
                <a href="/contact.html" class="cta-button">Get Started</a>
            </div>
        </div>
    </header>

    <div class="container">
        <h1>Our Blog</h1>
        <p class="subtitle">NDIS support insights, disability services tips, and community inclusion updates</p>

        <div class="blog-grid">
            ${postCards}
        </div>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <img src="/logo.png" alt="The Inclusion Crew Logo" class="footer-logo">
                <p>Professional NDIS disability support services delivered with respect, flexibility, and genuine care.</p>
                <div class="footer-ndis-badge">
                    <img src="/ndis-logo.png" alt="NDIS Registered Provider" class="ndis-footer-logo">
                </div>
            </div>
            <div class="footer-section">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="/index.html">Home</a></li>
                    <li><a href="/about.html">About</a></li>
                    <li><a href="/services.html">Services</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Services</h4>
                <ul>
                    <li><a href="/services.html#in-home-support">In Home Support</a></li>
                    <li><a href="/services.html#personal-care">Personal Care</a></li>
                    <li><a href="/services.html#community-participation">Community Participation</a></li>
                    <li><a href="/services.html#transportation">Transportation</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Contact Us</h4>
                <ul>
                    <li><a href="tel:1800986574">Phone: 1800 986 574</a></li>
                    <li><a href="mailto:contact@theinclusioncrew.com.au">contact@theinclusioncrew.com.au</a></li>
                    <li>Greater Sydney Based | Australia-Wide Registered</li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; ${new Date().getFullYear()} The Inclusion Crew. All rights reserved. | Registered NDIS Provider</p>
        </div>
    </footer>
</body>
</html>`
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

    // Format date
    const publishedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Generate complete blog post HTML
    const blogPostHtml = generateBlogPostHtml({
      title: blogPost.title,
      metaTitle: blogPost.metaTitle,
      metaDescription: blogPost.metaDescription,
      content: blogPost.bodyHtml,
      slug: blogPost.slug,
      publishedDate,
      mainImage: blogPost.images.main,
      secondaryImages: blogPost.images.secondary
    })

    // Get existing blog posts for the index
    const { data: existingPosts } = await supabaseClient
      .from('blogmaker_posts')
      .select('title, slug, meta_description, published_at, main_image_url')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    // Create excerpt from meta description
    const excerpt = blogPost.metaDescription.slice(0, 150) + '...'

    // Prepare blog index posts array with thumbnails
    const indexPosts = [
      {
        title: blogPost.title,
        slug: blogPost.slug,
        excerpt,
        publishedDate,
        thumbnail: blogPost.images.main
      },
      ...(existingPosts || []).map((post: any) => ({
        title: post.title,
        slug: post.slug,
        excerpt: post.meta_description?.slice(0, 150) + '...' || '',
        publishedDate: new Date(post.published_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        thumbnail: post.main_image_url || ''
      }))
    ]

    // Generate blog index HTML
    const blogIndexHtml = generateBlogIndexHtml(indexPosts)

    // Push files to GitHub
    console.log('Committing to GitHub...')

    const blogPostPath = `blog/${blogPost.slug}.html`
    const blogIndexPath = `blog.html`
    const githubRepo = 'MrSparkle39/tic'
    const branch = 'main'

    // Get current commit SHA for the branch
    const refResponse = await fetch(`https://api.github.com/repos/${githubRepo}/git/refs/heads/${branch}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!refResponse.ok) {
      const errorText = await refResponse.text()
      throw new Error(`Failed to get branch ref: ${errorText}`)
    }

    const refData = await refResponse.json()
    const currentCommitSha = refData.object.sha

    // Get the commit to get the tree
    const commitResponse = await fetch(`https://api.github.com/repos/${githubRepo}/git/commits/${currentCommitSha}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!commitResponse.ok) {
      throw new Error('Failed to get commit data')
    }

    const commitData = await commitResponse.json()
    const baseTreeSha = commitData.tree.sha

    // Create blobs for the new files
    const blogPostBlobResponse = await fetch(`https://api.github.com/repos/${githubRepo}/git/blobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: blogPostHtml,
        encoding: 'utf-8',
      }),
    })

    if (!blogPostBlobResponse.ok) {
      throw new Error('Failed to create blog post blob')
    }

    const blogPostBlob = await blogPostBlobResponse.json()

    const blogIndexBlobResponse = await fetch(`https://api.github.com/repos/${githubRepo}/git/blobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: blogIndexHtml,
        encoding: 'utf-8',
      }),
    })

    if (!blogIndexBlobResponse.ok) {
      throw new Error('Failed to create blog index blob')
    }

    const blogIndexBlob = await blogIndexBlobResponse.json()

    // Create a new tree with the files
    const treeResponse = await fetch(`https://api.github.com/repos/${githubRepo}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          {
            path: blogPostPath,
            mode: '100644',
            type: 'blob',
            sha: blogPostBlob.sha,
          },
          {
            path: blogIndexPath,
            mode: '100644',
            type: 'blob',
            sha: blogIndexBlob.sha,
          },
        ],
      }),
    })

    if (!treeResponse.ok) {
      const errorText = await treeResponse.text()
      throw new Error(`Failed to create tree: ${errorText}`)
    }

    const treeData = await treeResponse.json()

    // Create a new commit
    const newCommitResponse = await fetch(`https://api.github.com/repos/${githubRepo}/git/commits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add blog post: ${blogPost.title}`,
        tree: treeData.sha,
        parents: [currentCommitSha],
      }),
    })

    if (!newCommitResponse.ok) {
      const errorText = await newCommitResponse.text()
      throw new Error(`Failed to create commit: ${errorText}`)
    }

    const newCommitData = await newCommitResponse.json()

    // Update the reference
    const updateRefResponse = await fetch(`https://api.github.com/repos/${githubRepo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: newCommitData.sha,
      }),
    })

    if (!updateRefResponse.ok) {
      const errorText = await updateRefResponse.text()
      throw new Error(`Failed to update ref: ${errorText}`)
    }

    console.log('Successfully committed to GitHub')

    const publishedUrl = `https://${site.site_url}/${blogPostPath}`

    // Save to database with image URLs
    const { error: insertError } = await supabaseClient.from('blogmaker_posts').insert({
      user_id: user.id,
      site_id: site.id,
      title: blogPost.title,
      slug: blogPost.slug,
      body_html: blogPost.bodyHtml,
      meta_title: blogPost.metaTitle,
      meta_description: blogPost.metaDescription,
      main_image_url: blogPost.images.main,
      secondary_image_urls: blogPost.images.secondary,
      topic,
      tone,
      language,
      published_url: publishedUrl,
      status: 'published',
      published_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Failed to save to database:', insertError)
      // Continue anyway - the post is published
    }

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
