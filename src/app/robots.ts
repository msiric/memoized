import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/config/env'
import { BLOCKED_CRAWLERS } from '@/lib/crawlers'

// Owner decision O1: every crawler not in BLOCKED_CRAWLERS may crawl, AI training
// crawlers included. Load is limited by the middleware rate limit.
const PRIVATE_PATHS = ['/api/', '/admin/', '/private/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...BLOCKED_CRAWLERS], disallow: '/' },
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
