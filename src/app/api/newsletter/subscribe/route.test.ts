import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock environment variables before importing the route
vi.stubEnv('RESEND_TOKEN', 'test-resend-token')
vi.stubEnv('RESEND_BLOG_AUDIENCE_ID', 'test-audience-id')

// Mock the resend contacts methods
const mockContactsCreate = vi.fn()
const mockContactsGet = vi.fn()
const mockContactsUpdate = vi.fn()

// Mock resend client from @/lib/resend
vi.mock('@/lib/resend', () => ({
  resend: {
    contacts: {
      create: mockContactsCreate,
      get: mockContactsGet,
      update: mockContactsUpdate,
    },
  },
}))

// Mock sendNewsletterWelcome from @/services/email
const mockSendNewsletterWelcome = vi.fn()
vi.mock('@/services/email', () => ({
  sendNewsletterWelcome: (...args: unknown[]) => mockSendNewsletterWelcome(...args),
}))

// Mock maskEmail
vi.mock('@/utils/token', () => ({
  maskEmail: (email: string) => email.replace(/(.{1}).*@/, '$1***@'),
}))

// Helper to create NextRequest
function createRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const url = 'http://localhost:3000/api/newsletter/subscribe'
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

// Helper to create invalid JSON request
function createInvalidJsonRequest(): NextRequest {
  const url = 'http://localhost:3000/api/newsletter/subscribe'
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: 'invalid json{',
  })
}

