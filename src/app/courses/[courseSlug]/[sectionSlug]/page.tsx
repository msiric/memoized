import { APP_NAME, COURSES_PREFIX } from '@/constants'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { completeCurriculum } from '@/constants/curriculum'
import { getSectionBySlug, getSectionsSlugs } from '@/services/lesson'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const sections = await getSectionsSlugs()
  return sections?.map((section) => ({
    sectionSlug: section.slug,
    courseSlug: section.course.slug,
  }))
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
    return { title: 'Section not found' }
  }

  const title = `${section.title} - ${course?.title}`
  const description =
    section.description || `Learn about ${section.title} in this section.`

  return {
    title,
    description,
    keywords: `${section.title}, ${course?.title}, programming tutorial, coding lessons`,
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}${COURSES_PREFIX}/${courseSlug}/${sectionSlug}`,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${title} - ${APP_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/twitter-image.png'],
    },
    alternates: {
      canonical: `${COURSES_PREFIX}/${courseSlug}/${sectionSlug}`,
    },
  }
}

export default async function Section({
  params,
}: {
  params: { sectionSlug: string; courseSlug: string }
}) {
  const section = await getSectionBySlug(params.sectionSlug)

  if (!section) {
    return notFound()
  }

  return <PreserializedMdxRenderer serializedContent={section.serializedBody} />
}
