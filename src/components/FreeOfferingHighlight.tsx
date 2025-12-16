import { Badge } from './Badge'
import { GradientText } from './GradientText'
import { IconContainer } from './IconContainer'
import { DecorativeBlur } from './DecorativeBlur'
import { CheckCircleIcon, BookIcon, FlaskIcon, GlobeIcon } from './icons'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export const FreeOfferingHighlight = () => {
  return (
    <section className={`relative ${SPACING.section.vertical}`}>
      <div className={`mx-auto max-w-7xl ${SPACING.section.horizontal}`}>
              <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-lime-50 via-white to-indigo-50 ${SPACING.content.padding} shadow-xl ring-1 ring-lime-900/10 dark:from-lime-950/20 dark:via-zinc-900 dark:to-indigo-950/20 dark:ring-lime-500/20`}>
                {/* Background decoration */}
                <DecorativeBlur position="top-right" gradient="lime-indigo" size="lg" />
                <DecorativeBlur position="bottom-left" gradient="indigo-lime" size="md" />

                <div className="relative text-center">
                  {/* Free badge */}
                  <Badge variant="indigo" icon={<GlobeIcon />} className={SPACING.margin.md}>
                    100% Accessible
                  </Badge>

                  {/* Main message */}
                  <h2 className={`${SPACING.headingMargin.h2} ${TYPOGRAPHY.heading.h2} ${TYPOGRAPHY.color.primary}`}>
                    <GradientText>480+ problems</GradientText> are free to solve
                  </h2>

                  <p className={`mx-auto ${SPACING.descriptionMargin.large} max-w-2xl ${TYPOGRAPHY.body.large} ${TYPOGRAPHY.color.secondary}`}>
                    Every coding problem, first section of every course and all
                    related resources. No credit card required, no hidden costs.
                    Just start learning today.
                  </p>

                  {/* Feature highlights */}
                  <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="flex flex-col items-center">
                      <IconContainer size="md" shape="circle" variant="lime" style="solid" className="mb-3">
                        <CheckCircleIcon />
                      </IconContainer>
                      <h3 className={`${SPACING.headingMargin.h5} font-semibold ${TYPOGRAPHY.color.primary}`}>
                        All Problems Free
                      </h3>
                      <p className={`text-sm ${TYPOGRAPHY.color.secondary}`}>
                        480+ coding challenges accessible to everyone
                      </p>
                    </div>

                    <div className="flex flex-col items-center">
                      <IconContainer size="md" shape="circle" variant="indigo" style="solid" className="mb-3">
                        <BookIcon />
                      </IconContainer>
                      <h3 className={`${SPACING.headingMargin.h5} font-semibold ${TYPOGRAPHY.color.primary}`}>
                        Free Course Sections
                      </h3>
                      <p className={`text-sm ${TYPOGRAPHY.color.secondary}`}>
                        First section of every course, no sign-up needed
                      </p>
                    </div>

                    <div className="flex flex-col items-center">
                      <IconContainer size="md" shape="circle" variant="amber" style="solid" className="mb-3">
                        <FlaskIcon />
                      </IconContainer>
                      <h3 className={`${SPACING.headingMargin.h5} font-semibold ${TYPOGRAPHY.color.primary}`}>
                        Free Resources
                      </h3>
                      <p className={`text-sm ${TYPOGRAPHY.color.secondary}`}>
                        Learning materials, guides and references included
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    </section>
  )
}
