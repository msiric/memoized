import { ReactNode } from 'react'

export type IconContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type IconContainerShape = 'circle' | 'rounded'
export type IconContainerVariant = 'lime' | 'indigo' | 'amber'
export type IconContainerStyle = 'gradient' | 'solid'

export interface IconContainerProps {
  children: ReactNode
  size?: IconContainerSize
  shape?: IconContainerShape
  variant?: IconContainerVariant
  style?: IconContainerStyle
  className?: string
}

const sizeClasses: Record<IconContainerSize, { container: string; icon: string }> = {
  xs: { container: 'h-6 w-6 sm:h-8 sm:w-8', icon: 'h-3 w-3 sm:h-4 sm:w-4' },
  sm: { container: 'h-8 w-8 sm:h-10 sm:w-10', icon: 'h-4 w-4 sm:h-5 sm:w-5' },
  md: { container: 'h-10 w-10 sm:h-14 sm:w-14', icon: 'h-5 w-5 sm:h-7 sm:w-7' },
  lg: { container: 'h-12 w-12 sm:h-16 sm:w-16', icon: 'h-6 w-6 sm:h-8 sm:w-8' },
  xl: { container: 'h-16 w-16 sm:h-20 sm:w-20', icon: 'h-8 w-8 sm:h-10 sm:w-10' },
}

const shapeClasses: Record<IconContainerShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-2xl',
}

const variantClasses: Record<IconContainerStyle, Record<IconContainerVariant, string>> = {
  gradient: {
    lime: 'bg-gradient-to-br from-lime-100 to-lime-50 dark:from-lime-900/30 dark:to-lime-900/10',
    indigo: 'bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-900/10',
    amber: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10',
  },
  solid: {
    lime: 'bg-lime-100 dark:bg-lime-900/30',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
    amber: 'bg-amber-100 dark:bg-amber-900/30',
  },
}

const iconColorClasses: Record<IconContainerVariant, string> = {
  lime: 'text-lime-600 dark:text-lime-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  amber: 'text-amber-600 dark:text-amber-400',
}

export const IconContainer = ({
  children,
  size = 'lg',
  shape = 'circle',
  variant = 'lime',
  style = 'gradient',
  className = '',
}: IconContainerProps) => {
  return (
    <div
      className={`flex items-center justify-center ${sizeClasses[size].container} ${shapeClasses[shape]} ${variantClasses[style][variant]} ${className}`}
    >
      <span className={`${sizeClasses[size].icon} ${iconColorClasses[variant]}`}>
        {children}
      </span>
    </div>
  )
}
