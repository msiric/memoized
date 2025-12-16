import { BACKGROUND, SPACING, TYPOGRAPHY } from '@/constants/designTokens'
import { IconContainer } from './IconContainer'

export interface PathCardProps {
  variant: 'lime' | 'indigo' | 'amber'
  icon: React.ReactNode
  title: string
  description: React.ReactNode
}

const variantStyles = {
  lime: {
    background: BACKGROUND.gradient.limeToWhite,
    textColor: 'text-lime-900 dark:text-lime-100',
    descriptionColor: 'text-lime-800 dark:text-lime-300',
  },
  indigo: {
    background: BACKGROUND.gradient.indigoToWhite,
    textColor: 'text-indigo-900 dark:text-indigo-100',
    descriptionColor: 'text-indigo-800 dark:text-indigo-300',
  },
  amber: {
    background: BACKGROUND.gradient.amberToWhite,
    textColor: 'text-amber-900 dark:text-amber-100',
    descriptionColor: 'text-amber-800 dark:text-amber-300',
  },
}

export const PathCard = ({ variant, icon, title, description }: PathCardProps) => {
  const styles = variantStyles[variant]

  return (
    <div className={`rounded-xl sm:rounded-2xl ${styles.background} p-4 sm:p-6`}>
      <IconContainer
        variant={variant}
        size="sm"
        shape="circle"
        className={SPACING.margin.sm}
      >
        {icon}
      </IconContainer>
      <h3 className={`${SPACING.headingMargin.h5} ${TYPOGRAPHY.heading.h5} ${styles.textColor}`}>
        {title}
      </h3>
      <p className={`${TYPOGRAPHY.body.small} ${styles.descriptionColor}`}>
        {description}
      </p>
    </div>
  )
}
