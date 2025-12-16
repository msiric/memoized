import { GRADIENT_TEXT } from '@/constants/designTokens'
import { ReactNode } from 'react'

export type GradientTextVariant = 'limeToIndigo' | 'indigoToLime' | 'amber'

export interface GradientTextProps {
  children: ReactNode
  variant?: GradientTextVariant
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p'
}

const variantClasses: Record<GradientTextVariant, string> = {
  limeToIndigo: GRADIENT_TEXT.limeToIndigo,
  indigoToLime: GRADIENT_TEXT.indigoToLime,
  amber: GRADIENT_TEXT.amberGradient,
}

export const GradientText = ({
  children,
  variant = 'limeToIndigo',
  className = '',
  as: Component = 'span',
}: GradientTextProps) => {
  return (
    <Component className={`${variantClasses[variant]} ${className}`}>
      {children}
    </Component>
  )
}
