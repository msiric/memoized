import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PremiumCTA } from '@/components/PremiumCTA'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { getResourceBySlug, getResourcesSlugs } from '@/services/resource'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const resources = await getResourcesSlugs()
  return resources?.map((resource) => ({ resourceSlug: resource.slug }))
}

export default async function Resource({
  params,
}: {
  params: { resourceSlug: string }
}) {
  const session = await getServerSession(authOptions)

  const [resource, user] = await Promise.all([
    getResourceBySlug(params.resourceSlug),
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
