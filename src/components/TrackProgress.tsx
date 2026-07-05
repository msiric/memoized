import { APP_NAME } from '@/constants'
import Image from 'next/image'
import { Badge } from './Badge'
import { GradientText } from './GradientText'
import { FeaturePoint } from './FeaturePoint'
import { DecorativeBlur } from './DecorativeBlur'
import { ChartIcon, CheckCircleIcon, FireIcon, ClockIcon } from './icons'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export const TrackProgress = () => {
  return (
    <section className={`relative ${SPACING.section.vertical}`}>
      <div className={`mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
        <div className="grid grid-cols-1 gap-8 sm:gap-12 md:grid-cols-2 md:items-center">
          {/* Enhanced Image Container */}
          <div className="relative md:order-1 mx-auto md:mx-0 max-w-xs sm:max-w-sm md:max-w-none w-full">
            <DecorativeBlur position="inset" gradient="indigo-lime" />
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/80 p-1.5 sm:p-2 backdrop-blur-sm ring-1 ring-zinc-900/5 dark:bg-zinc-900/50 dark:ring-white/10">
              <div
                className="relative w-full rounded-xl sm:rounded-2xl"
                style={{ aspectRatio: '1302 / 1696' }}
              >
                <Image
                  alt="Progress tracking dashboard"
                  src="/images/covers/user-progress.png"
                  className="absolute inset-0 h-full w-full rounded-xl sm:rounded-2xl object-contain"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
          </div>
          {/* Enhanced Content */}
          <div className="md:order-2">
            <Badge variant="lime" icon={<ChartIcon />} className={SPACING.margin.md}>
              Progress Tracking
            </Badge>

            <h2 className={`${SPACING.headingMargin.h2} ${TYPOGRAPHY.heading.h2} ${TYPOGRAPHY.color.primary}`}>
              <GradientText>Track Your Progress</GradientText> Visually
            </h2>

            <p className={`${SPACING.descriptionMargin.large} ${TYPOGRAPHY.body.large} ${TYPOGRAPHY.color.secondary}`}>
              {APP_NAME} shows your completion progress as you work through lessons and solve problems.
            </p>

            {/* Feature Points */}
            <div className="space-y-4 sm:space-y-6">
              <FeaturePoint
                icon={<CheckCircleIcon />}
                title="Completion Tracking"
                description="See what you've completed and identify areas to focus on at a glance."
                variant="lime"
              />

              <FeaturePoint
                icon={<FireIcon />}
                title="Learning Journey"
                description="Stay motivated by visualizing your learning journey and achieving your goals more efficiently."
                variant="indigo"
              />

              <FeaturePoint
                icon={<ClockIcon />}
                title="Continuously Refined"
                description="The platform is actively maintained and improved to keep your interview preparation sharp and relevant."
                variant="amber"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
