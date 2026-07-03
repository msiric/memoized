import { getBlogPostsForFeed } from '@/services/blog'
import { getSiteUrl } from '@/config/env'
import { APP_NAME } from '@/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

/**
 * Remove characters that are invalid in XML 1.0.
 * XML 1.0 only allows: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
 * This strips control characters (except tab, newline, carriage return) and other invalid chars.
 * @internal Exported for testing
 */
export function stripInvalidXmlChars(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFFFE\uFFFF]/g, '')
}

/**
 * Escape special XML characters to prevent malformed XML.
 * Order matters: & must be replaced first to avoid double-escaping.
 * Also strips invalid XML 1.0 characters.
 * @internal Exported for testing
 */
export function escapeXml(text: string | null | undefined): string {
  if (!text) return ''
  return stripInvalidXmlChars(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Escape content for CDATA sections.
 * CDATA sections end with ]]>, so we need to split it if the content contains that sequence.
 * Also strips invalid XML 1.0 characters.
 * @internal Exported for testing
 */
export function escapeCdata(text: string | null | undefined): string {
  if (!text) return ''
  // First strip invalid XML characters, then handle CDATA terminator
  return stripInvalidXmlChars(text).replace(/\]\]>/g, ']]]]><![CDATA[>')
}

export async function GET() {
  try {
    const siteUrl = getSiteUrl()
    // Escape siteUrl for use in XML attributes and elements (defense-in-depth)
    const safeSiteUrl = escapeXml(siteUrl)
    const posts = await getBlogPostsForFeed()

    const rssItems = posts
      .map((post) => {
        // URL-encode the slug for safety, escape for XML context
        const postUrl = escapeXml(`${siteUrl}/blog/${encodeURIComponent(post.slug)}`)
        const pubDate = post.publishedAt?.toUTCString() || new Date().toUTCString()
        
        return `
    <item>
      <title><![CDATA[${escapeCdata(post.title)}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${escapeCdata(post.description)}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(post.author)}</author>
      ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ')}
    </item>`
      })
      .join('')

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(APP_NAME)} Blog</title>
    <link>${safeSiteUrl}/blog</link>
    <description>Articles on software development, coding interviews, and building products from the ${escapeXml(APP_NAME)} team.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${safeSiteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${safeSiteUrl}/images/logo.png</url>
      <title>${escapeXml(APP_NAME)} Blog</title>
      <link>${safeSiteUrl}/blog</link>
    </image>
    ${rssItems}
  </channel>
</rss>`

    return new Response(rssFeed, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('RSS feed generation error:', error)
    
    // Return a valid but empty RSS feed on error
    const siteUrl = escapeXml(getSiteUrl())
    const errorFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(APP_NAME)} Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Feed temporarily unavailable</description>
  </channel>
</rss>`

    return new Response(errorFeed, {
      status: 500,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  }
}
