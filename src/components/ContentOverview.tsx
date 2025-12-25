import { APP_NAME } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import { SECTION_ICONS } from '@/constants/icons'
import { FaBookOpen } from 'react-icons/fa'
import {
  MdInsights,
} from 'react-icons/md'
import { RiJavascriptLine } from 'react-icons/ri'
import Image from 'next/image'
import { StatCard } from './StatCard'
import { DecorativeBlur } from './DecorativeBlur'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import {
  TerminalIcon,
  BadgeCheckIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ChatIcon,
  PlusIcon,
  LinkIcon,
  LightningIcon,
} from './icons'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export const ContentOverview = () => {
  return (
    <div className="relative w-full">
      <article>
        <section
          aria-label={`Why ${APP_NAME}?`}
          className={`relative ${SPACING.section.vertical}`}
        >
          <div className={`mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
            {/* Enhanced Header */}
            <div className="mx-auto mb-20 max-w-4xl">
              <SectionHeader
                headingLevel="h2"
                badge={{
                  text: 'JavaScript-First Platform',
                  icon: <TerminalIcon />,
                  variant: 'lime',
                }}
                heading="Finally, Interview Prep"
                gradientText="Built for JavaScript Engineers"
                description={
                  <>
                    <p
                      className={`mx-auto mb-6 max-w-3xl sm:mb-8 ${TYPOGRAPHY.body.large} text-zinc-600 dark:text-zinc-400`}
                    >
                      Stop forcing yourself through generic algorithm courses.
                      Master both{' '}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        data structures & algorithms
                      </span>{' '}
                      and{' '}
                      <span className="font-semibold text-lime-600 dark:text-lime-400">
                        advanced JavaScript concepts
                      </span>{' '}
                      in one cohesive platform designed specifically for modern
                      web developers.
                    </p>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 text-center sm:gap-6 lg:gap-8">
                      <StatCard
                        value="480+"
                        label="JS Problems"
                        variant="lime"
                      />
                      <StatCard
                        value="15+"
                        label="Core Topics"
                        variant="indigo"
                      />
                      <StatCard
                        value="Real"
                        label="Interview Questions"
                        variant="amber"
                      />
                    </div>
                  </>
                }
              />
            </div>

            {/* Value Propositions */}
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Primary Features */}
              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-lime-50 to-lime-100 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-lime-500/20 sm:rounded-3xl sm:p-8 dark:from-lime-900/20 dark:to-lime-800/20 dark:hover:shadow-lime-500/10">
                <DecorativeBlur
                  position="top-right"
                  gradient="lime-indigo"
                  size="lg"
                />
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl bg-lime-500 p-3 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-4">
                    <RiJavascriptLine className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3
                    className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                  >
                    No More Context Switching
                  </h3>
                  <p
                    className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                  >
                    Learn algorithms through JavaScript instead of pseudocode.
                    Every data structure implemented with modern ES6+ syntax you
                    actually use at work.
                  </p>
                  <div
                    className={`mt-3 flex items-center sm:mt-4 ${TYPOGRAPHY.body.small} text-lime-600 dark:text-lime-400`}
                  >
                    <span className="rounded bg-lime-50 px-2 py-1 font-mono dark:bg-lime-900/30">
                      Map(), Set(), WeakMap()
                    </span>
                  </div>
                </div>
              </div>

              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 sm:rounded-3xl sm:p-8 dark:from-indigo-900/20 dark:to-indigo-800/20 dark:hover:shadow-indigo-500/10">
                <DecorativeBlur
                  position="top-right"
                  gradient="lime-indigo"
                  size="lg"
                />
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl bg-indigo-500 p-3 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-4">
                    <MdInsights className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3
                    className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                  >
                    Interview-Tested Examples
                  </h3>
                  <p
                    className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                  >
                    Practice with actual questions from Google, Meta, Netflix
                    interviews. Learn the specific JavaScript patterns
                    interviewers expect to see.
                  </p>
                  <div
                    className={`mt-3 flex items-center sm:mt-4 ${TYPOGRAPHY.body.small} text-indigo-600 dark:text-indigo-400`}
                  >
                    <span className="rounded bg-indigo-50 px-2 py-1 font-mono dark:bg-indigo-900/30">
                      async/await patterns
                    </span>
                  </div>
                </div>
              </div>

              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20 sm:rounded-3xl sm:p-8 dark:from-amber-900/20 dark:to-amber-800/20 dark:hover:shadow-amber-500/10">
                <DecorativeBlur
                  position="top-right"
                  gradient="lime-indigo"
                  size="lg"
                />
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl bg-amber-500 p-3 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-4 dark:bg-amber-600">
                    <FaBookOpen className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h3
                    className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                  >
                    Beyond LeetCode
                  </h3>
                  <p
                    className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                  >
                    Master advanced JavaScript concepts like closures,
                    prototypes and event loops that separate senior engineers
                    from juniors.
                  </p>
                  <div
                    className={`mt-3 flex items-center sm:mt-4 ${TYPOGRAPHY.body.small} text-amber-600 dark:text-amber-400`}
                  >
                    <span className="rounded bg-amber-50 px-2 py-1 font-mono dark:bg-amber-900/30">
                      this binding, hoisting
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`relative ${SPACING.section.vertical}`}>
          <div className={`mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
            {/* Enhanced Header */}
            <div className="mx-auto mb-12 max-w-5xl sm:mb-16 lg:mb-20">
              <SectionHeader
                headingLevel="h2"
                badge={{
                  text: 'Complete Learning System',
                  icon: <BadgeCheckIcon />,
                  variant: 'indigo',
                }}
                heading="Two Learning Tracks,"
                gradientText="One Interview Victory"
                description={
                  <>
                    <p
                      className={`mx-auto mb-8 max-w-4xl sm:mb-12 ${TYPOGRAPHY.body.large} text-zinc-600 dark:text-zinc-400`}
                    >
                      Why choose between algorithms OR JavaScript mastery? This
                      dual-track approach ensures you excel at both. The perfect
                      combination that{' '}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        top companies actually test for
                      </span>
                      .
                    </p>

                    {/* Value Proposition */}
                    <div className="mx-auto max-w-3xl rounded-xl bg-gradient-to-r from-lime-50 to-indigo-50 p-4 sm:rounded-2xl sm:p-6 dark:from-lime-900/20 dark:to-indigo-900/20">
                      <p
                        className={`${TYPOGRAPHY.body.base} font-medium text-zinc-900 dark:text-white`}
                      >
                        The interview gap is real: algorithm knowledge without
                        JavaScript fluency leads to buggy implementations.
                        JavaScript expertise without algorithmic thinking leads
                        to inefficient solutions. Master both, ace any
                        interview.
                      </p>
                    </div>
                  </>
                }
              />
            </div>

            {/* Learning Paths */}
            <div className="space-y-10 sm:space-y-16">
              {completeCurriculum.map((track, trackIndex) => (
                <div key={track.id} className="relative">
                  {/* Track Introduction */}
                  <div className="mb-8 sm:mb-12">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2 ${TYPOGRAPHY.body.small} font-semibold ${
                        trackIndex === 0
                          ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold sm:h-6 sm:w-6 ${
                          trackIndex === 0
                            ? 'bg-lime-500 text-white'
                            : 'bg-indigo-500 text-white'
                        }`}
                      >
                        {trackIndex + 1}
                      </span>
                      Track {trackIndex + 1}: {track.title}
                    </div>
                    <h3
                      className={`mt-3 sm:mt-4 ${TYPOGRAPHY.heading.h3} ${
                        trackIndex === 0
                          ? 'text-lime-900 dark:text-lime-100'
                          : 'text-indigo-900 dark:text-indigo-100'
                      }`}
                    >
                      {trackIndex === 0
                        ? 'Master Modern JavaScript Fundamentals'
                        : 'Conquer Data Structures & Algorithms'}
                    </h3>
                    <p
                      className={`mt-3 sm:mt-4 ${TYPOGRAPHY.body.base} text-zinc-600 dark:text-zinc-400`}
                    >
                      {trackIndex === 0
                        ? 'Build unshakeable foundations in JavaScript concepts that separate senior engineers from the rest. From closures to async patterns, master what interviewers actually test.'
                        : 'Learn algorithms the JavaScript way. No more translating from pseudocode. Implement efficient solutions using modern JS patterns and data structures.'}
                    </p>
                  </div>

                  {/* Enhanced Sections Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                    {track.sections.map((section, sectionIndex) => (
                      <a
                        key={section.title}
                        href={section.href}
                        className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl sm:rounded-2xl sm:p-6 ${
                          trackIndex === 0
                            ? 'bg-lime-50 ring-1 ring-lime-200/50 hover:bg-lime-100 hover:shadow-lime-500/20 dark:bg-lime-900/20 dark:ring-lime-500/20 dark:hover:bg-lime-900/30'
                            : 'bg-indigo-50 ring-1 ring-indigo-200/50 hover:bg-indigo-100 hover:shadow-indigo-500/20 dark:bg-indigo-900/20 dark:ring-indigo-500/20 dark:hover:bg-indigo-900/30'
                        }`}
                        aria-label={`Learn about ${section.title}`}
                      >
                        {/* Progress indicator */}
                        <div
                          className={`absolute right-2 top-2 text-xs font-medium sm:right-3 sm:top-3 ${
                            trackIndex === 0
                              ? 'text-lime-600 dark:text-lime-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {String(sectionIndex + 1).padStart(2, '0')}
                        </div>

                        <div
                          className={`mb-3 w-fit rounded-lg p-2 sm:mb-4 sm:rounded-xl sm:p-3 ${
                            trackIndex === 0
                              ? 'bg-lime-100 dark:bg-lime-800/50'
                              : 'bg-indigo-100 dark:bg-indigo-800/50'
                          }`}
                        >
                          {
                            SECTION_ICONS[
                              section.icon as keyof typeof SECTION_ICONS
                            ]
                          }
                        </div>

                        <h4
                          className={`${SPACING.headingMargin.h5} ${TYPOGRAPHY.body.small} font-semibold text-zinc-900 sm:text-base dark:text-white`}
                        >
                          {section.title}
                        </h4>

                        <div
                          className={`text-xs font-medium ${
                            trackIndex === 0
                              ? 'text-lime-600 dark:text-lime-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          Learn →
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Track completion reward */}
                  <div
                    className={`mt-6 rounded-xl p-4 text-center sm:mt-8 sm:rounded-2xl sm:p-6 ${
                      trackIndex === 0
                        ? 'bg-lime-50 ring-1 ring-lime-200/50 dark:bg-lime-900/20 dark:ring-lime-500/20'
                        : 'bg-indigo-50 ring-1 ring-indigo-200/50 dark:bg-indigo-900/20 dark:ring-indigo-500/20'
                    }`}
                  >
                    <div
                      className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full sm:mb-3 sm:h-12 sm:w-12 ${
                        trackIndex === 0 ? 'bg-lime-500' : 'bg-indigo-500'
                      }`}
                    >
                      <CheckCircleIcon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                    </div>
                    <p
                      className={`${TYPOGRAPHY.body.small} font-medium sm:text-base ${
                        trackIndex === 0
                          ? 'text-lime-900 dark:text-lime-100'
                          : 'text-indigo-900 dark:text-indigo-100'
                      }`}
                    >
                      Complete this track to{' '}
                      {trackIndex === 0
                        ? 'confidently explain any JavaScript concept in interviews'
                        : 'solve complex algorithmic challenges efficiently'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="introduction"
          aria-label="Introduction"
          className={`relative ${SPACING.section.vertical}`}
        >
          <div className={`mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
            {/* Enhanced Header */}
            <div className="mx-auto mb-12 max-w-4xl text-center sm:mb-16 lg:mb-20">
              <Badge
                variant="lime"
                icon={<LightBulbIcon />}
                className={SPACING.margin.md}
              >
                Personal Approach
              </Badge>
              <h2
                className={`${SPACING.headingMargin.h2} ${TYPOGRAPHY.heading.h2} text-zinc-900 dark:text-white`}
              >
                What makes this approach{' '}
                <span className="bg-gradient-to-r from-zinc-600 to-zinc-800 bg-clip-text text-transparent dark:from-zinc-300 dark:to-zinc-100">
                  different
                </span>
              </h2>
              <p
                className={`${TYPOGRAPHY.body.large} text-zinc-600 dark:text-zinc-400`}
              >
                Built from personal experience solving the gaps I found in my
                own interview preparation journey
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-lime-50/50 to-lime-100/50 p-6 ring-1 ring-lime-900/5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-lime-500/20 sm:rounded-3xl sm:p-8 dark:from-lime-900/10 dark:to-lime-800/10 dark:ring-lime-500/20 dark:hover:shadow-lime-500/10">
                <div className="mb-4 inline-flex rounded-xl bg-lime-500 p-2.5 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-3">
                  <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3
                  className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                >
                  Real-World Examples
                </h3>
                <p
                  className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                >
                  Each lesson includes practical examples and common pitfalls
                  from actual development and interview experiences.
                </p>
              </div>

              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 p-6 ring-1 ring-indigo-900/5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 sm:rounded-3xl sm:p-8 dark:from-indigo-900/10 dark:to-indigo-800/10 dark:ring-indigo-500/20 dark:hover:shadow-indigo-500/10">
                <div className="mb-4 inline-flex rounded-xl bg-indigo-500 p-2.5 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-3">
                  <ChatIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3
                  className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                >
                  Interview-Focused
                </h3>
                <p
                  className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                >
                  Content designed specifically for technical interviews,
                  helping you explain concepts clearly and effectively.
                </p>
              </div>

              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50/50 to-amber-100/50 p-6 ring-1 ring-amber-900/5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20 sm:rounded-3xl sm:p-8 dark:from-amber-900/10 dark:to-amber-800/10 dark:ring-amber-500/20 dark:hover:shadow-amber-500/10">
                <div className="mb-4 inline-flex rounded-xl bg-amber-500 p-2.5 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-3">
                  <PlusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3
                  className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                >
                  Learn from Mistakes
                </h3>
                <p
                  className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                >
                  Documented common errors and pitfalls to help you avoid the
                  same mistakes during interviews.
                </p>
              </div>

              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-lime-50/50 to-lime-100/50 p-6 ring-1 ring-lime-900/5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-lime-500/20 sm:rounded-3xl sm:p-8 dark:from-lime-900/10 dark:to-lime-800/10 dark:ring-lime-500/20 dark:hover:shadow-lime-500/10">
                <div className="mb-4 inline-flex rounded-xl bg-lime-500 p-2.5 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-3">
                  <LinkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3
                  className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                >
                  Practical Context
                </h3>
                <p
                  className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                >
                  Understand not just how algorithms work, but when and why to
                  apply them in real development scenarios.
                </p>
              </div>

              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 p-6 ring-1 ring-indigo-900/5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 sm:rounded-3xl sm:p-8 dark:from-indigo-900/10 dark:to-indigo-800/10 dark:ring-indigo-500/20 dark:hover:shadow-indigo-500/10">
                <div className="mb-4 inline-flex rounded-xl bg-indigo-500 p-2.5 text-white shadow-lg sm:mb-6 sm:rounded-2xl sm:p-3">
                  <LightningIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3
                  className={`${SPACING.headingMargin.h4} ${TYPOGRAPHY.heading.h4} ${TYPOGRAPHY.color.primary}`}
                >
                  Advanced Topics
                </h3>
                <p
                  className={`${TYPOGRAPHY.body.base} text-zinc-800 dark:text-zinc-300`}
                >
                  Beyond basics - covering sophisticated algorithms and modern
                  JavaScript patterns most courses skip.
                </p>
              </div>

              {/* Testimonial Card */}
              <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-zinc-900/50 sm:rounded-3xl sm:p-8 dark:bg-zinc-800">
                {/* Lime accent bar */}
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-lime-400 to-lime-600" />
                
                {/* 5-star rating */}
                <div className="mb-3 flex gap-0.5 sm:mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-3.5 w-3.5 text-lime-400 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="mb-4 flex-1 sm:mb-6">
                  <p className={`${TYPOGRAPHY.body.base} font-medium leading-relaxed text-white`}>
                    &ldquo;I used {APP_NAME} to prep for my Microsoft interviews. The pattern-based approach helped me finally see how problems connect.&rdquo;
                  </p>
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/testimonials/learner-5.png"
                    alt="Nick Yenin"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-lime-400/30"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      Nick Yenin
                    </span>
                    <span className="text-xs text-zinc-400">
                      Software Engineer at Microsoft
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </article>
    </div>
  )
}
