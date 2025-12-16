import { ReactNode } from 'react'
import { IconContainer, IconContainerVariant } from './IconContainer'
import { SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export interface FeaturePointProps {
  icon: ReactNode
  title: string
  description: string
  variant?: IconContainerVariant
  className?: string
}

export const FeaturePoint = ({
  icon,
  title,
  description,
  variant = 'lime',
  className = '',
}: FeaturePointProps) => {
  return (
    <div className={`flex items-start gap-3 sm:gap-4 ${className}`}>
      <IconContainer size="sm" shape="rounded" variant={variant} style="solid" className="mt-0.5 sm:mt-1 flex-shrink-0">
        {icon}
      </IconContainer>
      <div>
        <h3 className={`${SPACING.headingMargin.h5} ${TYPOGRAPHY.heading.h5} ${TYPOGRAPHY.color.primary}`}>
          {title}
        </h3>
        <p className={`${TYPOGRAPHY.body.base} ${TYPOGRAPHY.color.secondary}`}>{description}</p>
      </div>
    </div>
  )
}
