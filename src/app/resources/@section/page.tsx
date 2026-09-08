import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PremiumCTA } from '@/components/PremiumCTA'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { getResourceBySlug } from '@/services/resource'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { getSearchCatalog } from '@/services/search'
import { CatalogDirectory } from '@/components/CatalogDirectory'
import { resourcePath } from '@/lib/seo'

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

  const { resources } = await getSearchCatalog()
  return (
    <>
    <PreserializedMdxRenderer
      serializedContent={resource.serializedBody}
    />
    <CatalogDirectory title="Implementation references" items={resources.filter((item) => item.slug !== 'intro').map((item) => ({
      ...item, href: resourcePath(item.slug),
    }))} />
    </>
  )
}
