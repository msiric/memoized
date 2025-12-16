import {
  CARD,
  HOVER,
  SPACING,
  TRANSITION,
  TYPOGRAPHY,
} from '@/constants/designTokens'
import { ReactNode } from 'react'

export type FeatureCardVariant = 'lime' | 'indigo' | 'amber'

export interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  variant?: FeatureCardVariant
  className?: string
  href?: string
}

const variantClasses: Record<FeatureCardVariant, string> = {
  lime: CARD.featureLime,
  indigo: CARD.featureIndigo,
  amber: CARD.featureAmber,
}

const iconBgClasses: Record<FeatureCardVariant, string> = {
  lime: 'bg-lime-100 dark:bg-lime-900/30',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
  amber: 'bg-amber-100 dark:bg-amber-900/30',
}

const iconColorClasses: Record<FeatureCardVariant, string> = {
  lime: 'text-lime-600 dark:text-lime-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  amber: 'text-amber-600 dark:text-amber-400',
}

export const FeatureCard = ({
  icon,
  title,
  description,
  variant = 'lime',
  className = '',
  href,
}: FeatureCardProps) => {
  const content = (
    <>
      <div
        className={`${SPACING.margin.md} flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl ${iconBgClasses[variant]}`}
      >
        <span className={`h-5 w-5 sm:h-8 sm:w-8 ${iconColorClasses[variant]}`}>
          {icon}
        </span>
      </div>
      <h3 className={`${SPACING.headingMargin.h5} ${TYPOGRAPHY.heading.h5} ${TYPOGRAPHY.color.primary}`}>
        {title}
      </h3>
      <p className={`${TYPOGRAPHY.body.base} ${TYPOGRAPHY.color.secondary}`}>{description}</p>
    </>
  )

  const baseClasses = `${variantClasses[variant]} ${TRANSITION.standard} ${HOVER.scale.md} ${className}`

  if (href) {
    return (
      <a href={href} className={`group ${baseClasses}`}>
        {content}
      </a>
    )
  }

  return <div className={baseClasses}>{content}</div>
}
