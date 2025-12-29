import {
  COURSES_PREFIX,
  PREMIUM_QUERY_PARAM,
  SESSION_QUERY_PARAM,
} from '@/constants'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import {
  CouponConfig,
  ListCouponsParams,
  ProductWithCoupon,
  PromotionCodeConfig,
} from '@/types'
import { ServiceError } from '@/lib/error-tracking'
import { getURL } from '@/utils/helpers'
import { revalidateCustomer } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'

const createCustomerInStripe = async (userId: string, userEmail: string) => {
  try {
    const customerData = {
      metadata: { databaseUUID: userId },
      email: userEmail,
    }
    // Use userId as idempotency key to prevent duplicate customers on retry
    const newCustomer = await stripe.customers.create(customerData, {
      idempotencyKey: `create-customer-${userId}`,
    })

    if (!newCustomer)
      throw new ServiceError('Failed to create customer in Stripe')

    return newCustomer.id
  } catch (error) {
    throw new ServiceError(
      'Failed to create customer in Stripe',
      true,
      { feature: 'stripe', action: 'create-customer' },
      error,
    )
  }
}

export const createOrRetrieveCustomer = async ({
  userId,
  userEmail,
}: {
  userId: string
  userEmail: string
}) => {
  try {
    const existingCustomer = await prisma.customer.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    })

    if (existingCustomer?.stripeCustomerId) {
      return existingCustomer.stripeCustomerId
    }

    const stripeCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    })

    let stripeCustomerId = stripeCustomers.data[0]?.id

    if (!stripeCustomerId) {
      stripeCustomerId = await createCustomerInStripe(userId, userEmail)
    }

    await prisma.customer.upsert({
      where: { userId },
      update: { stripeCustomerId },
      create: { userId, stripeCustomerId },
    })

    revalidateCustomer({ userId, stripeCustomerId })

    return stripeCustomerId
  } catch (error) {
    throw new ServiceError(
      'Failed to retrieve or create customer',
      true,
      { feature: 'stripe', action: 'create-or-retrieve-customer' },
      error,
    )
  }
}

export const retrieveStripeSession = async (sessionId: string) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session
  } catch (error) {
    throw new ServiceError(
      'Failed to retrieve Stripe checkout session',
      true,
      { feature: 'stripe', action: 'retrieve-session' },
      error,
    )
  }
}

export const createStripeSession = async (
  product: ProductWithCoupon,
  customer: string,
  redirectPath: string = `${COURSES_PREFIX}?${PREMIUM_QUERY_PARAM}=true&${SESSION_QUERY_PARAM}={CHECKOUT_SESSION_ID}`,
) => {
  try {
    let params: Stripe.Checkout.SessionCreateParams = {
      billing_address_collection: 'required',
      customer,
      client_reference_id: customer,
      customer_update: {
        address: 'auto',
      },
      line_items: [
        {
          price: product.default_price?.id,
          quantity: 1,
        },
      ],
      ...(product?.default_price?.appliedCoupon?.id && {
        discounts: [
          {
            coupon: product.default_price.appliedCoupon?.id,
          },
        ],
      }),
      cancel_url: getURL(COURSES_PREFIX),
      success_url: getURL(redirectPath),
    }

    if (product.default_price.type === 'recurring') {
      params = {
        ...params,
        mode: 'subscription',
      }
    } else if (product.default_price.type === 'one_time') {
      params = {
        ...params,
        mode: 'payment',
      }
    }

    // Use customer + product + timestamp (rounded to minute) as idempotency key
    // This allows retries within the same minute but blocks rapid duplicates
    const timestamp = Math.floor(Date.now() / 60000)
    const checkoutSession = await stripe.checkout.sessions.create(params, {
      idempotencyKey: `checkout-${customer}-${product.id}-${timestamp}`,
    })

    revalidatePath('/', 'layout')

    return checkoutSession
  } catch (error) {
    throw new ServiceError(
      'Failed to create Stripe checkout session',
      true,
      { feature: 'stripe', action: 'create-session' },
      error,
    )
  }
}

