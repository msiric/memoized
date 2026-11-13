'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { HiArrowPath, HiPause, HiPlay } from 'react-icons/hi2'
import { ArrowIcon } from '@/components/Button'
import { cn } from './cn'
import { focusRing, radius, transitionCls, type as typeScale } from './tokens-v3'

/**
 * The visualization button (D2, D11, R4, R13). Colors are the platform
 * `Button` variants (`src/components/Button.tsx`), sized to a 44 px target:
 *
 * - `primary`: the platform `filled` variant (lime-500, hover lime-600).
 * - `secondary`: the platform `outline` variant (WS1 ruling 1: the platform
 *   `secondary` fill is too faint an edge on the frame surface). The only
 *   secondary style (R4).
 * - `text`: a muted text button (R4): zinc-400, the quiet action beside a
 *   question ("Skip"). Lime is for the current, chosen or traced thing (R1),
 *   so a text button never outranks the answers.
 *
 * States: hover only on devices that can hover (`can-hover:`), a press one
 * step past hover on every device (R13: white/5 then white/10; Next steps
 * its fill, lime-600 then lime-700), the keyboard focus ring, and
 * `unavailable`. Never `disabled`, so focus never drops (spec §5.1):
 * `aria-disabled` plus a click guard, drawn at the platform's `opacity-50`.
 * `waiting` is a control that will act in a moment (Next at a checkpoint,
 * R4): it renders as the outline variant, `aria-disabled`, without the
 * faded look.
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
  text: 'text-zinc-400 print:text-zinc-600',
}

/** Hover (hover-capable devices only) and press (every device), one step each (R13). */
const live: Record<ButtonVariant, string> = {
  primary: 'can-hover:bg-lime-600 press:bg-lime-700',
  secondary: cn(transitionCls.hover, transitionCls.press, 'can-hover:text-white press:text-white'),
  text: cn(transitionCls.hover, transitionCls.press, 'can-hover:text-zinc-200 press:text-zinc-200'),
}

const sizes: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { default: 'px-5', icon: 'w-11 px-0' },
  secondary: { default: 'px-4', icon: 'w-11 px-0' },
  text: { default: 'px-3', icon: 'w-11 px-0' },
}

export const UNAVAILABLE = 'cursor-not-allowed opacity-50'
/** A control that is about to act (R4): legible at rest, no hover or press, not faded. */
export const WAITING = 'cursor-default'

export function buttonClasses({
  variant = 'secondary',
  size = 'default',
  unavailable = false,
  waiting = false,
}: { variant?: ButtonVariant; size?: ButtonSize; unavailable?: boolean; waiting?: boolean } = {}): string {
  return cn(
    base,
    rest[variant],
    sizes[variant][size],
    unavailable ? UNAVAILABLE : waiting ? WAITING : live[variant],
  )
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  unavailable?: boolean
  /** `aria-disabled` and inert, drawn at rest without the faded look (R4). */
  waiting?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'default', unavailable = false, waiting = false, className, onClick, ...rest },
  ref,
) {
  const inert = unavailable || waiting
  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={inert || undefined}
      onClick={(e) => {
        if (inert) return
        onClick?.(e)
      }}
      className={cn(buttonClasses({ variant, size, unavailable, waiting }), className)}
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
