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
}: {
  params: { lessonSlug: string; sectionSlug: string; courseSlug: string }
}) {
  const session = await getServerSession(authOptions)

  const [lesson, user] = await Promise.all([
    getLessonBySlug(params.courseSlug, params.sectionSlug, params.lessonSlug),
    session && getUserWithSubscriptionDetails(session.userId),
  ])

  if (!lesson) {
    return notFound()
  }

  const hasAccess = userHasAccess(
    user as UserWithSubscriptionsAndProgress | null,
    lesson.access,
  )

  const catalog = await getSearchCatalog()
  const course = catalog.courses.find((item) => item.slug === params.courseSlug)
  const section = course?.sections.find((item) => item.slug === params.sectionSlug)
  const path = lessonPath(params.courseSlug, params.sectionSlug, params.lessonSlug)
  const position = section?.lessons.findIndex((item) => item.slug === params.lessonSlug) ?? -1
  const neighbors = section && position >= 0 ? section.lessons.filter((_, index) => Math.abs(index - position) === 1) : []
  const serialized = lesson.serializedBody
  const compiledSource = serialized && typeof serialized === 'object' && !Array.isArray(serialized) && typeof serialized.compiledSource === 'string'
    ? serialized.compiledSource : ''
  const topics = [...new Set(extractSectionsFromCompiledSource(compiledSource).map((item) => item.title))]

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <Breadcrumbs items={[
          { title: 'Courses', href: '/courses' },
          { title: course?.title ?? params.courseSlug, href: coursePath(params.courseSlug) },
          { title: section?.title ?? params.sectionSlug, href: sectionPath(params.courseSlug, params.sectionSlug) },
          { title: lesson.title, href: path },
        ]} />
      </div>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': ['WebPage', 'LearningResource'],
        name: lesson.title, description: lesson.description, url: siteUrl(path),
        learningResourceType: 'Lesson', inLanguage: 'en',
        isAccessibleForFree: lesson.access === 'FREE',
      }} />
      {hasAccess ? <PreserializedMdxRenderer
      serializedContent={lesson.serializedBody}
      lessonId={lesson.id}
      problems={lesson.problems as Problem[]}
      showNextPage={false}
    /> : <LessonPreview title={lesson.title} description={lesson.description} topics={topics} problems={lesson.problems} />}
      <CatalogDirectory title="Continue in this section" items={neighbors.map((item) => ({
        ...item, href: lessonPath(params.courseSlug, params.sectionSlug, item.slug),
      }))} />
    </>
  )
}
