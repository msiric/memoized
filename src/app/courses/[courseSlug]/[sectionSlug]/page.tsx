import { COURSES_PREFIX } from '@/constants'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { completeCurriculum } from '@/constants/curriculum'
import { getSectionBySlug, getSectionsSlugs } from '@/services/lesson'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSearchCatalog } from '@/services/search'
import { CatalogDirectory } from '@/components/CatalogDirectory'
import { lessonPath, pageMetadata, sectionPath } from '@/lib/seo'

export async function generateStaticParams() {
  const sections = await getSectionsSlugs()
  return (
    sections?.map((section) => ({
      sectionSlug: section.slug,
      courseSlug: section.course.slug,
    })) ?? []
  )
}

export async function generateMetadata({
  params,
}: {
  params: { sectionSlug: string; courseSlug: string }
}): Promise<Metadata> {
  const { courseSlug, sectionSlug } = params

  const course = completeCurriculum.find(
    (c) => c.href === `${COURSES_PREFIX}/${courseSlug}`,
  )

  const section = course?.sections.find(
    (s) => s.href === `${COURSES_PREFIX}/${courseSlug}/${sectionSlug}`,
  )

  if (!section) {
    return notFound()
  }

  const title = `${section.title} - ${course?.title}`
  const description =
    section.description || `Learn about ${section.title} in this section.`

  return {
    ...pageMetadata({ title, description, path: sectionPath(courseSlug, sectionSlug) }),
  }
}

export default async function Section({
  params,
}: {
  params: { sectionSlug: string; courseSlug: string }
}) {
  const section = await getSectionBySlug(params.courseSlug, params.sectionSlug)

  if (!section) {
    return notFound()
  }

  const catalog = await getSearchCatalog()
  const entry = catalog.courses.find((item) => item.slug === params.courseSlug)?.sections.find((item) => item.slug === params.sectionSlug)
  return (
    <>
      <PreserializedMdxRenderer serializedContent={section.serializedBody} />
      <CatalogDirectory title="Lessons and free practice" items={(entry?.lessons ?? []).map((item) => ({
        ...item, href: lessonPath(params.courseSlug, params.sectionSlug, item.slug),
      }))} />
    </>
  )
}
