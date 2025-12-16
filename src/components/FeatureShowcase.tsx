import { ReactNode } from 'react'
import { IconContainer, IconContainerSize, IconContainerVariant } from './IconContainer'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export interface FeatureShowcaseProps {
  icon: ReactNode
  title: string
  description: ReactNode
  variant?: IconContainerVariant
  iconSize?: IconContainerSize
  centered?: boolean
  className?: string
}

export const FeatureShowcase = ({
  icon,
  title,
  description,
  variant = 'lime',
  iconSize = 'lg',
  centered = true,
  className = '',
}: FeatureShowcaseProps) => {
  return (
    <div className={`flex flex-col ${centered ? 'items-center text-center' : ''} ${className}`}>
      <IconContainer
        variant={variant}
        size={iconSize}
        shape="circle"
        className={SPACING.margin.sm}
      >
        {icon}
      </IconContainer>
      <h3
        className={`${SPACING.headingMargin.h5} ${TYPOGRAPHY.heading.h5} ${TYPOGRAPHY.color.primary}`}
      >
        {title}
      </h3>
      <p className={`${TYPOGRAPHY.body.base} ${TYPOGRAPHY.color.secondary}`}>
        {description}
      </p>
    </div>
  )
}
