'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { HiArrowPath, HiPause, HiPlay } from 'react-icons/hi2'
import { ArrowIcon } from '@/components/Button'
import { cn } from './cn'
import { focusRing, radius, transitionCls, type as typeScale } from './tokens-v3'

/**
 * The visualization button (D2, D11). Colors are the platform `Button`
 * variants (`src/components/Button.tsx`), sized to a 44 px target:
 *
 * - `primary`: the platform `filled` variant (lime-500, hover lime-600).
 * - `secondary`: the platform `outline` variant (WS1 ruling 1: the platform
 *   `secondary` fill is too faint an edge on the frame surface).
 * - `text`: the platform `text` variant (lime-400, hover lime-500).
 *
 * States: hover only on devices that can hover (`can-hover:`), a press step
 * on every device (the hover color plus 0.98 brightness, 150 ms), the
 * keyboard focus ring, and `unavailable`. Never `disabled`, so focus never
 * drops (spec §5.1): `aria-disabled` plus a click guard, drawn at the
 * platform's `opacity-50`.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'text'
export type ButtonSize = 'default' | 'icon'

const base = cn(
  'inline-flex h-11 shrink-0 select-none items-center justify-center gap-1 whitespace-nowrap',
  radius.control.cls,
  typeScale.control.cls,
  focusRing,
  transitionCls.feedback,
)

/** Rest colors per variant. P: Button.tsx:22-27 (dark values). */
const rest: Record<ButtonVariant, string> = {
  primary: 'bg-lime-500 text-zinc-900 print:bg-lime-700 print:text-white',
  secondary: 'text-zinc-400 ring-1 ring-inset ring-white/10 print:text-zinc-700 print:ring-zinc-300',
  text: 'text-lime-400 print:text-lime-700',
}

/** Hover (hover-capable devices only) and press (every device). */
const live: Record<ButtonVariant, string> = {
  primary: cn('can-hover:bg-lime-600 active:bg-lime-600', transitionCls.press),
  secondary: cn('can-hover:bg-white/5 can-hover:text-white active:bg-white/5 active:text-white', transitionCls.press),
  text: cn('can-hover:text-lime-500 active:text-lime-500', transitionCls.press),
}

const sizes: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { default: 'px-5', icon: 'w-11 px-0' },
  secondary: { default: 'px-4', icon: 'w-11 px-0' },
  text: { default: 'px-2', icon: 'w-11 px-0' },
}

export const UNAVAILABLE = 'cursor-not-allowed opacity-50'

export function buttonClasses({
  variant = 'secondary',
  size = 'default',
  unavailable = false,
}: { variant?: ButtonVariant; size?: ButtonSize; unavailable?: boolean } = {}): string {
  return cn(base, rest[variant], sizes[variant][size], unavailable ? UNAVAILABLE : live[variant])
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  unavailable?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'default', unavailable = false, className, onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={unavailable || undefined}
      onClick={(e) => {
        if (unavailable) return
        onClick?.(e)
      }}
      className={cn(buttonClasses({ variant, size, unavailable }), className)}
      {...rest}
    />
  )
})

// ---------------------------------------------------------------------------
// Icons: the platform arrow (Button.tsx) for Back / Next, heroicons v2
// outline (stroke 1.5, P: designTokens.ts:223-229) for the rest. 20 px.
// ---------------------------------------------------------------------------

const ICON = 'h-5 w-5 shrink-0'

export const BackIcon = () => <ArrowIcon aria-hidden className={cn(ICON, '-ml-1 rotate-180')} />
export const NextIcon = () => <ArrowIcon aria-hidden className={cn(ICON, '-mr-1')} />
export const RestartIcon = () => <HiArrowPath aria-hidden className={ICON} />
export const PlayIcon = () => <HiPlay aria-hidden className={ICON} />
export const PauseIcon = () => <HiPause aria-hidden className={ICON} />
