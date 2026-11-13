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
 * - `primary`: the platform `primary` variant (P: Button.tsx:20), the one
 *   lessons use for their own main action (PageNavigation's Next): a
 *   lime-400/10 tint, a lime-400/20 ring and a lime-400 label; hover
 *   lime-500/10 with lime-300; press one step on (lime-400/20). H3 R2 Q12:
 *   the `filled` slab repeated on every step was louder than any platform
 *   call to action.
 * - `secondary`: the platform `outline` variant (WS1 ruling 1: the platform
 *   `secondary` fill is too faint an edge on the frame surface). The only
 *   secondary style (R4).
 * - `text`: a muted text button (R4): zinc-400, the quiet action beside a
 *   question ("Skip"). Lime is for the current, chosen or traced thing (R1),
 *   so a text button never outranks the answers.
 *
 * States: hover only on devices that can hover (`can-hover:`), a press one
 * step past hover on every device (R13: white/5 then white/10; Next steps
 * its fill to lime-600, then dims it to 0.9 on press), the keyboard focus ring, and
 * `unavailable`. Never `disabled`, so focus never drops (spec §5.1):
 * `aria-disabled` plus a click guard, drawn at the platform's `opacity-50`.
 * H3 R2 Q2: a control that cannot act always looks unavailable (no dead
 * control looks live). `inert` draws a control as unavailable but still
 * hands its click to the caller, for a press that redirects (Next while a
 * question is open moves focus to the answers).
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
  primary:
    'bg-lime-400/10 text-lime-400 ring-1 ring-inset ring-lime-400/20 print:bg-transparent print:text-lime-700 print:ring-lime-700',
  secondary: 'text-zinc-400 ring-1 ring-inset ring-white/10 print:text-zinc-700 print:ring-zinc-300',
  text: 'text-zinc-400 print:text-zinc-600',
}

/** Hover (hover-capable devices only) and press (every device), one step each (R13). */
const live: Record<ButtonVariant, string> = {
  // P: Button.tsx:20 (hover lime-500/10, lime-300 label and ring); press one step on.
  primary:
    'can-hover:bg-lime-500/10 can-hover:text-lime-300 can-hover:ring-lime-300 press:bg-lime-400/20 press:text-lime-300 press:ring-lime-300',
  secondary: cn(transitionCls.hover, transitionCls.press, 'can-hover:text-white press:text-white'),
  text: cn(transitionCls.hover, transitionCls.press, 'can-hover:text-zinc-200 press:text-zinc-200'),
}

const sizes: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { default: 'px-4', icon: 'w-11 px-0' },
  secondary: { default: 'px-4', icon: 'w-11 px-0' },
  text: { default: 'px-3', icon: 'w-11 px-0' },
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
  /**
   * Drawn and announced as unavailable, but the click still reaches
   * `onClick` (a press that redirects, Q2). Without it an unavailable
   * control ignores clicks.
   */
  redirects?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'default', unavailable = false, redirects = false, className, onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={unavailable || undefined}
      onClick={(e) => {
        if (unavailable && !redirects) return
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
