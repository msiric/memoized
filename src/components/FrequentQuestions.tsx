import { SUPPORT_EMAIL } from "../constants"
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export const FrequentQuestions = () => {
  return (
    <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-12">
      <div className="flex min-w-0 max-w-3xl flex-auto flex-col px-4 py-8 md:py-16 lg:max-w-none xl:px-16">
        <div className={SPACING.margin.lg}>
          <h2 className={`${SPACING.headingMargin.h2} ${TYPOGRAPHY.heading.h2}`}>
            Frequently Asked Questions
          </h2>
          <p className={`${TYPOGRAPHY.body.large} ${TYPOGRAPHY.color.secondary}`}>
            If you have any other questions, feel free to{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={`${TYPOGRAPHY.color.primary} underline`}
            >
              reach out to me
            </a>
            .
          </p>
        </div>
        <ul role="list" className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <li>
            <ul role="list" className="space-y-10">
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  Why focus on JavaScript and TypeScript?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  Many interview preparation courses focus on Python and often
                  skip over the built-in data structures of the language. This
                  platform is tailored specifically for JavaScript and
                  TypeScript engineers, starting with the basics and covering
                  everything necessary to tackle technical interviews.
                </p>
              </li>
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  What kind of content can I expect?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  The platform covers a wide range of topics from built-in data
                  structures to advanced algorithms. Each lesson includes
                  practical tips, tricks, and insights into common pitfalls.
                </p>
              </li>
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  How are the lessons structured?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  Each lesson begins with foundational concepts and gradually
                  moves to more complex topics. Lessons contain real-world
                  coding challenges from popular programming platforms.
                </p>
              </li>
            </ul>
          </li>
          <li>
            <ul role="list" className="space-y-10">
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  What makes this platform unique?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  Unlike other platforms, this one focuses on mastering
                  JavaScript and TypeScript, starting from the basics and
                  building up to advanced concepts. It provides practical
                  insights and common pitfalls to ensure you&apos;re well-prepared
                  for technical interviews.
                </p>
              </li>
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  How do I get started?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  Simply sign up on the platform and start with the introductory
                  lessons. Each lesson is designed to build on the previous one,
                  so it&apos;s recommended to follow them in order.
                </p>
              </li>
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  Are there any prerequisites?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  A basic understanding of JavaScript is helpful, but not
                  required. The lessons start from the basics and gradually
                  increase in complexity, making it suitable for both beginners
                  and experienced developers.
                </p>
              </li>
            </ul>
          </li>
          <li>
            <ul role="list" className="space-y-10">
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  What if I get stuck?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  If you encounter any issues or have questions, you can reach
                  out for support. I&apos;m here to help you succeed and ensure you
                  have a smooth learning experience.
                </p>
              </li>
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  Is there any interactive content?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  Yes, each lesson includes real-world coding challenges to
                  reinforce your learning and ensure you can apply the concepts
                  in practical scenarios.
                </p>
              </li>
              <li>
                <h3 className={`${TYPOGRAPHY.body.large} font-semibold leading-6 ${TYPOGRAPHY.color.primary}`}>
                  How can I track my progress?
                </h3>
                <p className={`${SPACING.margin.sm} ${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>
                  The platform includes tools to track your progress through the
                  lessons and exercises. You can see how far you&apos;ve come and
                  what areas you need to focus on.
                </p>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  )
}
