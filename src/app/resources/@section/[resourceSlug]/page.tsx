import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PremiumCTA } from '@/components/PremiumCTA'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { getResourceBySlug, getResourceMetadataBySlug, getResourcesSlugs } from '@/services/resource'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { getServerSession } from 'next-auth'
import { notFound, permanentRedirect } from 'next/navigation'
import { pageMetadata, resourcePath, siteUrl } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { resourceSlug: string } }) {
  const resource = await getResourceMetadataBySlug(params.resourceSlug)
  if (!resource) return notFound()
  return pageMetadata({
    title: `${resource.title} — JavaScript & TypeScript Reference`,
    description: resource.description || `An implementation reference for ${resource.title}.`,
    path: resourcePath(resource.slug),
    index: resource.access === 'FREE',
  })
}

export async function generateStaticParams() {
  const resources = await getResourcesSlugs()
  return resources?.filter((resource) => resource.slug !== 'intro').map((resource) => ({ resourceSlug: resource.slug })) ?? []
}

export default async function Resource({
  params,
}: {
  params: { resourceSlug: string }
}) {
  if (params.resourceSlug === 'intro') permanentRedirect('/resources')
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
    return (
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Breadcrumbs items={[{ title: 'Resources', href: '/resources' }, { title: resource.title, href: resourcePath(resource.slug) }]} />
        <p className="mb-3 text-xs font-medium text-lime-700 dark:text-lime-300">Premium implementation reference</p>
        <h1 className="mb-5 break-words text-2xl font-bold text-zinc-900 dark:text-white">{resource.title}</h1>
        {resource.description && <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{resource.description}</p>}
        <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          The full reference is available with Premium. You can explore the curriculum and attempt
          free practice questions before choosing a plan.
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm text-lime-700 dark:text-lime-300">
          <Link href="/courses">Explore the curriculum</Link>
          <Link href="/problems">Try free practice</Link>
        </div>
        <JsonLd data={{
          '@context': 'https://schema.org', '@type': ['WebPage', 'LearningResource'],
          name: resource.title, description: resource.description, url: siteUrl(resourcePath(resource.slug)),
          learningResourceType: 'Reference', isAccessibleForFree: false,
        }} />
        <PremiumCTA heading={resource.title} />
      </article>
    )
  }

  return (
    <PreserializedMdxRenderer
      serializedContent={resource.serializedBody}
    />
  )
}
