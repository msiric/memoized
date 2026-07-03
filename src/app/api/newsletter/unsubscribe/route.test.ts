import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock environment variables before importing the route
vi.stubEnv('RESEND_TOKEN', 'test-resend-token')
vi.stubEnv('RESEND_BLOG_AUDIENCE_ID', 'test-audience-id')

// Mock the resend contacts methods
const mockContactsUpdate = vi.fn()

// Mock the @/lib/resend module which now exports the resend client
vi.mock('@/lib/resend', () => ({
  resend: {
    contacts: {
      update: mockContactsUpdate,
    },
  },
}))

// Mock verifyUnsubscribeToken
const mockVerifyUnsubscribeToken = vi.fn()
vi.mock('@/utils/token', () => ({
  verifyUnsubscribeToken: (...args: unknown[]) => mockVerifyUnsubscribeToken(...args),
  maskEmail: (email: string) => email.replace(/(.{1}).*@/, '$1***@'),
}))

// Helper to create NextRequest for GET with params
function createRequest(
  params: Record<string, string> = {},
  headers: Record<string, string> = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/newsletter/unsubscribe')
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: {
      ...headers,
    },
  })
}

describe('Newsletter Unsubscribe API', () => {
  let GET: typeof import('./route').GET

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Reset modules to clear rate limit state
    vi.resetModules()
    
    // Re-stub environment variables
    vi.stubEnv('RESEND_TOKEN', 'test-resend-token')
    vi.stubEnv('RESEND_BLOG_AUDIENCE_ID', 'test-audience-id')
    
    // Default mock responses
    mockContactsUpdate.mockResolvedValue({ data: { id: 'test-contact' }, error: null })
    mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'test@example.com' })
    
    // Re-import the route to get fresh rate limit state
    const routeModule = await import('./route')
    GET = routeModule.GET
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Success Cases', () => {
    it('redirects to success page with valid token', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'test@example.com' })
      mockContactsUpdate.mockResolvedValue({ data: { id: 'test' }, error: null })

      const request = createRequest({ token: 'valid-token' })
      const response = await GET(request)

      expect(response.status).toBe(307) // NextResponse.redirect
      expect(response.headers.get('location')).toContain('/blog/unsubscribe?status=success')
      expect(mockContactsUpdate).toHaveBeenCalledWith({
        audienceId: 'test-audience-id',
        id: 'test@example.com',
        unsubscribed: true,
      })
    })

    it('calls verifyUnsubscribeToken with the token', async () => {
      const testToken = 'my-test-token-123'
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'user@example.com' })

      const request = createRequest({ token: testToken })
      await GET(request)

      expect(mockVerifyUnsubscribeToken).toHaveBeenCalledWith(testToken)
    })

    it('returns success for non-existent contact (prevents enumeration)', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'unknown@example.com' })
      mockContactsUpdate.mockResolvedValue({ 
        data: null, 
        error: { message: 'Contact not found' } 
      })

      const request = createRequest({ token: 'valid-token' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/blog/unsubscribe?status=success')
    })
  })

  describe('Legacy Email Support', () => {
    it('supports legacy email parameter', async () => {
      const request = createRequest({ email: 'legacy@example.com' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/blog/unsubscribe?status=success')
      expect(mockContactsUpdate).toHaveBeenCalledWith({
        audienceId: 'test-audience-id',
        id: 'legacy@example.com',
        unsubscribed: true,
      })
    })

    it('normalizes legacy email to lowercase', async () => {
      const request = createRequest({ email: 'LEGACY@EXAMPLE.COM' })
      await GET(request)

      expect(mockContactsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'legacy@example.com' })
      )
    })

    it('handles email normalization (lowercase and trim)', async () => {
      const request = createRequest({ email: 'SPACED@EXAMPLE.COM' })
      await GET(request)

      expect(mockContactsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'spaced@example.com' })
      )
    })

    it('rejects invalid legacy email format', async () => {
      const request = createRequest({ email: 'invalid-email' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=invalid-email')
      expect(mockContactsUpdate).not.toHaveBeenCalled()
    })

    it('rejects legacy email that is too long', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const request = createRequest({ email: longEmail })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=invalid-email')
    })

    it('prefers token over legacy email when both provided', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'token@example.com' })
      
      const request = createRequest({ 
        token: 'valid-token', 
        email: 'legacy@example.com' 
      })
      await GET(request)

      // Should use the email from the token
      expect(mockContactsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'token@example.com' })
      )
    })
  })

  describe('Token Validation', () => {
    it('rejects missing token and email', async () => {
      const request = createRequest({})
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=missing-token')
      expect(mockContactsUpdate).not.toHaveBeenCalled()
    })

    it('rejects expired token', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ 
        valid: false, 
        error: 'expired' 
      })

      const request = createRequest({ token: 'expired-token' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=expired-link')
    })

    it('rejects invalid token signature', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ 
        valid: false, 
        error: 'invalid_signature' 
      })

      const request = createRequest({ token: 'tampered-token' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=invalid-link')
    })

    it('rejects malformed token', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ 
        valid: false, 
        error: 'malformed' 
      })

      const request = createRequest({ token: 'malformed' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=invalid-link')
    })

    it('rejects token with missing email', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ 
        valid: true, 
        email: null 
      })

      const request = createRequest({ token: 'no-email-token' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=invalid-link')
    })
  })

  describe('Rate Limiting', () => {
    it('allows requests under rate limit', async () => {
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: `user${i}@example.com` })
        const request = createRequest(
          { token: `token-${i}` },
          { 'x-forwarded-for': '192.168.1.100' }
        )
        const response = await GET(request)
        expect(response.headers.get('location')).toContain('status=success')
      }
    })

    it('rate limits after exceeding threshold', async () => {
      // Make 10 requests to hit the limit
      for (let i = 0; i < 10; i++) {
        mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: `user${i}@example.com` })
        const request = createRequest(
          { token: `token-${i}` },
          { 'x-forwarded-for': '192.168.1.200' }
        )
        await GET(request)
      }

      // 11th request should be rate limited
      const request = createRequest(
        { token: 'token-11' },
        { 'x-forwarded-for': '192.168.1.200' }
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=rate-limited')
    })

    it('uses different rate limits for different IPs', async () => {
      // Exhaust rate limit for IP1
      for (let i = 0; i < 10; i++) {
        mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: `user${i}@example.com` })
        const request = createRequest(
          { token: `token-${i}` },
          { 'x-forwarded-for': '10.0.0.1' }
        )
        await GET(request)
      }

      // IP1 should be rate limited
      const request1 = createRequest(
        { token: 'token-extra' },
        { 'x-forwarded-for': '10.0.0.1' }
      )
      const response1 = await GET(request1)
      expect(response1.headers.get('location')).toContain('reason=rate-limited')

      // IP2 should still work
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'new@example.com' })
      const request2 = createRequest(
        { token: 'token-new' },
        { 'x-forwarded-for': '10.0.0.2' }
      )
      const response2 = await GET(request2)
      expect(response2.headers.get('location')).toContain('status=success')
    })
  })

  describe('IP Header Parsing', () => {
    it('uses cf-connecting-ip header (Cloudflare)', async () => {
      // Exhaust rate limit for CF IP
      for (let i = 0; i < 10; i++) {
        mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: `user${i}@example.com` })
        const request = createRequest(
          { token: `token-${i}` },
          { 'cf-connecting-ip': '1.1.1.1' }
        )
        await GET(request)
      }

      // Should be rate limited by CF IP
      const request = createRequest(
        { token: 'token-extra' },
        { 'cf-connecting-ip': '1.1.1.1' }
      )
      const response = await GET(request)
      expect(response.headers.get('location')).toContain('reason=rate-limited')
    })

    it('uses x-real-ip header', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: `user${i}@example.com` })
        const request = createRequest(
          { token: `token-${i}` },
          { 'x-real-ip': '2.2.2.2' }
        )
        await GET(request)
      }

      // Should be rate limited by x-real-ip
      const request = createRequest(
        { token: 'token-extra' },
        { 'x-real-ip': '2.2.2.2' }
      )
      const response = await GET(request)
      expect(response.headers.get('location')).toContain('reason=rate-limited')
    })

    it('uses first IP from x-forwarded-for with multiple IPs', async () => {
      // Exhaust rate limit for first IP in chain
      for (let i = 0; i < 10; i++) {
        mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: `user${i}@example.com` })
        const request = createRequest(
          { token: `token-${i}` },
          { 'x-forwarded-for': '3.3.3.3, 4.4.4.4, 5.5.5.5' }
        )
        await GET(request)
      }

      // Should be rate limited by first IP (3.3.3.3)
      const request = createRequest(
        { token: 'token-extra' },
        { 'x-forwarded-for': '3.3.3.3, 6.6.6.6' }
      )
      const response = await GET(request)
      expect(response.headers.get('location')).toContain('reason=rate-limited')
    })
  })

  describe('Error Handling', () => {
    it('redirects to error page on Resend API error', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'test@example.com' })
      mockContactsUpdate.mockResolvedValue({ 
        data: null, 
        error: { message: 'Internal server error' } 
      })

      const request = createRequest({ token: 'valid-token' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=failed')
    })

    it('handles unexpected exceptions gracefully', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'test@example.com' })
      mockContactsUpdate.mockRejectedValue(new Error('Network error'))

      const request = createRequest({ token: 'valid-token' })
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=failed')
    })

    it('redirects to config error for missing BLOG_AUDIENCE_ID', async () => {
      vi.stubEnv('RESEND_BLOG_AUDIENCE_ID', '')
      vi.resetModules()
      
      // Re-import with missing env
      const routeModule = await import('./route')
      const GET_new = routeModule.GET
      
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: true, email: 'test@example.com' })

      const request = createRequest({ token: 'valid-token' })
      const response = await GET_new(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('reason=config')
    })
  })

  describe('Security', () => {
    it('does not leak email in error responses', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: false, error: 'invalid' })

      const request = createRequest({ token: 'bad-token' })
      const response = await GET(request)
      const location = response.headers.get('location') || ''

      // Location should not contain any email
      expect(location).not.toContain('@')
      expect(location).not.toContain('example.com')
    })

    it('does not call Resend API for invalid tokens', async () => {
      mockVerifyUnsubscribeToken.mockReturnValue({ valid: false, error: 'invalid' })

      const request = createRequest({ token: 'invalid-token' })
      await GET(request)

      expect(mockContactsUpdate).not.toHaveBeenCalled()
    })

    it('validates legacy email format before processing', async () => {
      const maliciousEmails = [
        'not-an-email',
        'missing@tld',
        '@nodomain.com',
        'spaces in@email.com',
        'double@@at.com',
      ]

      for (const email of maliciousEmails) {
        const request = createRequest({ email })
        const response = await GET(request)
        
        expect(response.headers.get('location')).toContain('reason=invalid-email')
        expect(mockContactsUpdate).not.toHaveBeenCalled()
      }
    })
  })

  describe('Email Format Validation (Legacy)', () => {
    const validEmails = [
      'simple@example.com',
      'very.common@example.com',
      'user+tag@example.com',
      'name-with-dash@example.com',
      'x@example.com',
    ]

    const invalidEmails = [
      'plainaddress',
      '@no-local-part.com',
      'missing-at-sign.com',
      'double@@sign.com',
    ]

    validEmails.forEach((email) => {
      it(`accepts valid legacy email: ${email}`, async () => {
        const request = createRequest({ email })
        const response = await GET(request)

        expect(response.headers.get('location')).toContain('status=success')
      })
    })

    invalidEmails.forEach((email) => {
      it(`rejects invalid legacy email: ${email}`, async () => {
        const request = createRequest({ email })
        const response = await GET(request)

        expect(response.headers.get('location')).toContain('reason=invalid-email')
      })
    })
  })
})
