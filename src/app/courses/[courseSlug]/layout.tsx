import { APP_NAME, COURSES_PREFIX } from '@/constants'
import '@/styles/tailwind.css'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import { getCourseBySlug } from '../../../services/course'
import { getSectionsByCoursePath } from '../../../services/section'
import { CourseProviders } from './providers'
import { completeCurriculum } from '@/constants/curriculum'

export async function generateMetadata({
  params,
}: {
  params: { courseSlug: string }
}): Promise<Metadata> {
  const { courseSlug } = params

  const course = completeCurriculum.find(
    (c) => c.href === `${COURSES_PREFIX}/${courseSlug}`,
  )

  if (!course?.seo) {
    return { title: 'Course not found' }
  }

  const { seo } = course

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords.join(', '),
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}${seo.canonical}`,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${seo.title} - ${APP_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/twitter-image.png'],
    },
    alternates: {
      canonical: seo.canonical,
    },
  }
}

export type CourseLayoutProps = {
  header: ReactNode
  navigation: ReactNode
  params: { courseSlug: string }
  children: ReactNode
}

export default async function CourseLayout({
  header,
  navigation,
  params,
  children,
}: CourseLayoutProps) {
  const { courseSlug } = params

  const [course, allSections] = await Promise.all([
    getCourseBySlug(courseSlug),
    getSectionsByCoursePath(courseSlug),
  ])

  if (!course) {
    return notFound()
  }

  return (
    <CourseProviders
      header={header}
      navigation={navigation}
      allSections={allSections}
    >
      {children}
    </CourseProviders>
  )
}
