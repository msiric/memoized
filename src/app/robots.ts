import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/config/env'
import { BLOCKED_CRAWLERS, DEFERRED_AI_TRAINING_CRAWLERS } from '@/lib/crawlers'

// Owner decision O1: every crawler may crawl except BLOCKED_CRAWLERS and, until
// lesson pages are cached, the high-volume AI training crawlers (see crawlers.ts).
const PRIVATE_PATHS = ['/api/', '/admin/', '/private/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...BLOCKED_CRAWLERS], disallow: '/' },
      { userAgent: [...DEFERRED_AI_TRAINING_CRAWLERS], disallow: '/' },
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
