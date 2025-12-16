import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { APP_NAME, COURSES_PREFIX } from '@/constants'
import { PremiumCTA } from '@/components/PremiumCTA'
import { PreserializedMdxRenderer } from '@/components/PreserializedMdxRenderer'
import { completeCurriculum } from '@/constants/curriculum'
import { getLessonBySlug, getLessonsSlugs } from '@/services/lesson'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { type Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { Problem } from '@prisma/client'

export async function generateStaticParams() {
  const lessons = await getLessonsSlugs()
  return lessons?.map((lesson) => ({
    lessonSlug: lesson.slug,
    sectionSlug: lesson.section.slug,
    courseSlug: lesson.section.course.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: { lessonSlug: string; sectionSlug: string; courseSlug: string }
}): Promise<Metadata> {
  const { courseSlug, sectionSlug, lessonSlug } = params

  const course = completeCurriculum.find(
    (c) => c.href === `${COURSES_PREFIX}/${courseSlug}`,
  )

  const section = course?.sections.find(
    (s) => s.href === `${COURSES_PREFIX}/${courseSlug}/${sectionSlug}`,
  )

  const lesson = section?.lessons.find((l) => l.id === `/${lessonSlug}`)

  if (!lesson) {
    return { title: 'Lesson not found' }
  }

  const title = `${lesson.title} - ${section?.title} - ${course?.title}`
  const description =
    lesson.description || `Learn about ${lesson.title} in this lesson.`

  return {
    title,
    description,
    keywords: `${lesson.title}, ${section?.title}, ${course?.title}, programming tutorial, coding lesson`,
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}${COURSES_PREFIX}/${courseSlug}/${sectionSlug}/${lessonSlug}`,
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
      canonical: `${COURSES_PREFIX}/${courseSlug}/${sectionSlug}/${lessonSlug}`,
    },
  }
}

export default async function Lesson({
  params,
}: {
  params: { lessonSlug: string; sectionSlug: string; courseSlug: string }
}) {
  const session = await getServerSession(authOptions)

  const [lesson, user] = await Promise.all([
    getLessonBySlug(params.lessonSlug),
    session && getUserWithSubscriptionDetails(session.userId),
  ])

  if (!lesson) {
    return notFound()
  }

  const hasAccess = userHasAccess(
    user as UserWithSubscriptionsAndProgress | null,
    lesson.access,
  )

  if (!hasAccess) {
    return <PremiumCTA heading={lesson.title} />
  }

  return (
    <PreserializedMdxRenderer
      serializedContent={lesson.serializedBody}
      lessonId={lesson.id}
      problems={lesson.problems as Problem[]}
    />
  )
}
