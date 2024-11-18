import { CourseCard } from '../../../components/CourseCard'
import { PremiumModal } from '../../../components/PremiumModal'
import { PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '../../../constants'
import { getActiveCoursesWithProgress } from '../../../services/course'
import { retrieveStripeSession } from '../../../services/stripe'

export type CoursesProps = {
  searchParams: {
    [PREMIUM_QUERY_PARAM]?: string
    [SESSION_QUERY_PARAM]?: string
  }
}

export default async function Courses({ searchParams }: CoursesProps) {
  const [stripeSessionResult, coursesResult] = await Promise.allSettled([
    searchParams[SESSION_QUERY_PARAM]
      ? retrieveStripeSession(searchParams[SESSION_QUERY_PARAM])
      : Promise.resolve(null),
    getActiveCoursesWithProgress(),
  ])

  const courses =
    coursesResult.status === 'fulfilled' ? coursesResult.value : null

  const stripeSession =
    stripeSessionResult.status === 'fulfilled'
      ? stripeSessionResult.value
      : null

  return (
    <>
      <section className="mx-auto max-w-[66rem] bg-white dark:bg-zinc-900">
        <div className="mx-auto mt-6 max-w-screen-xl px-4 py-4 xs:py-8 md:py-16 lg:px-6">
          <div className="mx-auto mb-8 max-w-screen-md text-center lg:mb-12">
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-900 xs:text-3xl md:text-4xl dark:text-white">
              Level Up Your Software Engineering Skills
            </h2>
            <p className="mb-5 font-light text-zinc-600 sm:text-xl dark:text-zinc-400">
              Structured learning paths to master technical interviews at top
              tech companies through hands-on practice and expert guidance
            </p>
          </div>
          <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 dark:border-white/5">
            {courses?.map((course) => (
              <CourseCard
                key={course.id}
                slug={course.slug}
                href={course.href}
                title={course.title}
                description={course.description}
                progress={course.progress}
                lessons={course.metadata.lessons}
                problems={course.metadata.problems}
              />
            ))}
          </div>
          <div className="mt-16 rounded-xl">
            <div className="flex flex-col items-start gap-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Not sure where to start?
              </h3>
              <p className="text-base text-zinc-600 dark:text-zinc-400">
                While each course is structured with a clear learning path, they
                are completely independent of each other. Jump into the topic
                that matches your immediate goals or interests – there is no
                wrong place to begin!
              </p>
            </div>
          </div>
        </div>
      </section>
      {searchParams[PREMIUM_QUERY_PARAM] && (
        <PremiumModal
          upgradedSuccessfully={stripeSession?.status === 'complete'}
          stripeSessionId={stripeSession?.id}
        />
      )}
    </>
  )
}
