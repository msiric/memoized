import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import {
  createBillingPortalSession,
  createOrRetrieveCustomer,
  createStripeSession,
} from '@/services/stripe'
import { PriceWithCoupon } from '@/types'
import { ServiceError } from '@/utils/error'
import { getURL } from '@/utils/helpers'
import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/prisma')
vi.mock('@/lib/stripe')
vi.mock('@/utils/helpers')

describe('Customer Service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createOrRetrieveCustomer', () => {
    it('should retrieve existing customer from database', async () => {
      const mockCustomer = { userId: 'user123', stripeCustomerId: 'cus_123' }
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.customers, 'retrieve').mockResolvedValue({
        id: 'cus_123',
      } as any)

      const result = await createOrRetrieveCustomer({
        userId: 'user123',
        userEmail: 'test@example.com',
      })

      expect(result).toBe('cus_123')
    })

    it('should create new customer in Stripe and database', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null)
      vi.spyOn(stripe.customers, 'list').mockResolvedValue({ data: [] } as any)
      vi.spyOn(stripe.customers, 'create').mockResolvedValue({
        id: 'cus_new123',
      } as any)
      vi.spyOn(prisma.customer, 'upsert').mockResolvedValue({
        stripeCustomerId: 'cus_new123',
      } as any)

      const result = await createOrRetrieveCustomer({
        userId: 'user123',
        userEmail: 'test@example.com',
      })

      expect(result).toBe('cus_new123')
    })

    it('should throw ServiceError if customer creation fails in Stripe', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null)
      vi.spyOn(stripe.customers, 'list').mockResolvedValue({ data: [] } as any)
      vi.spyOn(stripe.customers, 'create').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(
        createOrRetrieveCustomer({
          userId: 'user123',
          userEmail: 'test@example.com',
        }),
      ).rejects.toThrow(
        new ServiceError('Failed to retrieve or create customer'),
      )
    })

    it('should throw ServiceError if database operation fails', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockRejectedValue(
        new Error('Database error'),
      )

      await expect(
        createOrRetrieveCustomer({
          userId: 'user123',
          userEmail: 'test@example.com',
        }),
      ).rejects.toThrow(
        new ServiceError('Failed to retrieve or create customer'),
      )
    })
  })

  describe('createStripeSession', () => {
    it('should create a recurring session', async () => {
      const mockPrice = { id: 'price_123', type: 'recurring' } as Stripe.Price
      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_123',
      } as any)
      vi.mocked(getURL).mockReturnValue('http://localhost:3000')

      const result = await createStripeSession(
        mockPrice as PriceWithCoupon,
        'cus_123',
        '/success',
      )

      expect(result).toEqual({ id: 'cs_123' })
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          customer: 'cus_123',
          line_items: [{ price: 'price_123', quantity: 1 }],
        }),
      )
    })

    it('should create a one-time payment session', async () => {
      const mockPrice = { id: 'price_123', type: 'one_time' } as Stripe.Price
      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_123',
      } as any)
      vi.mocked(getURL).mockReturnValue('http://localhost:3000')

      const result = await createStripeSession(
        mockPrice as PriceWithCoupon,
        'cus_123',
        '/success',
      )

      expect(result).toEqual({ id: 'cs_123' })
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer: 'cus_123',
          line_items: [{ price: 'price_123', quantity: 1 }],
        }),
      )
    })

    it('should throw ServiceError if session creation fails', async () => {
      const mockPrice = { id: 'price_123', type: 'recurring' } as Stripe.Price
      vi.spyOn(stripe.checkout.sessions, 'create').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(
        createStripeSession(
          mockPrice as PriceWithCoupon,
          'cus_123',
          '/success',
        ),
      ).rejects.toThrow(
        new ServiceError('Failed to create Stripe checkout session'),
      )
    })
  })

  describe('createBillingPortalSession', () => {
    it('should create a billing portal session successfully', async () => {
      const mockBillingPortalSession = {
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/test_123',
      }

      vi.spyOn(stripe.billingPortal.sessions, 'create').mockResolvedValue(
        mockBillingPortalSession as any,
      )
      vi.mocked(getURL).mockReturnValue('http://localhost:3000/course')

      const result = await createBillingPortalSession('cus_123')

      expect(result).toEqual(mockBillingPortalSession)
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost:3000/course',
      })
    })

    it('should throw ServiceError if billing portal session creation fails', async () => {
      vi.spyOn(stripe.billingPortal.sessions, 'create').mockRejectedValue(
        new Error('Stripe error'),
      )
      vi.mocked(getURL).mockReturnValue('http://localhost:3000/course')

      await expect(createBillingPortalSession('cus_123')).rejects.toThrow(
        new ServiceError('Failed to create Stripe billing portal link'),
      )
    })
  })
})
