import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PremiumCTA } from '@/components/PremiumCTA'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { getResourceBySlug } from '@/services/resource'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'

export default async function Resources() {
  const session = await getServerSession(authOptions)

  const [resource, user] = await Promise.all([
    getResourceBySlug('intro'),
    session && getUserWithSubscriptionDetails(session.userId),
  ])

  if (!resource) {
    return notFound()
  }

  const hasAccess = userHasAccess(
    user as UserWithSubscriptionsAndProgress | null,
    resource.access,
  )

  if (!hasAccess) {
    return <PremiumCTA heading={resource.title} />
  }

  return (
    <PreserializedMdxRenderer
      serializedContent={resource.serializedBody}
    />
  )
}
