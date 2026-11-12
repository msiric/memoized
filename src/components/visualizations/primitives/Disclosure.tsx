import type { DetailsHTMLAttributes, ReactNode } from 'react'
import { HiChevronDown } from 'react-icons/hi2'
import { cn } from './cn'
import { focusRing, ink, radius, transitionCls, type as typeScale } from './tokens-v3'

/**
 * Disclosure for the text alternative ("Steps as text", "Diagram as text").
 * The platform "Expand" pattern (`src/components/ProblemCard/index.tsx:205-215`):
 * `text-xs font-medium`, a 16 px heroicons chevron that turns 180 degrees
 * over 200 ms (instant under reduced motion). Muted, as a tertiary control
 * (drift T07): zinc-400, zinc-200 on hover. Never amber: amber means output
 * (D4). A native `<details>`, so it works without JavaScript and in print.
 * The summary keeps a 44 px target.
 */

export type DisclosureProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> & {
  summary: ReactNode
  children: ReactNode
  /** Extra attributes for the summary (e.g. `data-viz-focus`). */
  summaryProps?: Record<string, string | undefined>
}

export function Disclosure({ summary, children, summaryProps, className, ...rest }: DisclosureProps) {
  return (
    <details className={cn('group', className)} {...rest}>
      <summary
        {...summaryProps}
        className={cn(
          'flex h-11 w-max cursor-pointer list-none items-center gap-1.5 pr-2 [&::-webkit-details-marker]:hidden',
          radius.row.cls,
          typeScale.disclosure.cls,
          ink.muted,
          'can-hover:text-zinc-200 active:text-zinc-200',
          transitionCls.press,
          focusRing,
          transitionCls.feedback,
        )}
      >
        <HiChevronDown aria-hidden className={cn('h-4 w-4 shrink-0 group-open:rotate-180', transitionCls.disclosure)} />
        {summary}
      </summary>
      {children}
    </details>
  )
}

/** Body of a text alternative: P: ProblemCard/index.tsx:224 (`text-sm leading-6`, zinc-300). */
export const disclosureBodyCls = cn('pb-2 pt-1', typeScale.body.cls, ink.secondary)
