export type DecorativeBlurPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'inset'

export type DecorativeBlurGradient =
  | 'lime-indigo'
  | 'indigo-lime'
  | 'zinc'
  | 'lime'
  | 'indigo'

export type DecorativeBlurSize = 'sm' | 'md' | 'lg'

export interface DecorativeBlurProps {
  position?: DecorativeBlurPosition
  gradient?: DecorativeBlurGradient
  size?: DecorativeBlurSize
  className?: string
}

const positionClasses: Record<DecorativeBlurPosition, string> = {
  'top-right': 'absolute -right-8 -top-8',
  'top-left': 'absolute -left-8 -top-8',
  'bottom-right': 'absolute -right-8 -bottom-8',
  'bottom-left': 'absolute -left-8 -bottom-8',
  inset: 'absolute -inset-4',
}

const sizeClasses: Record<DecorativeBlurSize, string> = {
  sm: 'h-24 w-24',
  md: 'h-32 w-32',
  lg: 'h-48 w-48',
}

const gradientClasses: Record<DecorativeBlurGradient, string> = {
  'lime-indigo': 'bg-gradient-to-br from-lime-300/20 to-indigo-300/20 dark:from-lime-400/20 dark:to-indigo-400/20',
  'indigo-lime': 'bg-gradient-to-br from-indigo-300/20 to-lime-300/20 dark:from-indigo-400/20 dark:to-lime-400/20',
  zinc: 'bg-gradient-to-br from-zinc-400/20 to-zinc-600/20 dark:from-zinc-500/20 dark:to-zinc-700/20',
  lime: 'bg-gradient-to-br from-lime-100/50 to-lime-50/50 dark:from-lime-900/20 dark:to-lime-800/20',
  indigo: 'bg-gradient-to-br from-indigo-100/50 to-indigo-50/50 dark:from-indigo-900/20 dark:to-indigo-800/20',
}

export const DecorativeBlur = ({
  position = 'top-right',
  gradient = 'lime-indigo',
  size = 'md',
  className = '',
}: DecorativeBlurProps) => {
  const sizeClass = position === 'inset' ? '' : sizeClasses[size]
  const shapeClass = position === 'inset' ? 'rounded-3xl' : 'rounded-full'

  return (
    <div
      className={`${positionClasses[position]} ${sizeClass} ${shapeClass} ${gradientClasses[gradient]} blur-2xl ${className}`}
      aria-hidden="true"
    />
  )
}
