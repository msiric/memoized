import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting for aggressive crawlers
// Note: This resets on each serverless cold start
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Limit maximum entries to prevent memory exhaustion
const MAX_TRACKED_IPS = 10000

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120 // 120 requests per minute per IP (2 per second)

// Known aggressive bot user agents to block entirely
const BLOCKED_BOTS = [
  'bytespider',
  'petalbot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'blexbot',
  'seekport',
  'megaindex',
  'yandexbot',
  'sogou',
  'baiduspider',
  'seznambot',
]

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
  'chatgpt-user',
  'claude-web',
]

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip')?.trim() || 
             'unknown'

  for (const bot of BLOCKED_BOTS) {
    if (userAgent.includes(bot)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  for (const bot of ALLOWED_BOTS) {
    if (userAgent.includes(bot)) {
      return NextResponse.next()
    }
  }

  const path = request.nextUrl.pathname
  
  // Skip rate limiting for static assets and trusted API routes
  if (
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

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
