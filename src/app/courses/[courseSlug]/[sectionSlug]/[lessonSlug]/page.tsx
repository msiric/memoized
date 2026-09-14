import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { getLessonBySlug, getLessonMetadataBySlug, getLessonsSlugs } from '@/services/lesson'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { type Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { Problem } from '@prisma/client'
import { lessonMetadata, lessonPath, sectionPath, coursePath, siteUrl } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CatalogDirectory } from '@/components/CatalogDirectory'
import { LessonPreview } from '@/components/LessonPreview'
import { JsonLd } from '@/components/JsonLd'
import { getSearchCatalog } from '@/services/search'
import { extractSectionsFromCompiledSource } from '@/services/section'
import Link from 'next/link'
import { isTypescriptFirstPassEnabled } from '@/config/features'
import { firstPassHref, isTsBasicsRoute, TS_FIRST_PASS_ID, type PathQueryValue } from '@/lib/typescript-first-pass'
import { resolveTypescriptFirstPass } from '@/services/typescript-first-pass'
import { TypescriptFirstPass } from '@/components/TypescriptFirstPass'
import { getProgressSnapshot } from '@/actions/getProgressSnapshot'
import { CONTENT_COLUMN_CLASSES } from '@/constants/content-layout'
import { reportErrorSafely } from '@/lib/sentry'

export async function generateStaticParams() {
  const lessons = await getLessonsSlugs()
  return (
    lessons?.map((lesson) => ({
      lessonSlug: lesson.slug,
      sectionSlug: lesson.section.slug,
      courseSlug: lesson.section.course.slug,
    })) ?? []
  )
}

export async function generateMetadata({
  params,
}: {
  params: { lessonSlug: string; sectionSlug: string; courseSlug: string }
}): Promise<Metadata> {
  const { courseSlug, sectionSlug, lessonSlug } = params

  const lesson = await getLessonMetadataBySlug(courseSlug, sectionSlug, lessonSlug)

  if (!lesson) {
    return notFound()
  }

  return lessonMetadata(lessonPath(courseSlug, sectionSlug, lessonSlug), lesson.title, lesson.description)
}

export default async function Lesson({
  params,
  searchParams = {},
}: {
  params: { lessonSlug: string; sectionSlug: string; courseSlug: string }
  searchParams?: { path?: PathQueryValue; step?: PathQueryValue }
}) {
  const [lesson, catalog] = await Promise.all([
    getLessonBySlug(params.courseSlug, params.sectionSlug, params.lessonSlug),
    getSearchCatalog(),
  ])

  if (!lesson) {
    return notFound()
  }

  const course = catalog.courses.find((item) => item.slug === params.courseSlug)
  const section = course?.sections.find((item) => item.slug === params.sectionSlug)
  const path = lessonPath(params.courseSlug, params.sectionSlug, params.lessonSlug)
  const position = section?.lessons.findIndex((item) => item.slug === params.lessonSlug) ?? -1
  const neighbors = section && position >= 0 ? section.lessons.filter((_, index) => Math.abs(index - position) === 1) : []
  const breadcrumb = <Breadcrumbs items={[
    { title: 'Courses', href: '/courses' },
    { title: course?.title ?? params.courseSlug, href: coursePath(params.courseSlug) },
    { title: section?.title ?? params.sectionSlug, href: sectionPath(params.courseSlug, params.sectionSlug) },
    { title: lesson.title, href: path },
  ]} />
  const structuredData = <JsonLd data={{
    '@context': 'https://schema.org', '@type': ['WebPage', 'LearningResource'],
    name: lesson.title, description: lesson.description, url: siteUrl(path),
    learningResourceType: 'Lesson', inLanguage: 'en',
    isAccessibleForFree: lesson.access === 'FREE',
  }} />
  const isTarget = isTsBasicsRoute(params)
  const enabled = isTarget && isTypescriptFirstPassEnabled()
  const requested = searchParams.path
  if (enabled && requested === TS_FIRST_PASS_ID) {
    const resolved = resolveTypescriptFirstPass(lesson)
    if (resolved.status === 'unavailable') {
      reportErrorSafely(new Error(resolved.reason), { feature: 'typescript-first-pass', action: 'resolve-content' })
      return <>
        {structuredData}
        <article className={`${CONTENT_COLUMN_CLASSES} pb-10 pt-8`}>
          {breadcrumb}
          <h1 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-white">TypeScript first pass</h1>
          <p role="status" className="mb-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            This guided view is not available right now. The full lesson and existing free practice are still available.
          </p>
          <Link href={path} prefetch={false} className="text-sm text-lime-700 underline dark:text-lime-300">Open the full lesson and free questions</Link>
        </article>
      </>
    }
    const progress = await getProgressSnapshot()
    return <>
      {structuredData}
      <TypescriptFirstPass path={resolved.path} initialProgress={progress} requestedStep={searchParams.step} header={breadcrumb} />
    </>
  }

  const session = await getServerSession(authOptions)
  const user = session ? await getUserWithSubscriptionDetails(session.userId) : null
  const hasAccess = userHasAccess(user as UserWithSubscriptionsAndProgress | null, lesson.access)
  const serialized = lesson.serializedBody
  const compiledSource = serialized && typeof serialized === 'object' && !Array.isArray(serialized) && typeof serialized.compiledSource === 'string'
    ? serialized.compiledSource : ''
  const topics = [...new Set(extractSectionsFromCompiledSource(compiledSource).map((item) => item.title))]
  const fallbackNotice = requested === undefined ? null
    : requested === TS_FIRST_PASS_ID && isTarget && !enabled
      ? 'The guided view is not active. The full lesson and free questions are available below.'
      : isTarget || requested === TS_FIRST_PASS_ID
        ? 'That guided view is not available here. You can use the normal lesson and free practice.'
        : null
  const header = <>
    {breadcrumb}
    {fallbackNotice && <p role="status" className="mb-5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{fallbackNotice}</p>}
    {enabled && <Link href={firstPassHref()} prefetch={false}
      className="mb-4 block text-sm font-medium text-lime-700 underline underline-offset-4 dark:text-lime-300">Open the guided first pass</Link>}
  </>

  return (
    <>
      {structuredData}
      {hasAccess ? <PreserializedMdxRenderer
      header={header}
      serializedContent={lesson.serializedBody}
      lessonId={lesson.id}
      problems={lesson.problems as Problem[]}
      showNextPage={false}
    /> : <LessonPreview header={header} title={lesson.title} description={lesson.description} topics={topics} problems={lesson.problems} />}
      <CatalogDirectory title="Continue in this section" items={neighbors.map((item) => ({
        ...item, href: lessonPath(params.courseSlug, params.sectionSlug, item.slug),
      }))} />
    </>
  )
}
