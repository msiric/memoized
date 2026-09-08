import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { getCourseBySlug, getCoursesSlugs } from '@/services/course'
import { notFound } from 'next/navigation'
import { getSearchCatalog } from '@/services/search'
import { CatalogDirectory } from '@/components/CatalogDirectory'
import { sectionPath } from '@/lib/seo'

export async function generateStaticParams() {
  const courses = await getCoursesSlugs()
  return courses?.map((course) => ({ courseSlug: course.slug })) ?? []
}

export default async function Course({
  params,
}: {
  params: {
    courseSlug: string
  }
}) {
  const course = await getCourseBySlug(params.courseSlug)

  if (!course) {
    return notFound()
  }

  const catalog = await getSearchCatalog()
  const entry = catalog.courses.find((item) => item.slug === params.courseSlug)
  return (
    <>
      <PreserializedMdxRenderer serializedContent={course.serializedBody} />
      <CatalogDirectory title="Choose a section" items={(entry?.sections ?? []).map((item) => ({
        ...item, href: sectionPath(params.courseSlug, item.slug),
      }))} />
    </>
  )
}
