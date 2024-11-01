import { PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '@/constants'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import {
  CouponConfig,
  ListCouponsParams,
  ProductWithCoupon,
  PromotionCodeConfig,
} from '@/types'
import { ServiceError } from '@/utils/error'
import { getURL } from '@/utils/helpers'
import Stripe from 'stripe'

// const upsertProductRecord = async (product: Stripe.Product) => {
//   const productData = {
//     id: product.id,
//     active: product.active,
//     name: product.name,
//     description: product.description ?? null,
//     image: product.images?.[0] ?? null,
//     metadata: product.metadata,
//   }

//   await prisma.product.upsert({
//     where: { id: product.id },
//     update: productData,
//     create: productData,
//   })

//   console.log(`Product inserted/updated: ${product.id}`)
// }

// const upsertPriceRecord = async (
//   price: Stripe.Price,
//   retryCount = 0,
//   maxRetries = 3,
// ) => {
//   const priceData = {
//     id: price.id,
//     productId: typeof price.product === 'string' ? price.product : '',
//     active: price.active,
//     currency: price.currency,
//     type: price.type,
//     unitAmount: price.unit_amount ?? null,
//     interval: price.recurring?.interval ?? null,
//     intervalCount: price.recurring?.interval_count ?? null,
//   }

//   try {
//     await prisma.price.upsert({
//       where: { id: price.id },
//       update: priceData,
//       create: priceData,
//     })

//     console.log(`Price inserted/updated: ${price.id}`)
//   } catch (error: any) {
//     if (
//       error.message.includes('foreign key constraint') &&
//       retryCount < maxRetries
//     ) {
//       console.log(`Retry attempt ${retryCount + 1} for price ID: ${price.id}`)
//       await new Promise((resolve) => setTimeout(resolve, 2000))
//       await upsertPriceRecord(price, retryCount + 1, maxRetries)
//     } else {
//       throw new Error(
//         `Price insert/update failed after ${maxRetries} retries: ${error.message}`,
//       )
//     }
//   }
// }

// const deleteProductRecord = async (product: Stripe.Product) => {
//   await prisma.product.delete({
//     where: { id: product.id },
//   })

//   console.log(`Product deleted: ${product.id}`)
// }

// const deletePriceRecord = async (price: Stripe.Price) => {
//   await prisma.price.delete({
//     where: { id: price.id },
//   })

//   console.log(`Price deleted: ${price.id}`)
// }

const upsertCustomerToDatabase = async (
  userId: string,
  stripeCustomerId: string,
) => {
  await prisma.customer.upsert({
    where: { userId },
    update: { stripeCustomerId },
    create: { userId, stripeCustomerId },
  })

  return stripeCustomerId
}

const createCustomerInStripe = async (userId: string, userEmail: string) => {
  try {
    const customerData = {
      metadata: { databaseUUID: userId },
      email: userEmail,
    }
    const newCustomer = await stripe.customers.create(customerData)

    if (!newCustomer)
      throw new ServiceError('Failed to create customer in Stripe')

    return newCustomer.id
  } catch (error) {
    throw new ServiceError('Failed to create customer in Stripe')
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

    let stripeCustomerId: string | undefined

    if (existingCustomer?.stripeCustomerId) {
      const existingStripeCustomer = await stripe.customers.retrieve(
        existingCustomer.stripeCustomerId,
      )
      stripeCustomerId = existingStripeCustomer.id
    } else {
      const stripeCustomers = await stripe.customers.list({ email: userEmail })
      stripeCustomerId =
        stripeCustomers.data.length > 0 ? stripeCustomers.data[0].id : undefined
    }

    const stripeIdToInsert = stripeCustomerId
      ? stripeCustomerId
      : await createCustomerInStripe(userId, userEmail)

    if (existingCustomer && stripeCustomerId) {
      if (existingCustomer.stripeCustomerId !== stripeCustomerId) {
        await prisma.customer.update({
          where: { userId },
          data: { stripeCustomerId },
        })
      }
      return stripeCustomerId
    } else {
      const upsertedCustomer = await upsertCustomerToDatabase(
        userId,
        stripeIdToInsert,
      )

      if (!upsertedCustomer)
        throw new ServiceError('Failed to create customer in Stripe')

      return upsertedCustomer
    }
  } catch (error) {
    throw new ServiceError('Failed to retrieve or create customer')
  }
}

export const retrieveStripeSession = async (sessionId: string) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session
  } catch (error) {
    throw new ServiceError('Failed to retrieve Stripe checkout session')
  }
}

export const createStripeSession = async (
  product: ProductWithCoupon,
  customer: string,
  redirectPath: string = `/courses?${PREMIUM_QUERY_PARAM}=true&${SESSION_QUERY_PARAM}={CHECKOUT_SESSION_ID}`,
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
      cancel_url: getURL('/courses'),
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

    const checkoutSession = await stripe.checkout.sessions.create(params)
    return checkoutSession
  } catch (error) {
    throw new ServiceError('Failed to create Stripe checkout session')
  }
}

export const createBillingPortalSession = async (customer: string) => {
  try {
    const billingSession = await stripe.billingPortal.sessions.create({
      customer,
      return_url: getURL('/courses'),
    })
    return billingSession
  } catch (error) {
    throw new ServiceError('Failed to create Stripe billing portal link')
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

    // Remove undefined values
    Object.keys(listParams).forEach(
      (key) =>
        listParams[key as keyof typeof listParams] === undefined &&
        delete listParams[key as keyof typeof listParams],
    )

    const coupons = await stripe.coupons.list(listParams)
    console.log(`Retrieved ${coupons.data.length} coupons`)
    return coupons
  } catch (error) {
    console.error(`Failed to list Stripe coupons:`, error)
    throw new ServiceError('Failed to list Stripe coupons')
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
    console.error(`Failed to retrieve Stripe coupon:`, error)
    throw new ServiceError('Failed to retrieve Stripe coupon')
  }
}

export const deleteStripeCoupon = async (
  couponId: string,
): Promise<Stripe.DeletedCoupon> => {
  try {
    const deletedCoupon = await stripe.coupons.del(couponId)
    console.log(`Deleted Stripe coupon: ${deletedCoupon.id}`)
    return deletedCoupon
  } catch (error) {
    console.error(`Failed to delete Stripe coupon:`, error)
    throw new ServiceError('Failed to delete Stripe coupon')
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
      console.log('Existing coupon found:', existingCoupon)
    } catch (error) {
      console.log(
        'No existing coupon found, or error retrieving coupon:',
        error,
      )
    }

    if (existingCoupon?.valid) {
      console.log('Deleting existing valid coupon')
      try {
        await deleteStripeCoupon(existingCoupon.id)
      } catch (error) {
        console.error('Error deleting existing coupon:', error)
        throw new ServiceError('Failed to delete existing coupon')
      }
    } else if (existingCoupon && !existingCoupon.valid) {
      console.log(
        'Existing coupon found but it is not valid. Proceeding to create a new one.',
      )
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
    console.log(`Created new Stripe coupon: ${coupon.id}`)

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
      console.log(`Created new promotion code: ${promotionCode.code}`)
    }

    return { coupon, promotionCode }
  } catch (error) {
    console.error(`Failed to manage Stripe coupon:`, error)
    throw new ServiceError('Failed to manage Stripe coupon')
  }
}
