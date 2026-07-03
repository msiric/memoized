import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'
import { sendNewsletterWelcome } from '@/services/email'
import { maskEmail } from '@/utils/token'
import { isValidEmail } from '@/utils/validation'
import { createRateLimiter } from '@/lib/rate-limit'
import { getClientIp } from '@/utils/network'

// Audience ID for blog newsletter subscribers
const BLOG_AUDIENCE_ID = process.env.RESEND_BLOG_AUDIENCE_ID

// Rate limiter for subscribe endpoint
// Note: This works for single-instance deployments. For serverless (Vercel),
// consider @upstash/ratelimit with Redis for distributed rate limiting.
const subscribeRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
})

function getRateLimitKey(ip: string, email?: string): string {
  // Use both IP and email (if available) for better rate limiting
  // This prevents the same email from being submitted rapidly even from different IPs
  if (email) {
    return `email:${email.toLowerCase()}`
  }
  return `ip:${ip}`
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  
  // Check IP-based rate limit first (before parsing body)
  const ipKey = getRateLimitKey(ip)
  const ipRateLimit = subscribeRateLimiter.check(ipKey)
  
  if (!ipRateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': '3600',
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
        }
      }
    )
  }

  try {
    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { email: rawEmail } = body as { email?: unknown }

    // Validate email
    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(rawEmail)

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Check email-based rate limit (prevents same email rapid submissions)
    const emailKey = getRateLimitKey(ip, email)
    const emailRateLimit = subscribeRateLimiter.check(emailKey)
    
    if (!emailRateLimit.allowed) {
      // Don't reveal that this specific email is rate-limited
      return NextResponse.json({
        success: true,
        message: 'Thank you for subscribing!',
      })
    }

    // Check if RESEND_TOKEN is configured
    if (!process.env.RESEND_TOKEN) {
      console.error('[Newsletter] RESEND_TOKEN not configured')
      return NextResponse.json(
        { error: 'Newsletter service not configured' },
        { status: 500 }
      )
    }

    // Check if audience is configured
    if (!BLOG_AUDIENCE_ID) {
      console.error('[Newsletter] RESEND_BLOG_AUDIENCE_ID not configured')
      return NextResponse.json(
        { error: 'Newsletter service not configured' },
        { status: 500 }
      )
    }

    // Check if contact already exists
    console.log('[Newsletter] Checking if contact exists:', { email: maskEmail(email) })
    
    try {
      const { data: existingContact } = await resend.contacts.get({
        audienceId: BLOG_AUDIENCE_ID,
        email: email,
      })

      if (existingContact) {
        if (existingContact.unsubscribed) {
          // Contact exists but is unsubscribed - resubscribe them
          console.log('[Newsletter] Resubscribing previously unsubscribed contact:', { email: maskEmail(email) })
          
          await resend.contacts.update({
            audienceId: BLOG_AUDIENCE_ID,
            id: existingContact.id,
            unsubscribed: false,
          })

          // Send welcome email for returning subscriber
          const emailResult = await sendNewsletterWelcome(email)
          if (emailResult.success) {
            console.log('[Newsletter] Welcome email sent to returning subscriber:', maskEmail(email))
          } else {
            console.error('[Newsletter] Failed to send welcome email:', emailResult.error)
          }

          return NextResponse.json({
            success: true,
            message: 'Welcome back! You have been resubscribed.',
          })
        } else {
          // Contact exists and is already subscribed
          console.log('[Newsletter] Contact already subscribed:', { email: maskEmail(email) })
          return NextResponse.json({
            success: true,
            message: "You're already subscribed!",
          })
        }
      }
    } catch (_getError) {
      // Contact doesn't exist (404) or other error - continue with creation
      // Resend returns an error when contact is not found, which is expected
      console.log('[Newsletter] Contact not found, proceeding with creation:', { email: maskEmail(email) })
    }

    // Build contact creation payload
    const contactPayload: {
      email: string
      unsubscribed: boolean
      audienceId: string
    } = {
      email,
      unsubscribed: false,
      audienceId: BLOG_AUDIENCE_ID,
    }

    console.log('[Newsletter] Creating contact:', { email: maskEmail(email), audienceId: BLOG_AUDIENCE_ID })

    // Add contact to Resend
    const { data: _data, error } = await resend.contacts.create(contactPayload)

    if (error) {
      console.error('[Newsletter] Resend API error:', error)
      
      // Check for duplicate email error (fallback - should be caught by get check above)
      if (error.message?.toLowerCase().includes('already exists')) {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed!",
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      )
    }

    console.log('[Newsletter] Contact created successfully:', { email: maskEmail(email) })

    // Send welcome email (don't fail the request if this fails)
    const emailResult = await sendNewsletterWelcome(email)
    if (emailResult.success) {
      console.log('[Newsletter] Welcome email sent to:', maskEmail(email))
    } else {
      console.error('[Newsletter] Failed to send welcome email:', emailResult.error)
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing!',
    })
  } catch (error) {
    console.error('[Newsletter] Unexpected error:', error)

    // Handle any unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Check for duplicate email error from Resend (fallback)
    if (errorMessage.toLowerCase().includes('already exists') || 
        errorMessage.toLowerCase().includes('duplicate')) {
      return NextResponse.json({
        success: true,
        message: "You're already subscribed!",
      })
    }

    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    )
  }
}
