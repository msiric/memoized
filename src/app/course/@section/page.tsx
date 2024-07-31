import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PremiumModal } from '@/components/PremiumModal'
import {
  CONTENT_FOLDER,
  PREMIUM_QUERY_PARAM,
  SESSION_QUERY_PARAM,
} from '@/constants'
import { retrieveStripeSession } from '@/services/stripe'
import { getUserWithSubscriptions } from '@/services/user'
import { Problem } from '@prisma/client'
import { getServerSession } from 'next-auth'
import dynamic from 'next/dynamic'
import { JSXElementConstructor } from 'react'
// import readingTime from 'reading-time';

export default async function Course({
  searchParams,
}: {
  searchParams: {
    [PREMIUM_QUERY_PARAM]?: string
    [SESSION_QUERY_PARAM]?: string
  }
}) {
  const [sessionResult, stripeSessionResult] = await Promise.allSettled([
    getServerSession(authOptions),
    searchParams[SESSION_QUERY_PARAM]
      ? retrieveStripeSession(searchParams[SESSION_QUERY_PARAM])
      : Promise.resolve(null),
  ])

  const session =
    sessionResult.status === 'fulfilled' ? sessionResult.value : null

  const stripeSession =
    stripeSessionResult.status === 'fulfilled'
      ? stripeSessionResult.value
      : null

  const upgradedToPremium = searchParams[PREMIUM_QUERY_PARAM]

  const user =
    session && searchParams[PREMIUM_QUERY_PARAM]
      ? await getUserWithSubscriptions(session?.userId)
      : null

  const Page = dynamic(
    () => import(`../../../${CONTENT_FOLDER}/course/page.mdx`),
    {
      loading: () => (
        <section className="h-screen bg-white dark:bg-zinc-900">
          <div className="mx-auto h-full max-w-screen-xl px-4 py-8 sm:py-16 lg:px-6">
            <div className="align-center mx-auto flex h-full max-w-screen-sm flex-col justify-center text-center">
              <p className="mb-6 font-light text-gray-500 md:text-lg dark:text-gray-400">
                Fetching introduction...
              </p>
            </div>
          </div>
        </section>
      ),
    },
  ) as unknown as JSXElementConstructor<{
    userId?: string
    lessonId: string
    problems: Problem[]
  }>

  return (
    <>
      <Page userId={user?.id} lessonId={''} problems={[]} />
      {upgradedToPremium && (
        <PremiumModal
          upgradedSuccessfully={stripeSession?.status === 'complete'}
        />
      )}
    </>
  )
}