export const createBillingPortalSession = async (customer: string) => {
  try {
    const billingSession = await stripe.billingPortal.sessions.create({
      customer,
      return_url: getURL(COURSES_PREFIX),
    })
    return billingSession
  } catch (error) {
    throw new ServiceError(
      'Failed to create Stripe billing portal link',
      true,
      { feature: 'stripe', action: 'create-billing-portal' },
      error,
    )
  }
}

export const getActiveCoupons = async () => {
  const coupons = await stripe.coupons.list({ expand: ['data.applies_to'] })
  return coupons.data
}

export const getActiveProducts = async () => {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  })
  return products.data
}

export const listStripeCoupons = async (
  params: ListCouponsParams = {},
): Promise<Stripe.ApiList<Stripe.Coupon>> => {
  try {
    const { created, ending_before, starting_after, limit } = params

    const listParams: Stripe.CouponListParams = {
      created,
      ending_before,
      starting_after,
      limit,
    }

    Object.keys(listParams).forEach(
      (key) =>
        listParams[key as keyof typeof listParams] === undefined &&
        delete listParams[key as keyof typeof listParams],
    )

    const coupons = await stripe.coupons.list(listParams)
    return coupons
  } catch (error) {
    throw new ServiceError(
      'Failed to list Stripe coupons',
      true,
      { feature: 'stripe', action: 'list-coupons' },
      error,
    )
  }
}

export const retrieveStripeCoupon = async (
  couponName: string,
): Promise<Stripe.Coupon> => {
  try {
    const coupons = await listStripeCoupons()
    const coupon = coupons.data.find((coupon) => coupon.name === couponName)
    if (!coupon) {
      throw new Error('Coupon not found')
    }
    return coupon
  } catch (error) {
    throw new ServiceError(
      'Failed to retrieve Stripe coupon',
      true,
      { feature: 'stripe', action: 'retrieve-coupon' },
      error,
    )
  }
}

export const deleteStripeCoupon = async (
  couponId: string,
): Promise<Stripe.DeletedCoupon> => {
  try {
    const deletedCoupon = await stripe.coupons.del(couponId)
    return deletedCoupon
  } catch (error) {
    throw new ServiceError(
      'Failed to delete Stripe coupon',
      true,
      { feature: 'stripe', action: 'delete-coupon' },
      error,
    )
  }
}

export const createStripeCoupon = async (
  couponConfig: CouponConfig,
  promotionCodeConfig?: PromotionCodeConfig,
) => {
  try {
    let existingCoupon: Stripe.Coupon | null = null
    try {
      existingCoupon = await retrieveStripeCoupon(couponConfig.name)
    } catch {
      // No existing coupon found - proceed to create new one
    }

    if (existingCoupon?.valid) {
      try {
        await deleteStripeCoupon(existingCoupon.id)
      } catch (error) {
        throw new ServiceError(
          'Failed to delete existing coupon',
          true,
          { feature: 'stripe', action: 'create-coupon' },
          error,
        )
      }
    }

    const couponParams: Stripe.CouponCreateParams = {
      ...couponConfig,
      redeem_by: couponConfig.redeem_by
        ? Math.floor(couponConfig.redeem_by.getTime() / 1000)
        : undefined,
    }

    if (couponConfig.applies_to?.products) {
      couponParams.applies_to = { products: couponConfig.applies_to.products }
    }

    const coupon = await stripe.coupons.create(couponParams)

    let promotionCode: Stripe.PromotionCode | null = null

    if (promotionCodeConfig) {
      const promoCodeParams: Stripe.PromotionCodeCreateParams = {
        coupon: coupon.id,
        ...promotionCodeConfig,
        expires_at: promotionCodeConfig.expires_at
          ? Math.floor(promotionCodeConfig.expires_at.getTime() / 1000)
          : undefined,
      }

      promotionCode = await stripe.promotionCodes.create(promoCodeParams)
    }

    return { coupon, promotionCode }
  } catch (error) {
    throw new ServiceError(
      'Failed to manage Stripe coupon',
      true,
      { feature: 'stripe', action: 'create-coupon' },
      error,
    )
  }
}
