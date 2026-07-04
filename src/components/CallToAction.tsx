import { AnimatedCode } from '@/components/AnimatedCode'
import { COURSES_PREFIX, PREMIUM_PREFIX } from '@/constants'
import Link from 'next/link'
import Image from 'next/image'
import { HomepageBackground } from './icons/HomepageBackground'
import { ArrowRightIcon } from './icons'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export type CallToActionProps = {
    codeSnippets: {
        code: string;
        tab: string;
    }[],
    initialSnippet: string
}

export const CallToAction = ({ codeSnippets, initialSnippet }: CallToActionProps) => {
  return (
    <div className="overflow-hidden bg-zinc-900">
      <div className={`${SPACING.section.vertical} lg:relative`}>
        <div className={`mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-8 gap-y-12 sm:gap-y-16 lg:gap-y-20 ${SPACING.section.horizontal} lg:grid-cols-2`}>
          <div className="relative z-10 text-center lg:text-left">
            <div className="relative">

              <h1 className={`font-display ${SPACING.headingMargin.h1} pb-1 ${TYPOGRAPHY.gradient.heroLight} ${TYPOGRAPHY.heading.h1} leading-tight`}>
                Master Technical Interviews the JavaScript Way
              </h1>
              <p className={`${SPACING.descriptionMargin.large} ${TYPOGRAPHY.body.large} tracking-tight text-zinc-300`}>
                Unlock in-depth knowledge and practical skills to ace your
                coding interviews with confidence. Tailored specifically for
                JavaScript and TypeScript engineers.
              </p>

              {/* Enhanced buttons */}
              <div className="mb-6 sm:mb-8 flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  className="group inline-flex w-auto items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-lime-400 to-lime-500 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-zinc-900 transition-all duration-200 hover:from-lime-300 hover:to-lime-400 hover:scale-105 hover:shadow-lg hover:shadow-lime-400/25 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300/50 active:scale-95"
                  href={COURSES_PREFIX}
                >
                  Start learning now
                  <ArrowRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  className="group inline-flex w-auto items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-zinc-600 bg-zinc-800/50 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium text-zinc-200 backdrop-blur-sm transition-all duration-200 hover:border-zinc-500 hover:bg-zinc-700/50 hover:text-white hover:scale-105 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  href={PREMIUM_PREFIX}
                >
                  View pricing
                  <ArrowRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              
              {/* Enhanced testimonials */}
              <div className="flex flex-col items-center justify-center gap-4 lg:flex-row lg:justify-start">
                <div className="flex -space-x-2">
                  <Image
                    src="/images/testimonials/learner-1.png"
                    alt="Learner 1"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-zinc-800 object-cover transition-transform hover:scale-110 hover:z-10"
                  />
                  <Image
                    src="/images/testimonials/learner-2.png"
                    alt="Learner 2"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-zinc-800 object-cover transition-transform hover:scale-110 hover:z-10"
                  />
                  <Image
                    src="/images/testimonials/learner-3.png"
                    alt="Learner 3"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-zinc-800 object-cover transition-transform hover:scale-110 hover:z-10"
                  />
                  <Image
                    src="/images/testimonials/learner-4.png"
                    alt="Learner 4"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-zinc-800 object-cover transition-transform hover:scale-110 hover:z-10"
                  />
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-sm text-zinc-300">
                    Join a <span className="font-semibold text-lime-300">growing community</span> of engineers mastering interview skills
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative lg:static xl:pl-10">
            <div className="absolute inset-x-[-50vw] -bottom-48 -top-24 [mask-image:linear-gradient(transparent,white,white)] lg:-bottom-32 lg:-top-24 lg:left-[calc(50%+14rem)] lg:right-0 lg:[mask-image:none] dark:[mask-image:linear-gradient(transparent,white,transparent)] lg:dark:[mask-image:linear-gradient(white,white,transparent)]">
              <HomepageBackground
                width={668}
                height={1069}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-0 lg:translate-x-0 lg:translate-y-[-60%]"
              />
            </div>
            <div className="min-h-full">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-lime-300 via-lime-300/70 to-lime-300 opacity-10 blur-lg" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-lime-300 via-lime-300/70 to-lime-300 opacity-10" />
                <div className="relative min-h-full rounded-2xl bg-zinc-900 ring-1 ring-white/10 backdrop-blur">
                  <div className="absolute -top-px left-20 right-11 h-px bg-gradient-to-r from-lime-300/0 via-lime-300/70 to-lime-300/0" />
                  <div className="absolute -bottom-px left-11 right-20 h-px bg-gradient-to-r from-lime-400/0 via-lime-400 to-lime-400/0" />
                  <AnimatedCode
                    initialTab={codeSnippets[0].tab}
                    initialSnippet={initialSnippet}
                    codeSnippets={codeSnippets}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
