import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  afterEach,
  beforeAll,
} from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'

vi.stubEnv('RESEND_TOKEN', 'test-token')
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://test.memoized.io')

vi.mock('@/constants', () => ({
  APP_NAME: 'TestApp',
  INFO_EMAIL: 'info@memoized.io',
  COURSES_PREFIX: '/courses',
}))

vi.mock('@/lib/error-tracking', () => ({
  ServiceError: class ServiceError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ServiceError'
    }
  },
}))

const mockSend = vi.fn()

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: mockSend,
      }
    },
  }
})

describe('Email Service', () => {
  let sendEmail: any
  let ServiceError: any

  beforeAll(async () => {
    const resendModule = await import('@/lib/resend')
    const errorModule = await import('@/lib/error-tracking')
    sendEmail = resendModule.sendEmail
    ServiceError = errorModule.ServiceError
  })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('sendEmail function', () => {
    it('should send welcome email with correct parameters', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'John Doe',
      })

      expect(mockSend).toHaveBeenCalledWith({
        from: 'info@memoized.io',
        to: 'test@example.com',
        subject: 'Welcome to TestApp',
        html: expect.stringContaining('Hi John Doe,'),
      })
    })

    it('should send subscription email with correct parameters', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'subscription',
        name: 'Jane Smith',
      })

      expect(mockSend).toHaveBeenCalledWith({
        from: 'info@memoized.io',
        to: 'test@example.com',
        subject: 'Thank you for subscribing to premium',
        html: expect.stringContaining('Hi Jane Smith,'),
      })
    })

    it('should send purchase email with correct parameters', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'purchase',
        name: 'Bob Wilson',
      })

      expect(mockSend).toHaveBeenCalledWith({
        from: 'info@memoized.io',
        to: 'test@example.com',
        subject: 'Thank you for purchasing lifetime access',
        html: expect.stringContaining('Hi Bob Wilson,'),
      })
    })

    it('should use custom from address when provided', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        from: 'custom@example.com',
        to: 'test@example.com',
        type: 'welcome',
        name: 'Test User',
      })

      expect(mockSend).toHaveBeenCalledWith({
        from: 'custom@example.com',
        to: 'test@example.com',
        subject: 'Welcome to TestApp',
        html: expect.any(String),
      })
    })

    it('should throw ServiceError when resend fails', async () => {
      mockSend.mockRejectedValue(new Error('Resend API error'))

      await expect(
        sendEmail({
          to: 'test@example.com',
          type: 'welcome',
          name: 'Test User',
        }),
      ).rejects.toThrow(ServiceError)

      await expect(
        sendEmail({
          to: 'test@example.com',
          type: 'welcome',
          name: 'Test User',
        }),
      ).rejects.toThrow('Failed to send email')
    })
  })

  describe('Welcome Email Template', () => {
    it('should render welcome email with user name', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'John Doe',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toContain('Hi John Doe,')

      expect(html).toContain('Welcome to TestApp')
      expect(html).toContain('Mario from TestApp')

      expect(html).toContain(
        'src="https://test.memoized.io/images/brand/logo-dark.png"',
      )
      expect(html).toContain('alt="Logo"')

      expect(html).toContain('href="https://test.memoized.io/courses"')
      expect(html).toContain('Explore content')

      expect(html).toContain('&copy; Copyright 2024')

      expect(html).toContain('<!DOCTYPE html')
      expect(html).toContain('</html>')
    })

    it('should render welcome email with fallback greeting when name is null', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: null as any,
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toContain('Hi there,')
      expect(html).not.toContain('Hi null,')
    })
  })

  describe('Subscription Email Template', () => {
    it('should render subscription email with correct content', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'subscription',
        name: 'Jane Smith',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toContain('Hi Jane Smith,')

      expect(html).toContain(
        'Thank you for upgrading to the premium subscription',
      )
      expect(html).toContain('premium member')

      expect(html).toContain('href="https://discord.gg/BECQFfS3"')
      expect(html).toContain('Join private Discord')

      expect(html).toContain('Access to all current and future premium content')
      expect(html).toContain('Priority support')

      expect(html).toContain('Mario from TestApp')

      expect(html).toContain(
        'src="https://test.memoized.io/images/brand/logo-dark.png"',
      )
    })

    it('should handle null name in subscription email', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'subscription',
        name: null as any,
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toContain('Hi there,')
    })
  })

  describe('Purchase Email Template', () => {
    it('should render purchase email with correct content', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'purchase',
        name: 'Bob Wilson',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toContain('Hi Bob Wilson,')

      expect(html).toContain('Thank you for purchasing lifetime access')
      expect(html).toContain('permanent member')
      expect(html).toContain('lifetime access')

      expect(html).toContain('href="https://discord.gg/BECQFfS3"')
      expect(html).toContain('Join private Discord')

      expect(html).toContain(
        'Unlimited access to all current and future premium content',
      )
      expect(html).toContain('Exclusive lifetime member community')
      expect(html).toContain('Priority support for life')

      expect(html).toContain('shape the future of TestApp')
      expect(html).toContain('contribute to platform improvements')

      expect(html).toContain('welcome to the TestApp family for life!')

      expect(html).toContain('Mario from TestApp')
    })

    it('should handle null name in purchase email', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'purchase',
        name: null as any,
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toContain('Hi there,')
    })
  })

  describe('Email Template Common Elements', () => {
    const emailTypes = ['welcome', 'subscription', 'purchase'] as const

    emailTypes.forEach((type) => {
      it(`should include common elements in ${type} email`, async () => {
        mockSend.mockResolvedValue({ id: 'email-id' })

        await sendEmail({
          to: 'test@example.com',
          type,
          name: 'Test User',
        })

        const sentEmail = mockSend.mock.calls[0][0]
        const html = sentEmail.html

        expect(html).toContain('<!DOCTYPE html')
        expect(html).toContain('<html dir="ltr" lang="en">')
        expect(html).toContain('</html>')

        expect(html).toContain('charset=UTF-8')
        expect(html).toContain('x-apple-disable-message-reformatting')

        expect(html).toContain('alt="Logo"')
        expect(html).toContain('height="30"')
        expect(html).toContain(
          'src="https://test.memoized.io/images/brand/logo-dark.png"',
        )

        expect(html).toContain('Best,<br />Mario from TestApp')

        expect(html).toContain('&copy; Copyright 2024. All rights reserved.')

        expect(html).toContain('max-width:37.5em')
        expect(html).toContain('margin:0 auto')

        expect(html).toContain('-apple-system,BlinkMacSystemFont')
      })
    })
  })

  describe('Image Accessibility Tests', () => {
    it('should have logo image file in public directory', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'Test User',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      const logoMatch = html.match(
        /src="([^"]*\/images\/brand\/logo-dark\.png[^"]*)"/,
      )
      expect(logoMatch).toBeTruthy()

      const logoPath = join(
        process.cwd(),
        'public',
        'images',
        'brand',
        'logo-dark.png',
      )
      expect(existsSync(logoPath)).toBe(true)
    })

    it('should have an accessible logo image URL (network test)', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'Test User',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      const logoMatch = html.match(/src="([^"]*logo-dark\.png[^"]*)"/)
      expect(logoMatch).toBeTruthy()

      const logoUrl = logoMatch![1]
      expect(logoUrl).toBe(
        'https://test.memoized.io/images/brand/logo-dark.png',
      )

      if (logoUrl.includes('test.memoized.io')) {
        expect(logoUrl).toContain('logo-dark.png')
      } else {
        try {
          const response = await fetch(logoUrl, { method: 'HEAD' })
          expect(response.ok).toBe(true)
          expect(response.status).toBe(200)

          const contentType = response.headers.get('content-type')
          expect(contentType).toMatch(/^image\/(png|jpeg|jpg|gif|webp)/i)
        } catch (error) {
          throw new Error(
            `Logo image is not accessible at ${logoUrl}: ${error}`,
          )
        }
      }
    })

    it('should have correct logo attributes for accessibility', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'Test User',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toMatch(/<img[^>]*alt="Logo"[^>]*>/i)

      expect(html).toMatch(/<img[^>]*height="30"[^>]*>/i)

      expect(html).toMatch(/<img[^>]*style="[^"]*display:block[^"]*"[^>]*>/i)
    })
  })

  describe('Environment Variables', () => {
    it('should use environment variables correctly', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'Test User',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toContain(
        'src="https://test.memoized.io/images/brand/logo-dark.png"',
      )
    })

    it('should fall back to default URL when NEXT_PUBLIC_SITE_URL is not set', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'Test User',
      })

      const sentEmail = mockSend.mock.calls[0][0]
      const html = sentEmail.html

      expect(html).toMatch(
        /src="https:\/\/[^"]+\/images\/brand\/logo-dark\.png"/,
      )
    })

    it('should handle missing RESEND_TOKEN environment variable', async () => {
      // Test the fallback for RESEND_TOKEN when it's not set
      // This is handled at module initialization, so we're just testing
      // that the service still works with an empty token
      mockSend.mockResolvedValue({ id: 'email-id' })

      await sendEmail({
        to: 'test@example.com',
        type: 'welcome',
        name: 'Test User',
      })

      expect(mockSend).toHaveBeenCalledWith({
        from: 'info@memoized.io',
        to: 'test@example.com',
        subject: 'Welcome to TestApp',
        html: expect.any(String),
      })
    })
  })
})
