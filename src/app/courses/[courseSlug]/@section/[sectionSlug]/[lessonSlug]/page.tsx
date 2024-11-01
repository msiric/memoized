import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PremiumCTA } from '@/components/PremiumCTA'
import { CONTENT_FOLDER } from '@/constants'
import { getLessonBySlug } from '@/services/lesson'
import { getUserWithSubscriptions } from '@/services/user'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { Problem } from '@prisma/client'
import { getServerSession } from 'next-auth'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { JSXElementConstructor } from 'react'
// import readingTime from 'reading-time';

export default async function Lesson({
  params,
}: {
  params: { lessonSlug: string }
}) {
  const session = await getServerSession(authOptions)

  const [lesson, user] = await Promise.all([
    getLessonBySlug(params.lessonSlug),
    session && getUserWithSubscriptions(session.userId),
  ])

  if (!lesson) {
    return notFound()
  }

  // const stats = readingTime(lesson.body);

  const hasAccess = userHasAccess(
    user as UserWithSubscriptionsAndProgress | null,
    lesson.access,
  )

  if (!hasAccess) {
    return <PremiumCTA heading={lesson.title} />
  }

  const Page = dynamic(
    () =>
      import(
        `../../../../../../${CONTENT_FOLDER}/${lesson.section.course.slug}/${lesson.section.slug}/${params.lessonSlug}/page.mdx`
      ),
    {
      loading: () => (
        <section className="h-screen bg-white dark:bg-zinc-900">
          <div className="mx-auto h-full max-w-screen-xl px-4 py-8 sm:py-16 lg:px-6">
            <div className="align-center mx-auto flex h-full max-w-screen-sm flex-col justify-center text-center">
              <p className="mb-6 font-light text-gray-500 md:text-lg dark:text-gray-400">
                Fetching lesson...
              </p>
            </div>
          </div>
        </section>
      ),
    },
  ) as unknown as JSXElementConstructor<{
    userId?: string
    lessonId: string
    problems: Problem[]
  }>

  return (
    <Page userId={user?.id} lessonId={lesson.id} problems={lesson.problems} />
  )
}
