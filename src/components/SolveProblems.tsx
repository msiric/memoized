import Image from 'next/image'
import { Badge } from './Badge'
import { GradientText } from './GradientText'
import { FeaturePoint } from './FeaturePoint'
import { DecorativeBlur } from './DecorativeBlur'
import { CheckCircleIcon, LightningIcon, ChartIcon, ClipboardCheckIcon } from './icons'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export const SolveProblems = () => {
  return (
    <section className={`relative ${SPACING.section.vertical}`}>
      <div className={`mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
        <div className="grid grid-cols-1 gap-8 sm:gap-12 md:grid-cols-2 md:items-center">
          {/* Enhanced Image Container */}
          <div className="relative md:order-2 mx-auto md:mx-0 max-w-xs sm:max-w-sm md:max-w-none w-full">
            <DecorativeBlur position="inset" gradient="lime-indigo" />
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/80 p-1.5 sm:p-2 backdrop-blur-sm ring-1 ring-zinc-900/5 dark:bg-zinc-900/50 dark:ring-white/10">
              <div
                className="relative w-full rounded-xl sm:rounded-2xl"
                style={{ aspectRatio: '1210 / 1250' }}
              >
                <Image
                  alt="Practice problems interface"
                  src="/images/covers/practice-problems.png"
                  className="absolute inset-0 h-full w-full rounded-xl sm:rounded-2xl object-contain"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
          </div>
          {/* Enhanced Content */}
          <div className="md:order-1">
            <Badge variant="indigo" icon={<CheckCircleIcon />} className={SPACING.margin.md}>
              450+ Problems
            </Badge>

            <h2 className={`${SPACING.headingMargin.h2} ${TYPOGRAPHY.heading.h2} ${TYPOGRAPHY.color.primary}`}>
              <GradientText>Solve Problems</GradientText> That Matter
            </h2>

            <p className={`${SPACING.descriptionMargin.large} ${TYPOGRAPHY.body.large} ${TYPOGRAPHY.color.secondary}`}>
              Access over 450 diverse practice problems and questions designed to prepare you for real interview scenarios.
            </p>

            {/* Feature Points */}
            <div className="space-y-4 sm:space-y-6">
              <FeaturePoint
                icon={<ClipboardCheckIcon />}
                title="Categorized by Topic"
                description="Each problem is categorized and aligned with lessons, ensuring targeted and effective practice."
                variant="lime"
              />

              <FeaturePoint
                icon={<LightningIcon />}
                title="Progressive Difficulty"
                description="Problems range from beginner to advanced levels, helping you build and strengthen skills progressively."
                variant="indigo"
              />

              <FeaturePoint
                icon={<ChartIcon />}
                title="Build Confidence"
                description="Regular practice reinforces concepts, improves problem-solving skills, and boosts interview confidence."
                variant="amber"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
