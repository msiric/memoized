import { getActiveCoupons, getActiveProducts } from '@/services/stripe'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { ProductWithCoupon, UserWithSubscriptionsAndProgress } from '@/types'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { PricingTable } from '../../components/PricingTable'
import { PricingUrgencyMessages } from '../../components/PricingUrgencyMessages'
import { TimeLimitedOffer } from '../../components/TimeLimitedOffer'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { APP_NAME } from '../../constants'
import { SectionContainer } from '@/components/SectionContainer'
import { StatCard } from '@/components/StatCard'
import { FeatureCard } from '@/components/FeatureCard'
import { FAQCard } from '@/components/FAQCard'
import { FeatureShowcase } from '@/components/FeatureShowcase'
import { SectionHeader } from '@/components/SectionHeader'
import {
  LightningIcon,
  BookIcon,
  ChartIcon,
  ClockIcon,
  UserIcon,
  HeartIcon,
  ClipboardCheckIcon,
  FlaskIcon
} from '@/components/icons'
import { HiSparkles } from 'react-icons/hi2'
import { CONTAINER } from '@/constants/designTokens'

export default async function Premium() {
  const session = await getServerSession(authOptions)
  const user =
    session && (await getUserWithSubscriptionDetails(session?.userId))

  const [coupons, products] = await Promise.all([
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
              redeemBy: appliedCoupon.redeem_by,
            }
          : null,
      },
    }
  })

  return (
    <>
      {/* Hero Section */}
      <SectionContainer width="wide" padding="standard">
        <SectionHeader
          headingLevel="h1"
          className="mx-auto max-w-4xl"
          badge={{
            text: 'Premium Access',
            icon: <HiSparkles />,
            variant: 'lime',
          }}
          heading="Dominate JavaScript Interviews:"
          gradientText="From Basics to Offer Letters"
          description={
            <>
              Transform your interview performance with comprehensive training
              that covers both{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                algorithmic mastery
              </span>{' '}
              and{' '}
              <span className="font-semibold text-lime-600 dark:text-lime-400">
                JavaScript expertise
              </span>
              . Join thousands of developers who&apos;ve accelerated their
              careers.
            </>
          }
        />

        {/* Success Stats + Limited Time Offer - Cohesive Group */}
        <div className="mx-auto max-w-xl">
          <div className="mb-6 grid grid-cols-3 items-stretch gap-3 sm:gap-6 lg:gap-8">
            <StatCard value="89%" label="Interview Pass Rate" variant="lime" />
            <StatCard
              value="2.5x"
              label="Faster Job Placement"
              variant="indigo"
            />
            <StatCard
              value="$40k+"
              label="Average Salary Increase"
              variant="amber"
            />
          </div>
          <TimeLimitedOffer products={productsWithCoupons as ProductWithCoupon[]} />
        </div>
      </SectionContainer>

      {/* Pricing Section */}
      <SectionContainer width="wide" padding="standard">
        <PricingTable
          products={productsWithCoupons as ProductWithCoupon[]}
          user={user as UserWithSubscriptionsAndProgress | null}
        />
        <div className="mt-8">
          <PricingUrgencyMessages />
        </div>
      </SectionContainer>

      {/* What You Get Section */}
      <SectionContainer
        width="wide"
        padding="standard"
        background="bg-white dark:bg-zinc-900"
      >
        <SectionHeader
          heading="Everything You Need to"
          gradientText="Ace Your Interviews"
          description="Comprehensive training designed specifically for JavaScript developers preparing for technical interviews."
          className={CONTAINER.mediumCentered}
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            variant="lime"
            icon={<BookIcon />}
            title="Complete Course Library"
            description="Access all current and future courses covering JavaScript fundamentals, algorithms and data structures with real interview scenarios."
          />

          <FeatureCard
            variant="indigo"
            icon={<LightningIcon />}
            title="Real Interview Problems"
            description="Practice with actual questions from Google, Meta, Netflix and other top companies. Curated by engineers who've been there."
          />

          <FeatureCard
            variant="amber"
            icon={<ChartIcon />}
            title="Progress Tracking"
            description="Monitor your improvement with detailed analytics and personalized learning recommendations tailored to your goals."
          />

          <FeatureCard
            variant="lime"
            icon={<ClockIcon />}
            title="Lifetime Access"
            description="One-time purchase gives you permanent access to all content, updates and new course releases. No subscriptions."
          />

          <FeatureCard
            variant="indigo"
            icon={<UserIcon />}
            title="Expert Support"
            description="Get guidance from experienced engineers who have both given and taken interviews at top technology companies."
          />

          <FeatureCard
            variant="amber"
            icon={<HeartIcon />}
            title="Community Access"
            description="Join a supportive community of developers sharing experiences, tips and celebrating successes together."
          />
        </div>
      </SectionContainer>

      {/* Why Premium Works Section */}
      <SectionContainer width="wide" padding="standard">
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white to-zinc-50 py-8 px-4 sm:p-6 lg:p-12 xl:p-20 ring-1 ring-zinc-200/50 dark:from-zinc-800/50 dark:to-zinc-900/50 dark:ring-zinc-700">
          <SectionHeader
            heading="Why Premium Members"
            gradientText="Get Hired Faster"
            description="While free resources teach concepts, premium training teaches you how to excel in actual interviews. This systematic approach has helped hundreds land roles at top companies."
          />

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureShowcase
              variant="lime"
              iconSize="xl"
              icon={<ClipboardCheckIcon />}
              title="Structured Learning Path"
              description="Follow the platform's proven curriculum instead of random problem-solving."
            />

            <FeatureShowcase
              variant="indigo"
              iconSize="xl"
              icon={<FlaskIcon />}
              title="Real Interview Scenarios"
              description="Practice with actual questions from top companies. Know what to expect before you walk in."
            />

            <FeatureShowcase
              variant="amber"
              iconSize="xl"
              icon={<UserIcon />}
              title="Expert Insights"
              description="Learn from a Senior Engineer at Microsoft who knows what interviewers are looking for."
            />
          </div>
        </div>
      </SectionContainer>

      {/* FAQ Section */}
      <SectionContainer width="wide" padding="standard">
        <SectionHeader
          heading="Frequently Asked Questions"
          description="Everything you need to know about premium membership."
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FAQCard
            question="Is this a subscription or one-time payment?"
            answer="Both options are available! Choose a monthly or yearly subscription for flexibility, or make a one-time payment for lifetime access with no recurring charges."
          />

          <FAQCard
            question="How is this different from free coding platforms?"
            answer={`${APP_NAME} contains content that is specifically designed for JavaScript interviews, with problems curated from real company interviews and expert explanations.`}
          />

          <FAQCard
            question="What if I'm not satisfied with my purchase?"
            answer="30-day money-back guarantee is offered to all customers. If you're not completely satisfied, reach out for a full refund."
          />

          <FAQCard
            question="Do you add new content regularly?"
            answer="Yes! New content is continuously added, including problems, courses and features based on industry trends and user feedback. All updates are included."
          />

          <FAQCard
            question="What programming languages are covered?"
            answer="The platform focuses exclusively on JavaScript and TypeScript. All problems, explanations and code examples are written in modern ES6+ syntax that you'll use in real interviews."
          />

          <FAQCard
            question="Can I upgrade my plan later?"
            answer="Absolutely! You can upgrade from monthly to yearly or lifetime at any time. Your existing subscription will be prorated so you only pay the difference."
          />
        </div>
      </SectionContainer>
    </>
  )
}
