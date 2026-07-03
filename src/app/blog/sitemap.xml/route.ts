import { getBlogPostsForSitemap } from '@/services/blog'
import { getSiteUrl } from '@/config/env'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  const siteUrl = getSiteUrl()
  const posts = await getBlogPostsForSitemap()

  const urls = posts
    .map(
      (post) => `
  <url>
    <loc>${siteUrl}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('')

  // Add blog index page
  const blogIndexUrl = `
  <url>
    <loc>${siteUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${blogIndexUrl}
  ${urls}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
