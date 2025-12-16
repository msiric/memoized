import dynamic from 'next/dynamic'
import { APP_NAME, PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '../../../constants'
import { getActiveCoursesWithProgress } from '../../../services/course'
import { retrieveStripeSession } from '../../../services/stripe'
import { CourseCard } from '../../../components/CourseCard'
import { SectionContainer } from '@/components/SectionContainer'
import { StatCard } from '@/components/StatCard'
import { FAQCard } from '@/components/FAQCard'
import { PathCard } from '@/components/PathCard'
import { FeatureShowcase } from '@/components/FeatureShowcase'
import { SectionHeader } from '@/components/SectionHeader'
import { BookIcon, LightningIcon, FlaskIcon, CheckCircleIcon, ClockIcon, ChartIcon, CodeIcon } from '@/components/icons'

const PremiumModal = dynamic(
  () =>
    import('../../../components/PremiumModal').then((mod) => mod.PremiumModal),
  {
    ssr: true,
  },
)

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

  const totalLessons =
    courses?.reduce((sum, course) => sum + course.metadata.lessons.total, 0) ||
    0
  const totalProblems =
    courses?.reduce((sum, course) => sum + course.metadata.problems.total, 0) ||
    0
  const totalCourses = courses?.length || 0

  return (
    <>
      <SectionContainer width="wide" padding="standard">
        <SectionHeader
          headingLevel="h1"
          className="mx-auto max-w-4xl"
          badge={{
            text: 'Complete Learning System',
            icon: <BookIcon />,
            variant: 'lime',
          }}
          heading="Master JavaScript Interviews"
          gradientText="One Course at a Time"
          description={
            <>
              From JavaScript fundamentals to advanced algorithms - each course
              builds your expertise systematically with{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                real interview questions{' '}
              </span>
              and{' '}
              <span className="font-semibold text-lime-600 dark:text-lime-400">
                hands-on practice
              </span>
              .
            </>
          }
        />

        <div className="mx-auto max-w-xl">
          <div className="grid grid-cols-3 items-stretch gap-3 sm:gap-6 lg:gap-8">
            <StatCard
              value={totalCourses}
              label="Expert Courses"
              variant="lime"
            />
            <StatCard
              value={totalLessons}
              label="Interactive Lessons"
              variant="indigo"
            />
            <StatCard
              value={totalProblems}
              label="Practice Problems"
              variant="amber"
            />
          </div>
        </div>
      </SectionContainer>

      {/* Course Cards */}
      <SectionContainer width="wide" padding="standard">
        <SectionHeader
          heading="Available Courses"
          description="Each course is self-contained so start anywhere and build your expertise systematically."
        />
        <div className="not-prose grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 md:grid-cols-2">
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
      </SectionContainer>

      {/* Learning Path Section */}
      <SectionContainer width="wide" padding="standard">
        <SectionHeader
          heading="Choose Your Learning Path"
          description="Not sure where to start? Here's what's recommended based on your experience level."
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PathCard
            variant="lime"
            icon={<LightningIcon />}
            title="New to Algorithms?"
            description={
              <>
                Start with <strong>JavaScript Track</strong> to build strong
                foundations before diving into complex data structures.
              </>
            }
          />

          <PathCard
            variant="indigo"
            icon={<FlaskIcon />}
            title="Strong in JavaScript?"
            description={
              <>
                Jump into <strong>DSA Track</strong> and learn how to implement
                efficient algorithms in JavaScript.
              </>
            }
          />

          <PathCard
            variant="amber"
            icon={<CheckCircleIcon />}
            title="Interview Ready?"
            description="Practice with both tracks simultaneously to reinforce your knowledge and stay sharp."
          />
        </div>
      </SectionContainer>

      {/* Learning Features */}
      <SectionContainer width="wide" padding="standard">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3">
          <FeatureShowcase
            variant="lime"
            icon={<ClockIcon />}
            title="Self-Paced Learning"
            description="Learn at your own pace with access to all courses, problems and resources."
          />

          <FeatureShowcase
            variant="indigo"
            icon={<ChartIcon />}
            title="Progress Tracking"
            description="Visual progress indicators help you stay motivated and see your improvement."
          />

          <FeatureShowcase
            variant="amber"
            icon={<CodeIcon />}
            title="Hands-On Practice"
            description="Every concept reinforced with interactive coding exercises and real problems."
          />
        </div>
      </SectionContainer>

      {/* FAQ Section */}
      <SectionContainer width="wide" padding="standard">
        <SectionHeader
          heading="Frequently Asked Questions"
          description="Everything you need to know about our courses and learning platform."
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FAQCard
            question="Do I need prior programming experience?"
            answer="Basic JavaScript knowledge is helpful but not required. The JavaScript Fundamentals course starts from the basics and builds up to advanced concepts."
          />

          <FAQCard
            question="How are the courses structured?"
            answer="Each course consists of in-depth lessons with interactive code examples, followed by practice problems to reinforce your learning. Progress at your own pace."
          />

          <FAQCard
            question="Are the problems from real interviews?"
            answer="Yes! Problems are curated from actual technical interviews at Google, Meta, Netflix, Amazon and other top companies, with detailed explanations."
          />

          <FAQCard
            question="How much time should I dedicate daily?"
            answer="Even 30 minutes daily makes a difference. Most learners spend 1-2 hours per day and see significant progress within a few weeks."
          />

          <FAQCard
            question="Can I access courses on mobile?"
            answer={`Absolutely! ${APP_NAME} is fully responsive and works seamlessly across all devices - learn on your commute or wherever you are.`}
          />

          <FAQCard
            question="What makes this different from other platforms?"
            answer="The focus is exclusively on JavaScript interview preparation with real company problems and a structured learning path designed for job seekers."
          />
        </div>
      </SectionContainer>

      {searchParams[PREMIUM_QUERY_PARAM] && (
        <PremiumModal
          upgradedSuccessfully={stripeSession?.status === 'complete'}
          stripeSessionId={stripeSession?.id}
        />
      )}
    </>
  )
}
