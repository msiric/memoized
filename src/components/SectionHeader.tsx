import { ReactNode } from 'react'
import { Badge, BadgeVariant } from './Badge'
import { GradientText } from './GradientText'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export interface SectionHeaderProps {
  badge?: {
    text: string
    icon?: ReactNode
    variant?: BadgeVariant
    animated?: boolean
  }
  heading: string
  gradientText?: string
  description?: ReactNode
  centered?: boolean
  headingLevel?: 'h1' | 'h2' | 'h3'
  className?: string
}

export const SectionHeader = ({
  badge,
  heading,
  gradientText,
  description,
  centered = true,
  headingLevel = 'h2',
  className = '',
}: SectionHeaderProps) => {
  const HeadingTag = headingLevel

  const headingClass =
    headingLevel === 'h1'
      ? TYPOGRAPHY.heading.h1
      : headingLevel === 'h2'
        ? TYPOGRAPHY.heading.h2
        : TYPOGRAPHY.heading.h3

  const headingMarginClass =
    headingLevel === 'h1'
      ? SPACING.headingMargin.h1
      : headingLevel === 'h2'
        ? SPACING.headingMargin.h2
        : SPACING.headingMargin.h3

  return (
    <div className={`${centered ? 'text-center' : ''} ${className}`}>
      {badge && (
        <Badge
          variant={badge.variant || 'lime'}
          icon={badge.icon}
          animated={badge.animated}
          className={SPACING.margin.lg}
        >
          {badge.text}
        </Badge>
      )}

      <HeadingTag
        className={`${headingMarginClass} ${headingClass} ${TYPOGRAPHY.color.primary}`}
      >
        {heading} {gradientText && <GradientText>{gradientText}</GradientText>}
      </HeadingTag>

      {description && (
        <div
          className={`${SPACING.descriptionMargin.large} ${centered ? 'mx-auto max-w-3xl' : ''} ${TYPOGRAPHY.body.large} ${TYPOGRAPHY.color.secondary}`}
        >
          {description}
        </div>
      )}
    </div>
  )
}
