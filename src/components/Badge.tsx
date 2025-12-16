import { BADGE, ICON_SIZE } from '@/constants/designTokens'
import { ReactNode } from 'react'

export type BadgeVariant = 'lime' | 'indigo' | 'amber' | 'limeSolid'

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  icon?: ReactNode
  animated?: boolean
  className?: string
}

export const Badge = ({
  children,
  variant = 'lime',
  icon,
  animated = false,
  className = '',
}: BadgeProps) => {
  return (
    <div className={`${BADGE.base} ${BADGE.variant[variant]} ${className}`}>
      {animated && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-500"></span>
        </span>
      )}
      {icon && <span className={ICON_SIZE.xs}>{icon}</span>}
      {children}
    </div>
  )
}
