import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import {
  createBillingPortalSession,
  createOrRetrieveCustomer,
  createStripeCoupon,
  createStripeSession,
  deleteStripeCoupon,
  listStripeCoupons,
  retrieveStripeCoupon,
  retrieveStripeSession,
} from '@/services/stripe'
import { ProductWithCoupon } from '@/types'
import { ServiceError } from '@/lib/error-tracking'
import { getURL } from '@/utils/helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mock external dependencies
vi.mock('@/lib/prisma')
vi.mock('@/lib/stripe')
vi.mock('@/utils/helpers')

describe('Stripe services', () => {
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

  describe('retrieveStripeSession', () => {
    it('should successfully retrieve a Stripe checkout session', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'paid',
        // Add other relevant session properties here
      }

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )

      const result = await retrieveStripeSession('cs_test_123')

      expect(result).toEqual(mockSession)
      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
        'cs_test_123',
      )
    })

    it('should throw a ServiceError if Stripe retrieval fails', async () => {
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(retrieveStripeSession('cs_test_456')).rejects.toThrow(
        new ServiceError('Failed to retrieve Stripe checkout session'),
      )

      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
        'cs_test_456',
      )
    })
  })

  describe('createStripeSession', () => {
    it('should create a recurring session', async () => {
      const mockProduct = {
        default_price: {
          id: 'price_123',
          type: 'recurring',
        } as unknown as ProductWithCoupon,
      }
      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_123',
      } as any)
      vi.mocked(getURL).mockReturnValue('http://localhost:3000')

      const result = await createStripeSession(
        mockProduct as unknown as ProductWithCoupon,
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
      const mockProduct = {
        default_price: {
          id: 'price_123',
          type: 'one_time',
        } as unknown as ProductWithCoupon,
      }
      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_123',
      } as any)
      vi.mocked(getURL).mockReturnValue('http://localhost:3000')

      const result = await createStripeSession(
        mockProduct as unknown as ProductWithCoupon,
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
      const mockProduct = {
        default_price: {
          id: 'price_123',
          type: 'recurring',
        } as unknown as ProductWithCoupon,
      }
      vi.spyOn(stripe.checkout.sessions, 'create').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(
        createStripeSession(
          mockProduct as unknown as ProductWithCoupon,
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
      vi.mocked(getURL).mockReturnValue('http://localhost:3000/courses')

      const result = await createBillingPortalSession('cus_123')

      expect(result).toEqual(mockBillingPortalSession)
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost:3000/courses',
      })
    })

    it('should throw ServiceError if billing portal session creation fails', async () => {
      vi.spyOn(stripe.billingPortal.sessions, 'create').mockRejectedValue(
        new Error('Stripe error'),
      )
      vi.mocked(getURL).mockReturnValue('http://localhost:3000/courses')

      await expect(createBillingPortalSession('cus_123')).rejects.toThrow(
        new ServiceError('Failed to create Stripe billing portal link'),
      )
    })
  })

  describe('listStripeCoupons', () => {
    it('should list coupons with default parameters', async () => {
      const mockCoupons = { data: [{ id: 'coupon1' }, { id: 'coupon2' }] }
      vi.spyOn(stripe.coupons, 'list').mockResolvedValue(mockCoupons as any)

      const result = await listStripeCoupons()

      expect(result).toEqual(mockCoupons)
      expect(stripe.coupons.list).toHaveBeenCalledWith({})
    })

    it('should list coupons with custom parameters', async () => {
      const mockCoupons = { data: [{ id: 'coupon1' }] }
      vi.spyOn(stripe.coupons, 'list').mockResolvedValue(mockCoupons as any)

      const params = { limit: 1, starting_after: 'coupon0' }
      const result = await listStripeCoupons(params)

      expect(result).toEqual(mockCoupons)
      expect(stripe.coupons.list).toHaveBeenCalledWith(params)
    })

    it('should throw ServiceError if listing coupons fails', async () => {
      vi.spyOn(stripe.coupons, 'list').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(listStripeCoupons()).rejects.toThrow(
        new ServiceError('Failed to list Stripe coupons'),
      )
    })
  })

  describe('retrieveStripeCoupon', () => {
    it('should retrieve a coupon successfully by name', async () => {
      const mockCoupons = {
        data: [
          { id: 'coupon1', name: 'Test Coupon', percent_off: 20 },
          { id: 'coupon2', name: 'Other Coupon' },
        ],
      }

      vi.spyOn(stripe.coupons, 'list').mockResolvedValue(mockCoupons as any)

      const result = await retrieveStripeCoupon('Test Coupon')

      expect(result).toEqual(mockCoupons.data[0])
      expect(stripe.coupons.list).toHaveBeenCalled()
    })

    it('should throw ServiceError if coupon is not found in the list', async () => {
      const mockCoupons = { data: [{ id: 'coupon1', name: 'Other Coupon' }] }

      vi.spyOn(stripe.coupons, 'list').mockResolvedValue(mockCoupons as any)

      await expect(retrieveStripeCoupon('Non-existent Coupon')).rejects.toThrow(
        new ServiceError('Failed to retrieve Stripe coupon'),
      )
    })

    it('should throw ServiceError if listing coupons fails', async () => {
      vi.spyOn(stripe.coupons, 'list').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(retrieveStripeCoupon('Test Coupon')).rejects.toThrow(
        new ServiceError('Failed to retrieve Stripe coupon'),
      )
    })
  })

  describe('deleteStripeCoupon', () => {
    it('should delete a coupon successfully', async () => {
      const mockDeletedCoupon = { id: 'coupon1', deleted: true }
      vi.spyOn(stripe.coupons, 'del').mockResolvedValue(
        mockDeletedCoupon as any,
      )

      const result = await deleteStripeCoupon('coupon1')

      expect(result).toEqual(mockDeletedCoupon)
      expect(stripe.coupons.del).toHaveBeenCalledWith('coupon1')
    })

    it('should throw ServiceError if deleting coupon fails', async () => {
      vi.spyOn(stripe.coupons, 'del').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(deleteStripeCoupon('invalid_coupon')).rejects.toThrow(
        new ServiceError('Failed to delete Stripe coupon'),
      )
    })
  })

  describe('createStripeCoupon', () => {
    it('should delete existing valid coupon and create a new one', async () => {
      const couponConfig = {
        name: 'Existing Valid Coupon',
        percent_off: 25,
        duration: 'once' as const,
      }
      const existingCoupon = {
        id: 'existing_coupon',
        name: 'Existing Valid Coupon',
        valid: true,
      }
      const newCoupon = { id: 'new_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'list').mockResolvedValue({
        data: [existingCoupon],
      } as any)
      vi.spyOn(stripe.coupons, 'del').mockResolvedValue({
        id: 'existing_coupon',
        deleted: true,
      } as any)
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(newCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: newCoupon, promotionCode: null })
      expect(stripe.coupons.list).toHaveBeenCalled()
      expect(stripe.coupons.del).toHaveBeenCalledWith('existing_coupon')
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should not delete existing invalid coupon and create a new one', async () => {
      const couponConfig = {
        name: 'Existing Invalid Coupon',
        percent_off: 25,
        duration: 'once' as const,
      }
      const existingCoupon = {
        id: 'existing_coupon',
        name: 'Existing Invalid Coupon',
        valid: false,
      }
      const newCoupon = { id: 'new_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'list').mockResolvedValue({
        data: [existingCoupon],
      } as any)
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(newCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: newCoupon, promotionCode: null })
      expect(stripe.coupons.list).toHaveBeenCalled()
      expect(stripe.coupons.del).not.toHaveBeenCalled()
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should handle errors when deleting an existing coupon', async () => {
      const couponConfig = {
        name: 'Existing Coupon',
        percent_off: 25,
        duration: 'once' as const,
      }

      vi.spyOn(stripe.coupons, 'list').mockResolvedValue({
        data: [{ id: 'existing_coupon', name: 'Existing Coupon', valid: true }],
      } as any)
      vi.spyOn(stripe.coupons, 'del').mockRejectedValue(
        new Error('Deletion failed'),
      )

      await expect(createStripeCoupon(couponConfig)).rejects.toThrow(
        new ServiceError('Failed to manage Stripe coupon'),
      )
      expect(stripe.coupons.create).not.toHaveBeenCalled()
    })

    it('should throw ServiceError if coupon creation fails', async () => {
      const couponConfig = {
        name: 'Failed Coupon',
        percent_off: 10,
        duration: 'once' as const,
      }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(createStripeCoupon(couponConfig)).rejects.toThrow(
        new ServiceError('Failed to manage Stripe coupon'),
      )
    })

    it('should create a percentage off coupon', async () => {
      const couponConfig = {
        name: 'Percent Off Coupon',
        percent_off: 25,
        duration: 'once' as const,
      }
      const mockCoupon = { id: 'percent_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(mockCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: mockCoupon, promotionCode: null })
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should create a fixed amount off coupon', async () => {
      const couponConfig = {
        name: 'Fixed Amount Off Coupon',
        amount_off: 1000, // $10 off
        currency: 'usd',
        duration: 'once' as const,
      }
      const mockCoupon = { id: 'fixed_amount_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(mockCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: mockCoupon, promotionCode: null })
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should create a coupon with forever duration', async () => {
      const couponConfig = {
        name: 'Forever Coupon',
        percent_off: 10,
        duration: 'forever' as const,
      }
      const mockCoupon = { id: 'forever_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(mockCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: mockCoupon, promotionCode: null })
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should create a coupon with repeating duration', async () => {
      const couponConfig = {
        name: 'Repeating Coupon',
        percent_off: 15,
        duration: 'repeating' as const,
        duration_in_months: 3,
      }
      const mockCoupon = { id: 'repeating_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(mockCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: mockCoupon, promotionCode: null })
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should create a coupon with max redemptions', async () => {
      const couponConfig = {
        name: 'Limited Redemptions Coupon',
        percent_off: 30,
        duration: 'once' as const,
        max_redemptions: 100,
      }
      const mockCoupon = { id: 'limited_redemptions_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(mockCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: mockCoupon, promotionCode: null })
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should create a coupon with redeem_by date', async () => {
      const redeemBy = new Date('2023-12-31T23:59:59Z')
      const couponConfig = {
        name: 'Expiring Coupon',
        percent_off: 20,
        duration: 'once' as const,
        redeem_by: redeemBy,
      }
      const mockCoupon = {
        id: 'expiring_coupon',
        ...couponConfig,
        redeem_by: Math.floor(redeemBy.getTime() / 1000),
      }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(mockCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: mockCoupon, promotionCode: null })
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...couponConfig,
          redeem_by: Math.floor(redeemBy.getTime() / 1000),
        }),
      )
    })

    it('should create a coupon that applies to specific products', async () => {
      const couponConfig = {
        name: 'Product Specific Coupon',
        percent_off: 15,
        duration: 'once' as const,
        applies_to: { products: ['prod_123', 'prod_456'] },
      }
      const mockCoupon = { id: 'product_specific_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'retrieve').mockRejectedValue(
        new Error('Not found'),
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(mockCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: mockCoupon, promotionCode: null })
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should throw an error if both percent_off and amount_off are provided', async () => {
      const couponConfig = {
        name: 'Invalid Coupon',
        percent_off: 10,
        amount_off: 1000,
        currency: 'usd',
        duration: 'once' as const,
      }

      await expect(createStripeCoupon(couponConfig)).rejects.toThrow(
        new ServiceError('Failed to manage Stripe coupon'),
      )
    })

    it('should throw an error if amount_off is provided without currency', async () => {
      const couponConfig = {
        name: 'Invalid Coupon',
        amount_off: 1000,
        duration: 'once' as const,
      }

      await expect(createStripeCoupon(couponConfig)).rejects.toThrow(
        new ServiceError('Failed to manage Stripe coupon'),
      )
    })

    it('should throw an error if duration is repeating but duration_in_months is not provided', async () => {
      const couponConfig = {
        name: 'Invalid Repeating Coupon',
        percent_off: 15,
        duration: 'repeating' as const,
      }

      await expect(createStripeCoupon(couponConfig)).rejects.toThrow(
        new ServiceError('Failed to manage Stripe coupon'),
      )
    })

    it('should handle errors when deleting an existing coupon', async () => {
      const couponConfig = {
        name: 'Existing Coupon',
        percent_off: 25,
        duration: 'once' as const,
      }

      vi.spyOn(stripe.coupons, 'retrieve').mockResolvedValue({
        id: 'existing_coupon',
      } as any)
      vi.spyOn(stripe.coupons, 'del').mockRejectedValue(
        new Error('Deletion failed'),
      )

      await expect(createStripeCoupon(couponConfig)).rejects.toThrow(
        new ServiceError('Failed to manage Stripe coupon'),
      )
    })

    it('should delete existing valid coupon and create a new one', async () => {
      const couponConfig = {
        name: 'Existing Valid Coupon',
        percent_off: 25,
        duration: 'once' as const,
      }
      const existingCoupon = {
        id: 'existing_coupon',
        name: 'Existing Valid Coupon',
        valid: true,
      }
      const newCoupon = { id: 'new_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'list').mockResolvedValue({
        data: [existingCoupon],
      } as any)
      vi.spyOn(stripe.coupons, 'retrieve').mockResolvedValue(
        existingCoupon as any,
      )
      vi.spyOn(stripe.coupons, 'del').mockResolvedValue({
        id: 'existing_coupon',
        deleted: true,
      } as any)
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(newCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: newCoupon, promotionCode: null })
      expect(stripe.coupons.list).toHaveBeenCalled()
      expect(stripe.coupons.del).toHaveBeenCalledWith('existing_coupon')
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })

    it('should not delete existing invalid coupon and create a new one', async () => {
      const couponConfig = {
        name: 'Existing Invalid Coupon',
        percent_off: 25,
        duration: 'once' as const,
      }
      const existingCoupon = {
        id: 'existing_coupon',
        name: 'Existing Invalid Coupon',
        valid: false,
      }
      const newCoupon = { id: 'new_coupon', ...couponConfig }

      vi.spyOn(stripe.coupons, 'list').mockResolvedValue({
        data: [existingCoupon],
      } as any)
      vi.spyOn(stripe.coupons, 'retrieve').mockResolvedValue(
        existingCoupon as any,
      )
      vi.spyOn(stripe.coupons, 'create').mockResolvedValue(newCoupon as any)

      const result = await createStripeCoupon(couponConfig)

      expect(result).toEqual({ coupon: newCoupon, promotionCode: null })
      expect(stripe.coupons.list).toHaveBeenCalled()
      expect(stripe.coupons.del).not.toHaveBeenCalled()
      expect(stripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining(couponConfig),
      )
    })
  })
})
