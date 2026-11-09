import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { BLOCKED_CRAWLERS } from '@/lib/crawlers'

// Simple in-memory rate limiting for aggressive crawlers
// Note: This resets on each serverless cold start
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Limit maximum entries to prevent memory exhaustion
const MAX_TRACKED_IPS = 10000

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120 // 120 requests per minute per IP (2 per second)

// Blocked crawlers are shared with robots.txt (src/lib/crawlers.ts)
const BLOCKED_BOTS = BLOCKED_CRAWLERS

// Known good bots that should not be rate limited
const ALLOWED_BOTS = [
  'googlebot',
  'bingbot',
  'applebot',
  'duckduckbot',
  'slackbot',
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  // Fetches made for a person in an AI assistant (not crawls)
  'chatgpt-user',
  'claude-user',
  'perplexity-user',
]

// Signed-out views of lessons and other public pages are served from the
// cached /public tree.
// Anything that can personalise the page keeps the session-aware route: a
// NextAuth session cookie (including chunked .0/.1 cookies) or a guided-view
// query. The browser URL and canonical URL stay /courses/...
const SESSION_COOKIE = /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/
const LESSON_PATH = /^\/courses\/[^/]+\/[^/]+\/[^/]+\/?$/
// Other public pages with a cached signed-out copy under /public. Any query
// string (filters, checkout return, campaign tags) keeps the live route.
// /resources/intro is a redirect to /resources and stays on the live route.
// /premium stays live: its render calls Stripe, and every page prefetches it.
const CACHED_PAGES = /^\/(?:courses|problems|resources|resources\/(?!intro\/?$)[^/]+)\/?$/

function hasCachedCopy(pathname: string, searchParams: URLSearchParams) {
  if (LESSON_PATH.test(pathname)) return !searchParams.has('path') && !searchParams.has('step')
  // Next's client adds _rsc to navigation requests; it is not user input.
  return CACHED_PAGES.test(pathname) && [...searchParams.keys()].every((key) => key === '_rsc')
}

const PUBLIC_LESSON_PREFIX = '/public'
// Marks our own rewrite when the rewritten request passes through middleware
// again. Sending it by hand only reveals the same public page, whose canonical
// URL is still /courses/...
const INTERNAL_REWRITE_HEADER = 'x-memoized-lesson-cache'

function signedOutRoute(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  if (pathname === PUBLIC_LESSON_PREFIX || pathname.startsWith(`${PUBLIC_LESSON_PREFIX}/`)) {
    if (request.headers.get(INTERNAL_REWRITE_HEADER) === '1') return NextResponse.next()
    // The cached tree is internal; its only public address is the canonical URL.
    const canonical = request.nextUrl.clone()
    canonical.pathname = pathname.slice(PUBLIC_LESSON_PREFIX.length) || '/'
    return NextResponse.redirect(canonical, 308)
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return NextResponse.next()
  if (!hasCachedCopy(pathname, searchParams)) return NextResponse.next()
  if (request.cookies.getAll().some((cookie) => SESSION_COOKIE.test(cookie.name))) return NextResponse.next()
  const target = request.nextUrl.clone()
  target.pathname = `${PUBLIC_LESSON_PREFIX}${pathname.replace(/\/$/, '')}`
  const headers = new Headers(request.headers)
  headers.set(INTERNAL_REWRITE_HEADER, '1')
  return NextResponse.rewrite(target, { request: { headers } })
}

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip')?.trim() || 
             'unknown'

  // Every crawler may read robots.txt; a 4xx there would mean "no rules".
  if (request.nextUrl.pathname === '/robots.txt') return NextResponse.next()

  for (const bot of BLOCKED_BOTS) {
    if (userAgent.includes(bot)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  for (const bot of ALLOWED_BOTS) {
    if (userAgent.includes(bot)) {
      return signedOutRoute(request)
    }
  }

  const path = request.nextUrl.pathname
  const publicStaticAsset =
    !/^\/(api|admin|private)(\/|$)/.test(path) &&
    /\.(png|jpe?g|gif|webp|avif|svg|css|js|woff2?|ttf|otf|webmanifest)$/i.test(path)
  
  // Skip rate limiting for static assets and trusted API routes
  // Root-level social images/fonts must not consume the document budget or make
  // Next's internal image-optimizer fetch fail after a navigation burst.
  if (
    publicStaticAsset ||
    path.startsWith('/_next') ||
    path.startsWith('/images') ||
    path.startsWith('/media') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/webhook') ||
    path.endsWith('.ico') ||
    path.endsWith('.xml') ||
    path.endsWith('.txt')
  ) {
    return NextResponse.next()
  }

  const now = Date.now()
  const key = ip

  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetTime) {
    // Before adding new entry, check map size to prevent memory exhaustion
    if (requestCounts.size >= MAX_TRACKED_IPS) {
      for (const [k, v] of requestCounts.entries()) {
        if (now > v.resetTime) {
          requestCounts.delete(k)
        }
      }
      // If still too large, clear oldest entries (LRU approximation)
      if (requestCounts.size >= MAX_TRACKED_IPS) {
        const entriesToDelete = Math.floor(MAX_TRACKED_IPS * 0.2) // Clear 20%
        let deleted = 0
        for (const k of requestCounts.keys()) {
          if (deleted >= entriesToDelete) break
          requestCounts.delete(k)
          deleted++
        }
      }
    }
    // New window
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
  } else if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
      },
    })
  } else {
    entry.count++
  }

  // Clean up old entries periodically (every ~100 requests)
  if (Math.random() < 0.01) {
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k)
      }
    }
  }

  return signedOutRoute(request)
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
