import { APP_NAME, SUPPORT_EMAIL } from '@/constants'
import Image from 'next/image'
import { FaGithub } from 'react-icons/fa'
import { MdOutlineAlternateEmail } from 'react-icons/md'
import { GradientText } from './GradientText'
import { DecorativeBlur } from './DecorativeBlur'
import { Badge } from './Badge'
import { UserIcon } from './icons'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export const CreatorIntro = () => {
  return (
    <section
      aria-labelledby="author-section"
      className={`relative scroll-mt-14 sm:scroll-mt-32 ${SPACING.section.vertical}`}
    >
      <div className={`relative mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
        {/* Background Elements */}

        <div className="relative rounded-3xl bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 backdrop-blur-sm ring-1 ring-zinc-700/50">
          {/* Enhanced Author Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 p-5 sm:p-8 lg:p-16">
            {/* Author Image */}
            <div className="relative mx-auto mb-8 lg:mb-0 lg:mx-0 lg:flex-shrink-0">
              <DecorativeBlur position="inset" gradient="lime-indigo" size="md" />
              <div className="relative h-48 w-48 lg:h-64 lg:w-64 overflow-hidden rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 p-2">
                <Image
                  alt="Mario Siric, creator of Memoized"
                  width={400}
                  height={400}
                  className="h-full w-full rounded-full object-cover ring-4 ring-zinc-600/50"
                  src="https://avatars.githubusercontent.com/u/26199969?s=400&u=74701753b39e34fb8b83ce5f221d9dd5fa12064e&v=4"
                  priority
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Introduction Badge */}
              <Badge variant="indigo" icon={<UserIcon />} className={SPACING.margin.md}>
                Meet the Creator
              </Badge>

              <h1 className={`${SPACING.headingMargin.h2} ${TYPOGRAPHY.heading.h2} text-white`}>
                Hello, I&apos;m <GradientText>Mario</GradientText>, creator of{' '}
                <span className="text-lime-400">{APP_NAME}</span>
              </h1>
              <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4 lg:space-y-6 text-sm sm:text-base lg:text-lg text-zinc-300">
                <p>
                  As a <span className="font-semibold text-white">Senior Software Engineer at Microsoft</span> with years of 
                  experience interviewing candidates and mentoring developers, I noticed a gap in how engineers 
                  prepare for technical interviews. Most platforms focus on either algorithms or JavaScript concepts, 
                  but rarely both.
                </p>
                <p>
                  Through my experience both giving and taking technical interviews, I&apos;ve learned what makes 
                  candidates successful. I&apos;ve structured this platform to focus on what actually matters: 
                  <span className="font-semibold text-lime-400"> strong algorithmic thinking</span> and 
                  <span className="font-semibold text-indigo-400"> deep JavaScript knowledge</span>.
                </p>
                <p>
                  This isn&apos;t just another course platform, but the comprehensive resource I wish I had 
                  when I was preparing for interviews at top tech companies.
                </p>
              </div>
              {/* Enhanced Contact Links */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-6">
                <a
                  className="group inline-flex items-center gap-2 sm:gap-3 rounded-full bg-lime-600/20 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium text-lime-300 ring-1 ring-lime-500/30 transition-all duration-300 hover:bg-lime-600/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  href="https://github.com/msiric"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaGithub className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
                  <span>GitHub</span>
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  className="group inline-flex items-center gap-2 sm:gap-3 rounded-full bg-indigo-600/20 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium text-indigo-300 ring-1 ring-indigo-500/30 transition-all duration-300 hover:bg-indigo-600/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  <MdOutlineAlternateEmail className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
                  <span>Contact</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
