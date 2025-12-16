import { CARD, TYPOGRAPHY } from '@/constants/designTokens'
import { ReactNode } from 'react'

export type StatCardVariant = 'lime' | 'indigo' | 'amber'

export interface StatCardProps {
  value: string | number
  label: string
  variant?: StatCardVariant
  className?: string
  icon?: ReactNode
}

const variantClasses: Record<StatCardVariant, string> = {
  lime: CARD.statLime,
  indigo: CARD.statIndigo,
  amber: CARD.statAmber,
}

const valueColorClasses: Record<StatCardVariant, string> = {
  lime: 'text-lime-600 dark:text-lime-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  amber: 'text-amber-600 dark:text-amber-400',
}

export const StatCard = ({
  value,
  label,
  variant = 'lime',
  className = '',
  icon,
}: StatCardProps) => {
  return (
    <div className={`${variantClasses[variant]} text-center flex flex-col justify-center h-full ${className}`}>
      {icon && <div className="mb-1 sm:mb-2 flex justify-center">{icon}</div>}
      <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${valueColorClasses[variant]}`}>
        {value}
      </div>
      <div className={`min-h-[2.5rem] sm:min-h-[1.5rem] flex items-center justify-center text-xs sm:text-sm lg:text-base leading-tight ${TYPOGRAPHY.color.secondary}`}>{label}</div>
    </div>
  )
}
