import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'
import { verifyUnsubscribeToken, maskEmail } from '@/utils/token'
import { isValidEmail } from '@/utils/validation'
import { createRateLimiter } from '@/lib/rate-limit'
import { getClientIp } from '@/utils/network'
const BLOG_AUDIENCE_ID = process.env.RESEND_BLOG_AUDIENCE_ID

// Rate limiter for unsubscribe endpoint (more lenient than subscribe)
const unsubscribeRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
})

export async function GET(request: NextRequest) {
  // Check rate limit first
  const ip = getClientIp(request)
  const rateLimit = unsubscribeRateLimiter.check(ip)
  
  if (!rateLimit.allowed) {
    return NextResponse.redirect(new URL('/blog/unsubscribe?status=error&reason=rate-limited', request.url))
  }

  // Get the secure token from URL params
  const token = request.nextUrl.searchParams.get('token')
  
  // Also support legacy email param for backwards compatibility during transition
  // This will be removed in a future version
  const legacyEmail = request.nextUrl.searchParams.get('email')

  if (!token && !legacyEmail) {
    return NextResponse.redirect(new URL('/blog/unsubscribe?status=error&reason=missing-token', request.url))
  }

  let email: string | null = null

  if (token) {
    // Verify the secure token
    const result = verifyUnsubscribeToken(token)
    
    if (!result.valid || !result.email) {
      const reason = result.error === 'expired' ? 'expired-link' : 'invalid-link'
      console.warn(`[Newsletter] Invalid unsubscribe token: ${result.error}`)
      return NextResponse.redirect(new URL(`/blog/unsubscribe?status=error&reason=${reason}`, request.url))
    }
    
    email = result.email
  } else if (legacyEmail) {
    // Legacy support - validate email format at minimum
    if (!isValidEmail(legacyEmail)) {
      console.warn('[Newsletter] Invalid legacy email format in unsubscribe')
      return NextResponse.redirect(new URL('/blog/unsubscribe?status=error&reason=invalid-email', request.url))
    }
    
    email = legacyEmail.toLowerCase().trim()
    console.warn(`[Newsletter] Legacy unsubscribe link used for: ${maskEmail(email)}`)
  }

  if (!email) {
    return NextResponse.redirect(new URL('/blog/unsubscribe?status=error&reason=invalid-email', request.url))
  }

  if (!BLOG_AUDIENCE_ID) {
    console.error('[Newsletter] RESEND_BLOG_AUDIENCE_ID not configured')
    return NextResponse.redirect(new URL('/blog/unsubscribe?status=error&reason=config', request.url))
  }

  try {
    // Update contact to unsubscribed
    const { error } = await resend.contacts.update({
      audienceId: BLOG_AUDIENCE_ID,
      id: email, // Resend accepts email as ID
      unsubscribed: true,
    })

    if (error) {
      // Check if contact doesn't exist
      if (error.message?.toLowerCase().includes('not found')) {
        console.log(`[Newsletter] Unsubscribe for non-existent contact: ${maskEmail(email)}`)
        // Return success anyway to prevent email enumeration
        return NextResponse.redirect(new URL('/blog/unsubscribe?status=success', request.url))
      }
      
      console.error('[Newsletter] Unsubscribe error:', error.message)
      return NextResponse.redirect(new URL('/blog/unsubscribe?status=error&reason=failed', request.url))
    }

    console.log(`[Newsletter] Unsubscribed: ${maskEmail(email)}`)
    return NextResponse.redirect(new URL('/blog/unsubscribe?status=success', request.url))
  } catch (error) {
    console.error('[Newsletter] Unsubscribe error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.redirect(new URL('/blog/unsubscribe?status=error&reason=failed', request.url))
  }
}