describe('Newsletter Subscribe API', () => {
  let POST: typeof import('./route').POST

  beforeEach(async () => {
    vi.clearAllMocks()
    mockContactsCreate.mockReset()
    mockContactsGet.mockReset()
    mockContactsUpdate.mockReset()
    mockSendNewsletterWelcome.mockReset()
    
    // Default: contact doesn't exist (throws error on get)
    mockContactsGet.mockRejectedValue(new Error('Contact not found'))
    
    // Reset module to clear rate limit state
    vi.resetModules()
    
    // Re-stub env after module reset
    vi.stubEnv('RESEND_TOKEN', 'test-resend-token')
    vi.stubEnv('RESEND_BLOG_AUDIENCE_ID', 'test-audience-id')
    
    // Re-import the module to get fresh rate limit state
    const routeModule = await import('./route')
    POST = routeModule.POST
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Success Cases', () => {
    it('returns 200 with valid email', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      const request = createRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Thank you for subscribing!')
    })

    it('sends welcome email on successful subscription', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      const request = createRequest({ email: 'test@example.com' })
      await POST(request)

      expect(mockSendNewsletterWelcome).toHaveBeenCalledWith('test@example.com')
    })

    it('normalizes email to lowercase', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      const request = createRequest({ email: 'TEST@EXAMPLE.COM' })
      await POST(request)

      expect(mockContactsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      )
    })

    it('trims whitespace from email', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      const request = createRequest({ email: '  test@example.com  ' })
      await POST(request)

      expect(mockContactsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      )
    })

    it('returns already subscribed message for existing subscribed contact', async () => {
      // Contact exists and is subscribed
      mockContactsGet.mockResolvedValue({
        data: { id: 'contact-123', email: 'existing@example.com', unsubscribed: false },
        error: null,
      })

      const request = createRequest({ email: 'existing@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("You're already subscribed!")
      // Should not try to create a new contact
      expect(mockContactsCreate).not.toHaveBeenCalled()
      // Should not send welcome email
      expect(mockSendNewsletterWelcome).not.toHaveBeenCalled()
    })

    it('resubscribes previously unsubscribed contact', async () => {
      // Contact exists but is unsubscribed
      mockContactsGet.mockResolvedValue({
        data: { id: 'contact-456', email: 'returning@example.com', unsubscribed: true },
        error: null,
      })
      mockContactsUpdate.mockResolvedValue({ data: { id: 'contact-456' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      const request = createRequest({ email: 'returning@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Welcome back! You have been resubscribed.')
      // Should update the contact to unsubscribed: false
      expect(mockContactsUpdate).toHaveBeenCalledWith({
        audienceId: 'test-audience-id',
        id: 'contact-456',
        unsubscribed: false,
      })
      // Should send welcome email
      expect(mockSendNewsletterWelcome).toHaveBeenCalledWith('returning@example.com')
      // Should not create a new contact
      expect(mockContactsCreate).not.toHaveBeenCalled()
    })

    it('returns success message for duplicate email error (fallback)', async () => {
      // Contact check throws, then create returns duplicate error
      mockContactsGet.mockRejectedValue(new Error('Contact not found'))
      mockContactsCreate.mockResolvedValue({
        data: null,
        error: { message: 'Contact already exists' },
      })

      const request = createRequest({ email: 'existing@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("You're already subscribed!")
    })

    it('succeeds even if welcome email fails', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: false, error: new Error('Email failed') })

      const request = createRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Validation', () => {
    it('returns 400 for missing email', async () => {
      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('returns 400 for null email', async () => {
      const request = createRequest({ email: null })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('returns 400 for non-string email', async () => {
      const request = createRequest({ email: 12345 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('returns 400 for invalid email format', async () => {
      const request = createRequest({ email: 'notanemail' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please enter a valid email address')
    })

    it('returns 400 for email without domain', async () => {
      const request = createRequest({ email: 'test@' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please enter a valid email address')
    })

    it('returns 400 for email > 254 chars', async () => {
      const longEmail = 'a'.repeat(250) + '@test.com'
      const request = createRequest({ email: longEmail })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please enter a valid email address')
    })

    it('returns 400 for invalid JSON body', async () => {
      const request = createInvalidJsonRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })

    it('returns 400 for non-object body', async () => {
      const url = 'http://localhost:3000/api/newsletter/subscribe'
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('just a string'),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 after exceeding IP rate limit', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      // Make 5 successful requests (the limit)
      for (let i = 0; i < 5; i++) {
        const request = createRequest(
          { email: `test${i}@example.com` },
          { 'x-forwarded-for': '192.168.1.1' }
        )
        await POST(request)
      }

      // 6th request should be rate limited
      const request = createRequest(
        { email: 'test5@example.com' },
        { 'x-forwarded-for': '192.168.1.1' }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests. Please try again later.')
    })

    it('includes rate limit headers on 429 response', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        const request = createRequest(
          { email: `test${i}@example.com` },
          { 'x-forwarded-for': '10.0.0.1' }
        )
        await POST(request)
      }

      const request = createRequest(
        { email: 'test5@example.com' },
        { 'x-forwarded-for': '10.0.0.1' }
      )
      const response = await POST(request)

      expect(response.headers.get('Retry-After')).toBe('3600')
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('silently succeeds for rate-limited email (prevents enumeration)', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      // Make 5 requests with same email from different IPs
      for (let i = 0; i < 5; i++) {
        const request = createRequest(
          { email: 'same@example.com' },
          { 'x-forwarded-for': `192.168.${i}.1` }
        )
        await POST(request)
      }

      // 6th request with same email should silently succeed
      const request = createRequest(
        { email: 'same@example.com' },
        { 'x-forwarded-for': '192.168.100.1' }
      )
      const response = await POST(request)
      const data = await response.json()

      // Should return success to prevent email enumeration
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('uses different rate limits for different IPs', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      // Exhaust rate limit for one IP
      for (let i = 0; i < 5; i++) {
        const request = createRequest(
          { email: `test${i}@example.com` },
          { 'x-forwarded-for': '1.1.1.1' }
        )
        await POST(request)
      }

      // Different IP should still work
      const request = createRequest(
        { email: 'new@example.com' },
        { 'x-forwarded-for': '2.2.2.2' }
      )
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('respects Cloudflare cf-connecting-ip header', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      // Exhaust rate limit using cf-connecting-ip
      for (let i = 0; i < 5; i++) {
        const request = createRequest(
          { email: `test${i}@example.com` },
          { 'cf-connecting-ip': '3.3.3.3' }
        )
        await POST(request)
      }

      // Same cf-connecting-ip should be rate limited
      const request = createRequest(
        { email: 'test5@example.com' },
        { 'cf-connecting-ip': '3.3.3.3' }
      )
      const response = await POST(request)

      expect(response.status).toBe(429)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 for missing RESEND_TOKEN', async () => {
      vi.stubEnv('RESEND_TOKEN', '')

      const request = createRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Newsletter service not configured')
    })

    it('returns 500 when Resend contacts.create returns undefined', async () => {
      // Mock returning undefined data (edge case)
      mockContactsCreate.mockResolvedValueOnce({ data: undefined, error: undefined })

      const request = createRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to subscribe. Please try again.')
    })

    it('returns 500 for Resend API errors', async () => {
      mockContactsCreate.mockResolvedValue({
        data: null,
        error: { message: 'Internal server error' },
      })

      const request = createRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to subscribe. Please try again.')
    })

    it('handles unexpected exceptions gracefully', async () => {
      mockContactsCreate.mockRejectedValue(new Error('Network error'))

      const request = createRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to subscribe. Please try again.')
    })
  })

  describe('IP Header Parsing', () => {
    it('uses x-real-ip header', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      // Exhaust rate limit using x-real-ip
      for (let i = 0; i < 5; i++) {
        const request = createRequest(
          { email: `test${i}@example.com` },
          { 'x-real-ip': '4.4.4.4' }
        )
        await POST(request)
      }

      const request = createRequest(
        { email: 'test5@example.com' },
        { 'x-real-ip': '4.4.4.4' }
      )
      const response = await POST(request)

      expect(response.status).toBe(429)
    })

    it('uses first IP from x-forwarded-for with multiple IPs', async () => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        const request = createRequest(
          { email: `test${i}@example.com` },
          { 'x-forwarded-for': '5.5.5.5, 6.6.6.6, 7.7.7.7' }
        )
        await POST(request)
      }

      // Should be rate limited on 5.5.5.5 (first IP)
      const request = createRequest(
        { email: 'test5@example.com' },
        { 'x-forwarded-for': '5.5.5.5, 8.8.8.8' }
      )
      const response = await POST(request)

      expect(response.status).toBe(429)
    })
  })

  describe('Email Format Validation', () => {
    const validEmails = [
      'simple@example.com',
      'very.common@example.com',
      'disposable.style.email.with+symbol@example.com',
      'other.email-with-hyphen@example.com',
      'fully-qualified-domain@example.com',
      'user.name+tag+sorting@example.com',
      'x@example.com',
      'example-indeed@strange-example.com',
      'example@s.example',
    ]

    const invalidEmails = [
      'plainaddress',
      '@no-local-part.com',
      'Abc.example.com',
      'A@b@c@example.com',
      'just"not"right@example.com',
      'this is"not\\allowed@example.com',
      'this\\ still\\"not\\\\allowed@example.com',
    ]

    it.each(validEmails)('accepts valid email: %s', async (email) => {
      mockContactsCreate.mockResolvedValue({ data: { id: 'contact-123' }, error: null })
      mockSendNewsletterWelcome.mockResolvedValue({ success: true })

      const request = createRequest({ email })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it.each(invalidEmails)('rejects invalid email: %s', async (email) => {
      const request = createRequest({ email })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please enter a valid email address')
    })
  })
})
