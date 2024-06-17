import { Logo } from '@/components/Logo'
import { PricingTable } from '@/components/PricingTable'
import { getUserWithSubscriptions } from '@/services/user'
import { SubscriptionStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'

// TODO - allow unauthenticated users to access page
// add custom pricing table and show login modal on click if unauthenticated
export default async function Premium() {
  const session = await getServerSession(authOptions)

  const data = await getUserWithSubscriptions(session?.userId ?? '')

  if (data?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE) {
    redirect('/')
  }

  return (
    <section className="bg-white dark:bg-zinc-900">
      <div className="mx-6 mt-4 flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-6" />
        </Link>
      </div>
      <div className="mx-auto mt-6 max-w-screen-xl px-4 py-8 lg:px-6 lg:py-16">
        <div className="mx-auto mb-8 max-w-screen-md text-center lg:mb-12">
          <h2 className="font-extrabold text-gray-500 sm:text-2xl dark:text-white">
            The ultimate JavaScript platform for mastering coding interviews.
          </h2>
          <p className="mb-5 mt-2 font-light text-gray-500 sm:text-xl dark:text-gray-400">
            Invest in your future, enhance your skills and land your dream job
            with confidence
          </p>
        </div>
        <PricingTable />
      </div>
    </section>
  )
}
