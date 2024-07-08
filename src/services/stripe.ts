import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

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
  const customerData = { metadata: { databaseUUID: userId }, email: userEmail }
  const newCustomer = await stripe.customers.create(customerData)

  if (!newCustomer) throw new Error('Stripe customer creation failed.')

  return newCustomer.id
}

export const createOrRetrieveCustomer = async ({
  userId,
  userEmail,
}: {
  userId: string
  userEmail: string
}) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: { userId },
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

      console.warn(
        `Database customer record mismatched Stripe ID. Database record updated.`,
      )
    }
    return stripeCustomerId
  } else {
    console.warn(
      `Database customer record was missing. A new record was created.`,
    )
    const upsertedCustomer = await upsertCustomerToDatabase(
      userId,
      stripeIdToInsert,
    )

    if (!upsertedCustomer)
      throw new Error('Database customer record creation failed.')

    return upsertedCustomer
  }
}
