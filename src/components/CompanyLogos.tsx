import { BsNvidia } from 'react-icons/bs'
import {
  FaAirbnb,
  FaAmazon,
  FaApple,
  FaGoogle,
  FaMicrosoft,
  FaTiktok,
  FaTwitter,
} from 'react-icons/fa'
import { FaMeta } from 'react-icons/fa6'
import { SiNetflix, SiTesla, SiUber } from 'react-icons/si'
import { Badge } from './Badge'
import { GradientText } from './GradientText'
import { DecorativeBlur } from './DecorativeBlur'
import { AcademicCapIcon } from './icons'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export const CompanyLogos = () => {
  return (
    <section className={`relative bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 ${SPACING.section.vertical}`}>
      <div className={`mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
        <div className="mx-auto max-w-4xl text-center">
          {/* Enhanced Badge */}
          <div className={`mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-lime-900/50 to-indigo-900/50 px-3 py-1.5 sm:px-4 sm:py-2 ${TYPOGRAPHY.body.small} font-semibold text-lime-300 ring-1 ring-lime-500/20`}>
            <AcademicCapIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Top Tech Companies
          </div>

          <h2 className={`${SPACING.headingMargin.h2} ${TYPOGRAPHY.heading.h2} text-white`}>
            Modern Technical Interviews <GradientText>Require Both Skills</GradientText>
          </h2>
          
          <p className={`mx-auto ${SPACING.descriptionMargin.large} max-w-3xl ${TYPOGRAPHY.body.large} text-zinc-300`}>
            Whether you&apos;re interviewing at tech giants or growing startups, you&apos;ll need to demonstrate both 
            <span className="font-semibold text-lime-400"> algorithmic problem-solving abilities</span> and 
            <span className="font-semibold text-indigo-400"> deep JavaScript knowledge</span>. This platform 
            helps you master both aspects, preparing you for the complete interview experience.
          </p>
        </div>
        
        {/* Company Logos */}
        <div className="relative">
          <DecorativeBlur position="inset" gradient="lime" size="lg" />
          <div className="relative rounded-2xl sm:rounded-3xl bg-zinc-800/50 p-4 sm:p-6 lg:p-8 backdrop-blur-sm ring-1 ring-zinc-700/50">
            <p className={`mb-6 sm:mb-8 text-center ${TYPOGRAPHY.body.small} font-medium text-zinc-400`}>
              Trusted by engineers at companies like:
            </p>
            <div className="grid grid-cols-4 gap-4 sm:gap-6 md:gap-8 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaMeta className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaAmazon className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaApple className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <SiNetflix className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaGoogle className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaMicrosoft className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <SiUber className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <SiTesla className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaTwitter className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaAirbnb className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <FaTiktok className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
              <div className="group flex items-center justify-center transition-all duration-300 hover:scale-110">
                <BsNvidia className="h-[32px] w-[32px] fill-zinc-400 transition-colors group-hover:fill-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
