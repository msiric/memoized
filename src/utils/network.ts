import { NextRequest } from 'next/server'

/**
 * Extract the client IP address from a Next.js request.
 *
 * Checks headers in priority order:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (Nginx, other proxies)
 * 3. x-forwarded-for (Standard proxy header, first IP)
 *
 * @param request - The Next.js request object
 * @returns The client IP address, or 'unknown' if not available
 */
export function getClientIp(request: NextRequest): string {
  // Cloudflare's connecting IP header (most reliable when using Cloudflare)
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp

  // Common proxy header for real client IP
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  // Standard forwarded header - use first IP (client IP)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  return 'unknown'
}
