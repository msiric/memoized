import { Footer } from '@/components/Footer'
import { MinimalHeader } from '@/components/MinimalHeader'
import { PricingTable } from '@/components/PricingTable'
import TopBanner from '@/components/TopBanner'
import { getActiveBanners } from '@/services/banner'
import { getActiveCoupons, getActiveProducts } from '@/services/stripe'
import { getUserWithSubscriptions } from '@/services/user'
import { ProductWithCoupon, UserWithSubscriptionsAndProgress } from '@/types'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { authOptions } from '../api/auth/[...nextauth]/route'

export default async function Premium() {
  const session = await getServerSession(authOptions)
  const user = session && (await getUserWithSubscriptions(session?.userId))

  const [banners, coupons, products] = await Promise.all([
    getActiveBanners(),
    getActiveCoupons(),
    getActiveProducts(),
  ])

  const productsWithCoupons = products.map((product) => {
    const price = product.default_price as Stripe.Price
    const appliedCoupon = coupons.find(
      (coupon) =>
        coupon.valid && coupon.applies_to?.products?.includes(product.id),
    )

    return {
      ...product,
      default_price: {
        ...price,
        appliedCoupon: appliedCoupon
          ? {
              id: appliedCoupon.id,
              name: appliedCoupon.name,
              percentOff: appliedCoupon.percent_off,
              amountOff: appliedCoupon.amount_off,
            }
          : null,
      },
    }
  })

  return (
    <section className="bg-white dark:bg-zinc-900">
      {banners.map((banner) => (
        <TopBanner
          key={banner.id}
          title={banner.title}
          message={banner.message}
          type={banner.type}
          link={
            banner.linkUrl
              ? { text: banner.linkText!, url: banner.linkUrl }
              : undefined
          }
          showButton={false}
        />
      ))}
      <MinimalHeader />
      <div className="mx-auto mt-6 max-w-screen-xl px-4 py-4 xs:py-8 md:py-16 lg:px-6">
        <div className="mx-auto mb-8 max-w-screen-md text-center lg:mb-12">
          <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-900 xs:text-3xl md:text-4xl dark:text-white">
            The ultimate JavaScript platform for mastering coding interviews
          </h2>
          <p className="mb-5 font-light text-zinc-600 sm:text-xl dark:text-zinc-400">
            Invest in your future, enhance your skills and land your dream job
            with confidence
          </p>
        </div>
        <PricingTable
          products={productsWithCoupons as ProductWithCoupon[]}
          user={user as UserWithSubscriptionsAndProgress | null}
        />
      </div>
      <Footer />
    </section>
  )
}
