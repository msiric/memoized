import { CONTAINER, SPACING } from '@/constants/designTokens'
import { ReactNode } from 'react'

export type SectionWidth = 'narrow' | 'medium' | 'wide'
export type SectionPadding = 'standard' | 'large'

export interface SectionContainerProps {
  children: ReactNode
  width?: SectionWidth
  padding?: SectionPadding
  className?: string
  background?: string
  id?: string
  ariaLabel?: string
}

const widthClasses: Record<SectionWidth, string> = {
  narrow: CONTAINER.narrowCentered,
  medium: CONTAINER.mediumCentered,
  wide: CONTAINER.wideCentered,
}

const paddingClasses: Record<SectionPadding, string> = {
  standard: SPACING.section.vertical,
  large: SPACING.section.verticalLarge,
}

export const SectionContainer = ({
  children,
  width = 'wide',
  padding = 'standard',
  className = '',
  background,
  id,
  ariaLabel,
}: SectionContainerProps) => {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={`${paddingClasses[padding]} ${background || ''} ${className}`}
    >
      <div className={`${widthClasses[width]} ${SPACING.section.horizontal}`}>
        {children}
      </div>
    </section>
  )
}
