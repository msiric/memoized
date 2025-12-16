import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import Stripe from 'stripe'

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation((apiKey, config) => ({
    apiKey,
    config,

    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      del: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      list: vi.fn(),
    },
    invoices: {
      create: vi.fn(),
      retrieve: vi.fn(),
      pay: vi.fn(),
      list: vi.fn(),
    },
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
    prices: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
    },
    products: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
  })),
}))

describe('Stripe Library', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()

    process.env = { ...originalEnv }

    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Environment Variables Export', () => {
    it('should export STRIPE_SECRET from environment variable', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'
      process.env.STRIPE_WEBHOOK = 'whsec_123456789'

      const { STRIPE_SECRET, STRIPE_WEBHOOK } = await import('@/lib/stripe')

      expect(STRIPE_SECRET).toBe('sk_test_123456789')
      expect(STRIPE_WEBHOOK).toBe('whsec_123456789')
    })

    it('should export empty strings when environment variables are missing', async () => {
      delete process.env.STRIPE_SECRET
      delete process.env.STRIPE_WEBHOOK

      const { STRIPE_SECRET, STRIPE_WEBHOOK } = await import('@/lib/stripe')

      expect(STRIPE_SECRET).toBe('')
      expect(STRIPE_WEBHOOK).toBe('')
    })

    it('should handle undefined environment variables', async () => {
      process.env.STRIPE_SECRET = undefined as any
      process.env.STRIPE_WEBHOOK = undefined as any

      const { STRIPE_SECRET, STRIPE_WEBHOOK } = await import('@/lib/stripe')

      expect(STRIPE_SECRET).toBe('')
      expect(STRIPE_WEBHOOK).toBe('')
    })

    it('should handle empty string environment variables', async () => {
      process.env.STRIPE_SECRET = ''
      process.env.STRIPE_WEBHOOK = ''

      const { STRIPE_SECRET, STRIPE_WEBHOOK } = await import('@/lib/stripe')

      expect(STRIPE_SECRET).toBe('')
      expect(STRIPE_WEBHOOK).toBe('')
    })
  })

  describe('Stripe Client Instantiation', () => {
    it('should create Stripe instance with correct configuration', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe } = await import('@/lib/stripe')

      expect(Stripe).toHaveBeenCalledWith('sk_test_123456789', {
        apiVersion: '2024-04-10',
      })
      expect(stripe).toBeDefined()
    })

    it('should create Stripe instance with empty secret when not provided', async () => {
      delete process.env.STRIPE_SECRET

      const { stripe } = await import('@/lib/stripe')

      expect(Stripe).toHaveBeenCalledWith('', {
        apiVersion: '2024-04-10',
      })
    })

    it('should use correct API version', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe } = await import('@/lib/stripe')

      const MockedStripe = vi.mocked(Stripe)
      const callArgs = MockedStripe.mock.calls[0]

      expect(callArgs[0]).toBe('sk_test_123456789')
      expect(callArgs[1]).toEqual({ apiVersion: '2024-04-10' })
    })
  })

  describe('Stripe Client Methods', () => {
    it('should have expected Stripe methods', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe } = await import('@/lib/stripe')

      expect(stripe.customers).toBeDefined()
      expect(stripe.subscriptions).toBeDefined()
      expect(stripe.invoices).toBeDefined()
      expect(stripe.paymentIntents).toBeDefined()
      expect(stripe.webhooks).toBeDefined()
      expect(stripe.prices).toBeDefined()
      expect(stripe.products).toBeDefined()
    })

    it('should have expected customer methods', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe } = await import('@/lib/stripe')

      expect(stripe.customers.create).toBeDefined()
      expect(stripe.customers.retrieve).toBeDefined()
      expect(stripe.customers.update).toBeDefined()
      expect(stripe.customers.list).toBeDefined()
      expect(stripe.customers.del).toBeDefined()
      expect(typeof stripe.customers.create).toBe('function')
    })

    it('should have expected subscription methods', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe } = await import('@/lib/stripe')

      expect(stripe.subscriptions.create).toBeDefined()
      expect(stripe.subscriptions.retrieve).toBeDefined()
      expect(stripe.subscriptions.update).toBeDefined()
      expect(stripe.subscriptions.cancel).toBeDefined()
      expect(stripe.subscriptions.list).toBeDefined()
      expect(typeof stripe.subscriptions.create).toBe('function')
    })

    it('should have webhook methods', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe } = await import('@/lib/stripe')

      expect(stripe.webhooks.constructEvent).toBeDefined()
      expect(typeof stripe.webhooks.constructEvent).toBe('function')
    })
  })

  describe('Configuration Validation', () => {
    it('should pass only apiVersion in configuration object', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      await import('@/lib/stripe')

      const MockedStripe = vi.mocked(Stripe)
      const configArg = MockedStripe.mock.calls[0][1]!

      expect(Object.keys(configArg)).toEqual(['apiVersion'])
      expect(configArg.apiVersion).toBe('2024-04-10')
    })

    it('should handle different Stripe key formats', async () => {
      const testCases = [
        'sk_test_123456789',
        'sk_live_123456789',
        'rk_test_123456789',
        'sk_test_51234567890123456789012345678901234567890123456789012345678901234',
      ]

      for (const secretKey of testCases) {
        vi.resetModules()
        process.env.STRIPE_SECRET = secretKey

        const { stripe } = await import('@/lib/stripe')

        expect(Stripe).toHaveBeenCalledWith(secretKey, {
          apiVersion: '2024-04-10',
        })
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle Stripe constructor errors', async () => {
      process.env.STRIPE_SECRET = 'invalid-key'

      const MockedStripe = vi.mocked(Stripe)
      MockedStripe.mockImplementationOnce(() => {
        throw new Error('Invalid API key provided')
      })

      await expect(async () => {
        await import('@/lib/stripe')
      }).rejects.toThrow('Invalid API key provided')
    })

    it('should handle network-related errors from constructor', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const MockedStripe = vi.mocked(Stripe)
      MockedStripe.mockImplementationOnce(() => {
        throw new Error('Network Error: Unable to connect to Stripe')
      })

      await expect(async () => {
        await import('@/lib/stripe')
      }).rejects.toThrow('Network Error: Unable to connect to Stripe')
    })
  })

  describe('Export Validation', () => {
    it('should export all expected named exports', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'
      process.env.STRIPE_WEBHOOK = 'whsec_123456789'

      const stripeModule = await import('@/lib/stripe')

      expect(stripeModule.STRIPE_SECRET).toBeDefined()
      expect(stripeModule.STRIPE_WEBHOOK).toBeDefined()
      expect(stripeModule.stripe).toBeDefined()
      expect(typeof stripeModule.stripe).toBe('object')
    })

    it('should not export as default export', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const stripeModule = await import('@/lib/stripe')

      expect(Object.keys(stripeModule)).toEqual([
        'STRIPE_SECRET',
        'STRIPE_WEBHOOK',
        'stripe',
      ])
    })

    it('should export the same instance on multiple imports', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe: instance1 } = await import('@/lib/stripe')
      const { stripe: instance2 } = await import('@/lib/stripe')

      expect(instance1).toBe(instance2)
      expect(Stripe).toHaveBeenCalledTimes(1)
    })
  })

  describe('Security Considerations', () => {
    it('should not log secret keys in error messages', async () => {
      process.env.STRIPE_SECRET = 'sk_test_secret_key_123456789'

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      try {
        const { STRIPE_SECRET } = await import('@/lib/stripe')

        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('sk_test_secret_key_123456789'),
        )
        expect(consoleErrorSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('sk_test_secret_key_123456789'),
        )
      } finally {
        consoleSpy.mockRestore()
        consoleErrorSpy.mockRestore()
      }
    })

    it('should handle webhook secrets securely', async () => {
      process.env.STRIPE_WEBHOOK = 'whsec_very_secret_webhook_key'

      const { STRIPE_WEBHOOK } = await import('@/lib/stripe')

      expect(STRIPE_WEBHOOK).toBe('whsec_very_secret_webhook_key')
      expect(typeof STRIPE_WEBHOOK).toBe('string')
    })
  })

  describe('Real-world Usage Scenarios', () => {
    it('should handle test environment configuration', async () => {
      process.env.STRIPE_SECRET =
        'sk_test_51234567890123456789012345678901234567890123456789012345678901234'
      process.env.STRIPE_WEBHOOK = 'whsec_test_webhook_secret'

      const { stripe, STRIPE_SECRET, STRIPE_WEBHOOK } = await import(
        '@/lib/stripe'
      )

      expect(STRIPE_SECRET.startsWith('sk_test_')).toBe(true)
      expect(STRIPE_WEBHOOK.startsWith('whsec_')).toBe(true)
      expect(Stripe).toHaveBeenCalledWith(STRIPE_SECRET, {
        apiVersion: '2024-04-10',
      })
    })

    it('should handle production environment configuration', async () => {
      process.env.STRIPE_SECRET =
        'sk_live_51234567890123456789012345678901234567890123456789012345678901234'
      process.env.STRIPE_WEBHOOK = 'whsec_live_webhook_secret'

      const { stripe, STRIPE_SECRET, STRIPE_WEBHOOK } = await import(
        '@/lib/stripe'
      )

      expect(STRIPE_SECRET.startsWith('sk_live_')).toBe(true)
      expect(STRIPE_WEBHOOK.startsWith('whsec_')).toBe(true)
      expect(Stripe).toHaveBeenCalledWith(STRIPE_SECRET, {
        apiVersion: '2024-04-10',
      })
    })

    it('should handle restricted API keys', async () => {
      process.env.STRIPE_SECRET =
        'rk_test_51234567890123456789012345678901234567890123456789012345678901234'

      const { stripe, STRIPE_SECRET } = await import('@/lib/stripe')

      expect(STRIPE_SECRET.startsWith('rk_test_')).toBe(true)
      expect(Stripe).toHaveBeenCalledWith(STRIPE_SECRET, {
        apiVersion: '2024-04-10',
      })
    })
  })

  describe('API Version Management', () => {
    it('should use the correct Stripe API version', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe } = await import('@/lib/stripe')

      const MockedStripe = vi.mocked(Stripe)
      const config = MockedStripe.mock.calls[0][1]!

      expect(config.apiVersion).toBe('2024-04-10')
    })

    it('should maintain API version consistency', async () => {
      process.env.STRIPE_SECRET = 'sk_test_123456789'

      const { stripe: stripe1 } = await import('@/lib/stripe')
      const { stripe: stripe2 } = await import('@/lib/stripe')

      expect(stripe1).toBe(stripe2)
      expect(Stripe).toHaveBeenCalledTimes(1)

      const MockedStripe = vi.mocked(Stripe)
      const config = MockedStripe.mock.calls[0][1]!
      expect(config.apiVersion).toBe('2024-04-10')
    })
  })

  describe('Whitespace and Edge Cases', () => {
    it('should handle whitespace in environment variables', async () => {
      process.env.STRIPE_SECRET = '  sk_test_123456789  '
      process.env.STRIPE_WEBHOOK = '  whsec_123456789  '

      const { STRIPE_SECRET, STRIPE_WEBHOOK } = await import('@/lib/stripe')

      expect(STRIPE_SECRET).toBe('  sk_test_123456789  ')
      expect(STRIPE_WEBHOOK).toBe('  whsec_123456789  ')
    })

    it('should handle special characters in webhook secrets', async () => {
      process.env.STRIPE_WEBHOOK = 'whsec_1234567890abcdef+/='

      const { STRIPE_WEBHOOK } = await import('@/lib/stripe')

      expect(STRIPE_WEBHOOK).toBe('whsec_1234567890abcdef+/=')
    })
  })
})
