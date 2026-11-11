'use client'

import clsx from 'clsx'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { focusRing, transitionCls } from '../primitives/tokens-v2'

/**
 * Buttons for the dock. Never `disabled` (focus must not drop, spec §5.1):
 * `aria-disabled` plus a click guard instead. Out of the tab order
 * (`tabIndex=-1`); the stepper offers every action from the keyboard.
 */

const base = clsx(
  'inline-flex h-11 shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border text-[14px] font-semibold leading-5',
  focusRing,
  transitionCls.feedback,
)

const variants = {
  secondary:
    'border-zinc-500 text-zinc-100 hover:bg-zinc-700/60 aria-disabled:cursor-default aria-disabled:border-zinc-700 aria-disabled:text-zinc-500 aria-disabled:hover:bg-transparent print:text-zinc-900',
  primary:
    'border-lime-400 bg-lime-400 text-zinc-950 hover:bg-lime-300 aria-disabled:cursor-default aria-disabled:border-zinc-700 aria-disabled:bg-zinc-800 aria-disabled:text-zinc-500',
  quiet:
    'border-transparent text-zinc-100 underline decoration-zinc-500 underline-offset-4 hover:decoration-zinc-100 aria-disabled:text-zinc-500',
} as const

export type DockButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: keyof typeof variants
  icon?: boolean
  unavailable?: boolean
  children: ReactNode
}

export const DockButton = forwardRef<HTMLButtonElement, DockButtonProps>(function DockButton(
  { variant = 'secondary', icon = false, unavailable = false, className, onClick, tabIndex = -1, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      tabIndex={tabIndex}
      aria-disabled={unavailable || undefined}
      onClick={(e) => {
        if (unavailable) return
        onClick?.(e)
      }}
      className={clsx(
        base,
        variants[variant],
        icon ? 'w-11 px-0' : !className?.includes('px-') && 'px-3 xs:px-4',
        className,
      )}
      {...rest}
    />
  )
})

const svg = { width: 20, height: 20, viewBox: '0 0 20 20', 'aria-hidden': true, fill: 'none' } as const
const strokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export const RestartIcon = () => (
  <svg {...svg}>
    <path {...strokeProps} d="M4.5 9.5a5.5 5.5 0 1 0 1.6-3.9M4.5 3.5v3h3" />
  </svg>
)
export const BackIcon = () => (
  <svg {...svg}>
    <path {...strokeProps} d="M12 5 7 10l5 5" />
  </svg>
)
export const NextIcon = () => (
  <svg {...svg}>
    <path {...strokeProps} d="m8 5 5 5-5 5" />
  </svg>
)
export const PlayIcon = () => (
  <svg {...svg}>
    <path d="M6.5 4.5v11l9-5.5z" fill="currentColor" />
  </svg>
)
export const PauseIcon = () => (
  <svg {...svg}>
    <path d="M6 4.5h2.5v11H6zM11.5 4.5H14v11h-2.5z" fill="currentColor" />
  </svg>
)
